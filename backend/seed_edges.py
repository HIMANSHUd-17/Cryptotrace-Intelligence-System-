import os
import csv
import time
from db.session import engine, SessionLocal, Base
from db.models import TransactionEdge

def seed_edges():
    print("Ensuring table structure exists...")
    Base.metadata.create_all(bind=engine)
    
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "elliptic_bitcoin_dataset", "elliptic_txs_edgelist.csv")
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    db = SessionLocal()
    existing_count = db.query(TransactionEdge).count()
    if existing_count > 0:
        print(f"TransactionEdge table already contains {existing_count} records. Skipping seed.")
        db.close()
        return

    print("Seeding TransactionEdge table from CSV...")
    t0 = time.perf_counter()
    batch = []
    batch_size = 25000
    total_inserted = 0

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader) # Skip txId1,txId2
        for row in reader:
            if len(row) >= 2:
                batch.append({"source_tx": row[0].strip(), "target_tx": row[1].strip()})
                if len(batch) >= batch_size:
                    db.bulk_insert_mappings(TransactionEdge, batch)
                    db.commit()
                    total_inserted += len(batch)
                    print(f"Inserted {total_inserted} transaction edges...")
                    batch = []

        if batch:
            db.bulk_insert_mappings(TransactionEdge, batch)
            db.commit()
            total_inserted += len(batch)
            print(f"Inserted {total_inserted} transaction edges...")

    t1 = time.perf_counter()
    print(f"Completed seeding {total_inserted} edges in {t1-t0:.2f}s.")
    db.close()

if __name__ == "__main__":
    seed_edges()
