import json
import random
import datetime
from db.session import SessionLocal, engine
from db.models import Base, BlockchainEvent, NetworkEvent, TransactionEdge, EllipticFeature

def seed_data():
    db = SessionLocal()
    try:
        # 1. Fetch top transaction IDs from BlockchainEvent
        bc_events = db.query(BlockchainEvent).limit(50).all()
        if not bc_events:
            print("No BlockchainEvents found. Initializing sample events...")
            for i in range(1, 21):
                txid = f"23042598{i}"
                event = BlockchainEvent(
                    txid=txid,
                    timestamp=datetime.datetime.utcnow(),
                    input_wallets=json.dumps([f"1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa{i}"]),
                    output_wallets=json.dumps([f"3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy{i}"]),
                    amount=round(random.uniform(0.5, 25.0), 4),
                    fee=0.0001
                )
                db.add(event)
            db.commit()
            bc_events = db.query(BlockchainEvent).limit(50).all()

        txids = [e.txid for e in bc_events]
        print(f"Loaded {len(txids)} transaction records.")

        # 2. Synthetic IP Addresses (20 distinct IPs)
        synthetic_ips = [
            "185.220.101.5", "198.51.100.14", "203.0.113.88", "194.26.29.112",
            "45.154.255.87", "185.220.102.8", "109.70.100.24", "193.218.118.163",
            "185.220.101.32", "91.219.236.198", "185.220.101.7", "194.165.16.89",
            "45.141.215.114", "185.220.101.12", "185.220.100.242", "198.96.155.3",
            "171.25.193.9", "185.220.101.19", "185.220.101.40", "195.176.3.19"
        ]

        existing_net_count = db.query(NetworkEvent).count()
        if existing_net_count < 20:
            print("Seeding NetworkEvents with synthetic IPs...")
            for i, ip in enumerate(synthetic_ips):
                txid = txids[i % len(txids)]
                net = NetworkEvent(
                    timestamp=datetime.datetime.utcnow() - datetime.timedelta(minutes=i*15),
                    src_ip=ip,
                    dst_ip=f"10.0.0.{i+1}",
                    port=8333,
                    txid=txid,
                    geo_asn=f"AS{1000+i} (Synthetic Host)"
                )
                db.add(net)
            db.commit()
            print("Added 20 synthetic NetworkEvents.")

        # 3. Synthetic Bitcoin Wallets (20 distinct addresses)
        synthetic_wallets = [
            "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            "1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX",
            "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
            "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97",
            "1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ",
            "3D2oetdNuZUqQHPkmvhfgcgWmfwFuXxWvV",
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wl1",
            "1FeexV6bAHb8ybZjqQMjJrcCrHGW9sb6uF",
            "3Kzh9qAqVWQhEsfQz7zEQL1EuVQ55gjL23",
            "bc1q0sg9avwfccpv8g9lwhggn6i8w0g3x76fh6vssw",
            "1L26a35oR9P6Wf3g12E4Y8UjP7L9w11N4",
            "3N1a7mK8Z6P3y7B2w4X5Y9Q1V2R3T4S5U",
            "bc1q5v8u3g7w9z1x2c3v4b5n6m7l8k9j0h",
            "1M84x1o9P2w3E4Y5U6I7O8P9Q1W2E3R4T",
            "3B98t1WpEZ73CNmQviecrnyiWrnqRhWNLz",
            "bc1q8c9v0b1n2m3l4k5j6h7g8f9d0s1a2p",
            "1N78a9S0d1F2g3H4j5K6l7M8n9O0p1Q2R",
            "3C45x6y7z8A9b0C1d2E3f4G5h6I7j8K9L"
        ]

        # Update input/output wallets on BlockchainEvents
        print("Linking synthetic wallets to BlockchainEvents...")
        for i, event in enumerate(bc_events):
            w1 = synthetic_wallets[i % len(synthetic_wallets)]
            w2 = synthetic_wallets[(i + 5) % len(synthetic_wallets)]
            w3 = synthetic_wallets[(i + 10) % len(synthetic_wallets)]

            event.input_wallets = json.dumps([w1, w2])
            event.output_wallets = json.dumps([w3])
        db.commit()
        print("Updated BlockchainEvents with 20 synthetic Bitcoin Wallets.")

        # 4. Synthetic Transaction Edges for multi-hop graph traversal
        existing_edges = db.query(TransactionEdge).count()
        if existing_edges < 30:
            print("Seeding TransactionEdges...")
            for i in range(len(txids) - 1):
                edge = TransactionEdge(
                    source_tx=txids[i],
                    target_tx=txids[i+1]
                )
                db.add(edge)
            db.commit()
            print("Added synthetic TransactionEdges.")

        print("Synthetic Data Seeding Completed Successfully!")

    except Exception as e:
        print(f"Error seeding synthetic data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
