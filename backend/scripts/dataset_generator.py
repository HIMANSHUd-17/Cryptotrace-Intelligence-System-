import random
import uuid
import datetime
from sqlalchemy import text
from db.models import NetworkEvent, BlockchainEvent

class SyntheticGenerator:
    def __init__(self, db_session):
        self.db = db_session
        
    def generate_and_inject(self, num_normal=3000, num_illicit=50):
        # 1. Clear database completely
        self.db.query(NetworkEvent).delete()
        self.db.query(BlockchainEvent).delete()
        self.db.commit()
        
        txs = []
        nets = []
        
        start_time = datetime.datetime.utcnow() - datetime.timedelta(days=30)
        
        # 2. Forge Normal Topologies
        for _ in range(num_normal):
            txid = uuid.uuid4().hex
            amount = random.uniform(0.01, 2.5)
            fee = amount * random.uniform(0.001, 0.05)
            t = start_time + datetime.timedelta(minutes=random.randint(1, 40000))
            
            in_w = [f"wallet_{random.randint(100, 999)}" for _ in range(random.randint(1, 2))]
            out_w = [f"wallet_{random.randint(100, 999)}" for _ in range(random.randint(1, 3))]
            
            txs.append({"txid": txid, "amount": amount, "fee": fee, "input_wallets": str(in_w), "output_wallets": str(out_w), "timestamp": t})
            
            # 30% chance to have a network event
            if random.random() < 0.3:
                net_tx = txid
                ip = f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
                nets.append({"txid": net_tx, "src_ip": ip, "dst_ip": "10.0.0.1", "port": random.choice([80, 443, 8333]), "geo_asn": "Unknown"})
                
        # 3. Forge High-Risk Illicit Mixing Service topologies
        mixing_ips = ["192.168.1.100 (Tor Exit)", "10.5.5.5 (Known Malicious ASN)"]
        for _ in range(num_illicit):
            txid = uuid.uuid4().hex
            amount = random.uniform(50.0, 500.0)
            fee = random.uniform(0.5, 2.0)
            t = start_time + datetime.timedelta(minutes=random.randint(1, 40000))
            
            # Massive input/output counts emulate coin-join logic precisely
            in_w = [f"mixer_{random.randint(10, 90)}" for _ in range(random.randint(10, 30))]
            out_w = [f"mixer_{random.randint(10, 90)}" for _ in range(random.randint(15, 35))]
            
            txs.append({"txid": txid, "amount": amount, "fee": fee, "input_wallets": str(in_w), "output_wallets": str(out_w), "timestamp": t})
            nets.append({"txid": txid, "src_ip": random.choice(mixing_ips), "dst_ip": "10.0.0.1", "port": 9050, "geo_asn": "Darknet ASN"})

        # Extract vectors for bulk DB inject
        stmt_bc = text("""
            INSERT OR IGNORE INTO blockchain_events (txid, amount, fee, input_wallets, output_wallets, timestamp)
            VALUES (:txid, :amount, :fee, :input_wallets, :output_wallets, :timestamp)
        """)
        self.db.execute(stmt_bc, txs)
        
        stmt_net = text("""
            INSERT OR IGNORE INTO network_events (txid, src_ip, dst_ip, port, geo_asn)
            VALUES (:txid, :src_ip, :dst_ip, :port, :geo_asn)
        """)
        self.db.execute(stmt_net, nets)
        self.db.commit()
        
        return len(txs), len(nets)

def verify_ml_offline(detector, X_test, y_test):
    # Isolated unit tester 
    predictions = detector.model.predict(X_test)
    predictions = [1 if p == -1 else 0 for p in predictions] # -1 is anomaly
    
    tp = sum(1 for p, y in zip(predictions, y_test) if p == 1 and y == 1)
    fp = sum(1 for p, y in zip(predictions, y_test) if p == 1 and y == 0)
    tn = sum(1 for p, y in zip(predictions, y_test) if p == 0 and y == 0)
    fn = sum(1 for p, y in zip(predictions, y_test) if p == 0 and y == 1)
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    accuracy = (tp + tn) / len(y_test) if y_test else 0
    
    return {"precision": precision, "recall": recall, "accuracy": accuracy, "flagged": tp+fp}
