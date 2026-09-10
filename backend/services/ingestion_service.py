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
            
        # Map common dataset columns to our expected schema
        column_mapping = {
            "transaction_id": "txid",
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
        inserted = 0
        ignored = 0
        processed_txids = []
        for r in records:
            # We don't have a unique constraint on network events in models.py right now, 
            # so we just insert.
            event = NetworkEvent(
                src_ip=str(r.get("src_ip", "")),
                dst_ip=str(r.get("dst_ip", "")),
                port=int(r.get("port", 0)) if r.get("port") else None,
                txid=str(r.get("txid", "")),
                geo_asn=str(r.get("geo_asn", ""))
            )
            self.db.add(event)
            inserted += 1
            if event.txid and event.txid not in processed_txids:
                processed_txids.append(event.txid)
            
        self.db.commit()
        return {"status": "success", "type": "network", "records_inserted": inserted, "duplicates_ignored": ignored, "processed_txids": processed_txids}

    def store_blockchain_events(self, records):
        inserted = 0
        ignored = 0
        processed_txids = []
        for r in records:
            txid_val = str(r.get("txid", ""))
            if not txid_val:
                continue
                
            # Check for duplicate txid as per our model's unique constraint
            exists = self.db.query(BlockchainEvent.id).filter_by(txid=txid_val).first()
            if exists:
                ignored += 1
                continue
                
            event = BlockchainEvent(
                txid=txid_val,
                amount=float(r.get("amount", 0.0)) if r.get("amount") else 0.0,
                fee=float(r.get("fee", 0.0)) if r.get("fee") else 0.0,
                # Convert list to JSON string or fallback to string cast
                input_wallets=json.dumps(r.get("input_wallets", [])) if isinstance(r.get("input_wallets"), list) else str(r.get("input_wallets", "")),
                output_wallets=json.dumps(r.get("output_wallets", [])) if isinstance(r.get("output_wallets"), list) else str(r.get("output_wallets", ""))
            )
            self.db.add(event)
            inserted += 1
            if event.txid and event.txid not in processed_txids:
                processed_txids.append(event.txid)
            
        self.db.commit()
        return {"status": "success", "type": "blockchain", "records_inserted": inserted, "duplicates_ignored": ignored, "processed_txids": processed_txids}
