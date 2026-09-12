import pandas as pd
import json
import xml.etree.ElementTree as ET
from io import BytesIO
from db.models import NetworkEvent, BlockchainEvent

class IngestionService:
    def __init__(self, db_session):
        self.db = db_session

    def process_file(self, file_bytes: bytes, filename: str, data_type: str):
        if filename.endswith(".csv"):
            df = pd.read_csv(BytesIO(file_bytes))
        elif filename.endswith(".json"):
            df = pd.read_json(BytesIO(file_bytes))
        elif filename.endswith(".xml"):
            # Simple xml to dataframe parser for MVP
            tree = ET.parse(BytesIO(file_bytes))
            root = tree.getroot()
            data = []
            for child in root:
                data.append(child.attrib)
            df = pd.DataFrame(data)
        else:
            raise ValueError("Unsupported file format. Please upload CSV, JSON, or XML.")
            
        # Standardize columns to lowercase stripped strings to prevent silent drops
        df.columns = [str(c).lower().strip() for c in df.columns]
        
        column_mapping = {
            "transaction_id": "txid",
            "tx_id": "txid",
            "address": "txid",
            "transaction_amount_btc": "amount",
            "network_fee_btc": "fee",
            "source_ip": "src_ip",
            "destination_ip": "dst_ip",
        }
        df = df.rename(columns=column_mapping)
        
        # Clean data (drop rows missing critical txid correlation key)
        if "txid" in df.columns:
            df = df.dropna(subset=["txid"])
            
        records = df.to_dict(orient="records")
        
        if data_type == "network":
            return self.store_network_events(records)
        elif data_type == "blockchain":
            return self.store_blockchain_events(records)
        else:
            raise ValueError("data_type must be 'network' or 'blockchain'")

    def store_network_events(self, records):
        new_records = []
        processed_txids = []
        
        for r in records:
            txid = str(r.get("txid", ""))
            new_records.append({
                "src_ip": str(r.get("src_ip", "")),
                "dst_ip": str(r.get("dst_ip", "")),
                "port": int(r.get("port", 0)) if r.get("port") else None,
                "txid": txid,
                "geo_asn": str(r.get("geo_asn", ""))
            })
            if txid and txid not in processed_txids:
                processed_txids.append(txid)
                
        if new_records:
            self.db.bulk_insert_mappings(NetworkEvent, new_records)
            self.db.commit()
            
        return {"status": "success", "type": "network", "records_inserted": len(new_records), "duplicates_ignored": 0, "processed_txids": processed_txids}

    def store_blockchain_events(self, records):
        txids = list(set([str(r.get("txid", "")) for r in records if r.get("txid")]))
        existing_txids = set()
        
        # Pull existing records in chunks to bypass SQLite 999 variable limits
        for i in range(0, len(txids), 900):
            chunk = txids[i:i+900]
            existing = self.db.query(BlockchainEvent.txid).filter(BlockchainEvent.txid.in_(chunk)).all()
            existing_txids.update([row[0] for row in existing])

        new_records = []
        ignored = 0
        processed_txids = []
        
        for r in records:
            txid_val = str(r.get("txid", ""))
            if not txid_val or txid_val in existing_txids:
                ignored += 1
                continue
                
            new_records.append({
                "txid": txid_val,
                "amount": float(r.get("amount", 0.0)) if r.get("amount") else 0.0,
                "fee": float(r.get("fee", 0.0)) if r.get("fee") else 0.0,
                "input_wallets": json.dumps(r.get("input_wallets", [])) if isinstance(r.get("input_wallets"), list) else str(r.get("input_wallets", "")),
                "output_wallets": json.dumps(r.get("output_wallets", [])) if isinstance(r.get("output_wallets"), list) else str(r.get("output_wallets", ""))
            })
            existing_txids.add(txid_val) # Deduplicate live within the same file array
            
            if txid_val not in processed_txids:
                processed_txids.append(txid_val)
                
        if new_records:
            self.db.bulk_insert_mappings(BlockchainEvent, new_records)
            self.db.commit()
            
        return {"status": "success", "type": "blockchain", "records_inserted": len(new_records), "duplicates_ignored": ignored, "processed_txids": processed_txids}
