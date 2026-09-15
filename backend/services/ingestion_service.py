import pandas as pd
import json
import xml.etree.ElementTree as ET
from io import BytesIO
from db.models import NetworkEvent, BlockchainEvent

from sqlalchemy import text

class IngestionService:
    def __init__(self, db_session):
        self.db = db_session

    def process_file_stream(self, file_stream, filename: str, data_type: str):
        total_inserted = 0
        if filename.endswith(".csv"):
            for chunk in pd.read_csv(file_stream, chunksize=20000):
                total_inserted += self._handle_chunk(chunk, data_type)
        elif filename.endswith(".json"):
            df = pd.read_json(file_stream)
            total_inserted += self._handle_chunk(df, data_type)
        elif filename.endswith(".xml"):
            tree = ET.parse(file_stream)
            data = [child.attrib for child in tree.getroot()]
            total_inserted += self._handle_chunk(pd.DataFrame(data), data_type)
        else:
            raise ValueError("Unsupported file format. Please upload CSV, JSON, or XML.")
            
        return {"status": "success", "type": data_type, "records_inserted": total_inserted}

    def _handle_chunk(self, df, data_type):
        df.columns = [str(c).lower().strip() for c in df.columns]
        
        column_mapping = {
            "transaction_id": "txid", "tx_id": "txid", "address": "txid",
            "transaction_amount_btc": "amount", "network_fee_btc": "fee",
            "source_ip": "src_ip", "destination_ip": "dst_ip",
        }
        df = df.rename(columns=column_mapping)
        
        if "txid" in df.columns:
            df = df.dropna(subset=["txid"])
            
        if data_type == "network":
            return self.store_network_events(df).get("records_inserted", 0)
        elif data_type == "blockchain":
            return self.store_blockchain_events(df).get("records_inserted", 0)
        else:
            raise ValueError("data_type must be 'network' or 'blockchain'")

    def store_network_events(self, df):
        df = df.drop_duplicates(subset=["txid"])
        
        df["port"] = df.get("port", pd.Series(dtype=float)).fillna(0).astype(int)
        df["src_ip"] = df.get("src_ip", pd.Series(dtype=str)).fillna("").astype(str)
        df["dst_ip"] = df.get("dst_ip", pd.Series(dtype=str)).fillna("").astype(str)
        df["geo_asn"] = df.get("geo_asn", pd.Series(dtype=str)).fillna("").astype(str)
        
        records = df.to_dict(orient="records")
        
        stmt = text("""
            INSERT OR IGNORE INTO network_events (txid, src_ip, dst_ip, port, geo_asn)
            VALUES (:txid, :src_ip, :dst_ip, :port, :geo_asn)
        """)
        self.db.execute(stmt, records)
        self.db.commit()
            
        return {"status": "success", "type": "network", "records_inserted": len(records), "processed_txids": []}

    def store_blockchain_events(self, df):
        df = df.drop_duplicates(subset=["txid"])
        
        df["amount"] = df.get("amount", pd.Series(dtype=float)).fillna(0.0)
        df["fee"] = df.get("fee", pd.Series(dtype=float)).fillna(0.0)
        df["input_wallets"] = df.get("input_wallets", pd.Series(dtype=str)).fillna("").astype(str)
        df["output_wallets"] = df.get("output_wallets", pd.Series(dtype=str)).fillna("").astype(str)
        
        records = df.to_dict(orient="records")
        
        stmt = text("""
            INSERT OR IGNORE INTO blockchain_events (txid, amount, fee, input_wallets, output_wallets)
            VALUES (:txid, :amount, :fee, :input_wallets, :output_wallets)
        """)
        self.db.execute(stmt, records)
        self.db.commit()
            
        return {"status": "success", "type": "blockchain", "records_inserted": len(records), "processed_txids": []}
