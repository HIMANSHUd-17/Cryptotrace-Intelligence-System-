import os
import json
import time
import pandas as pd
from db.session import engine, Base, SessionLocal
from db.models import EllipticFeature, HeistFeature

def seed():
    print("Ensuring tables exist...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    
    data_dir = "../data/elliptic_bitcoin_dataset"
    features_csv = os.path.join(data_dir, "elliptic_txs_features.csv")
    heist_csv = os.path.join(data_dir, "../bitcoin_heist/BitcoinHeistData.csv")

    # 1. Check existing count in EllipticFeature
    existing_elliptic = db.query(EllipticFeature).count()
    if existing_elliptic > 0:
        print(f"EllipticFeature table already seeded with {existing_elliptic} rows.")
    else:
        if os.path.exists(features_csv):
            print(f"Seeding Elliptic features from {features_csv}...")
            t0 = time.perf_counter()
            # Read CSV in chunks for efficiency
            chunksize = 25000
            total_inserted = 0
            for chunk in pd.read_csv(features_csv, header=None, chunksize=chunksize):
                # Column 0 is txId. Columns 1:167 are time_step + f_1..f_165
                tx_ids = chunk[0].astype(str).values
                feats = chunk.iloc[:, 1:].values  # numpy array shape (N, 166)
                
                records = []
                for tx_id, feat_vec in zip(tx_ids, feats):
                    records.append({
                        "tx_id": tx_id,
                        "features": json.dumps(feat_vec.tolist())
                    })
                
                db.bulk_insert_mappings(EllipticFeature, records)
                db.commit()
                total_inserted += len(records)
                print(f"Inserted {total_inserted} Elliptic records...")
            t1 = time.perf_counter()
            print(f"Elliptic feature seeding complete in {t1-t0:.2f} seconds ({total_inserted} rows).")
        else:
            print(f"Warning: {features_csv} not found.")

    # 2. Check existing count in HeistFeature
    existing_heist = db.query(HeistFeature).count()
    if existing_heist > 0:
        print(f"HeistFeature table already seeded with {existing_heist} rows.")
    else:
        if os.path.exists(heist_csv):
            print(f"Seeding Heist features from {heist_csv}...")
            t0 = time.perf_counter()
            # Deduplicate by address keeping first
            heist_df = pd.read_csv(heist_csv)
            heist_df = heist_df.drop_duplicates(subset=["address"])
            
            feature_cols = ["year", "day", "length", "weight", "count", "looped", "neighbors", "income"]
            addresses = heist_df["address"].astype(str).values
            feats = heist_df[feature_cols].values
            
            chunksize = 25000
            total_inserted = 0
            for i in range(0, len(heist_df), chunksize):
                addr_chunk = addresses[i:i+chunksize]
                feats_chunk = feats[i:i+chunksize]
                records = []
                for addr, feat_vec in zip(addr_chunk, feats_chunk):
                    records.append({
                        "address": addr,
                        "features": json.dumps(feat_vec.tolist())
                    })
                db.bulk_insert_mappings(HeistFeature, records)
                db.commit()
                total_inserted += len(records)
                print(f"Inserted {total_inserted} Heist records...")
            t1 = time.perf_counter()
            print(f"Heist feature seeding complete in {t1-t0:.2f} seconds ({total_inserted} rows).")
        else:
            print(f"Warning: {heist_csv} not found.")

    db.close()

if __name__ == "__main__":
    seed()
