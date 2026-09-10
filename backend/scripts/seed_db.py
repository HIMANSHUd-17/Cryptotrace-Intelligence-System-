import os
import json
import pandas as pd
from sqlalchemy import text
import sys

# Ensure we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.database import engine
from database.models import Base

def seed_db():
    print("Creating DB tables...")
    Base.metadata.create_all(bind=engine)
    
    # Check rows to be idempotent
    with engine.connect() as conn:
        res = conn.execute(text("SELECT count(*) FROM transactions;")).scalar()
        if res and res > 0:
            print(f"Database already seeded with {res} transactions. Skipping.")
            return

    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data", "elliptic_bitcoin_dataset")
    
    # Ensure they exist
    if not os.path.exists(f"{data_dir}/elliptic_txs_classes.csv"):
        print(f"Error: Dataset not found at {data_dir}")
        return

    try:
        print("Loading classes CSV...")
        classes = pd.read_csv(f"{data_dir}/elliptic_txs_classes.csv")
        
        print("Loading edges CSV...")
        edges = pd.read_csv(f"{data_dir}/elliptic_txs_edgelist.csv")
        
        print("Loading features CSV (huge)...")
        features = pd.read_csv(f"{data_dir}/elliptic_txs_features.csv", header=None)
        features.columns = ["tx_id", "time_step"] + [f"f_{i}" for i in range(1, 166)]
        
        print("Merging and processing transactions...")
        classes = classes.rename(columns={"txId": "tx_id", "class": "class_label"})
        df = features.merge(classes, on="tx_id", how="left")
        
        # We need to extract the features into a JSON array column
        feature_cols = [f"f_{i}" for i in range(1, 166)]
        
        print("Converting features to JSON structure (this may take a moment)...")
        df['features'] = df[feature_cols].apply(lambda row: json.dumps([x for x in row]), axis=1)
        
        # Drop the original feature columns
        df = df.drop(columns=feature_cols)
        
        print("Writing transactions to SQLite...")
        # Since tx_id is mapped as String in SQLAlchemy mapped classes
        df['tx_id'] = df['tx_id'].astype(str)
        df['class_label'] = df['class_label'].astype(str)
        
        # bulk insert with smaller chunksize to avoid SQLite parameter limits
        df.to_sql('transactions', con=engine, if_exists='append', index=False, chunksize=1000, method='multi')
        
        print("Processing edges...")
        edges = edges.rename(columns={"txId1": "source_tx_id", "txId2": "target_tx_id"})
        edges['source_tx_id'] = edges['source_tx_id'].astype(str)
        edges['target_tx_id'] = edges['target_tx_id'].astype(str)
        
        print("Writing edges to SQLite...")
        edges.to_sql('edges', con=engine, if_exists='append', index=False, chunksize=1000, method='multi')
        
        print("✅ Database successfully seeded!")
        
    except Exception as e:
        print(f"Error seeding database:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    seed_db()
