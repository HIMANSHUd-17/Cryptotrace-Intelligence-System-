from db.session import SessionLocal
from db import models
from services.correlation_service import CorrelationService
from services.anomaly_detector import AnomalyDetector
import traceback

def test():
    db = SessionLocal()
    recent_txs = db.query(models.BlockchainEvent).order_by(models.BlockchainEvent.timestamp.desc()).limit(50).all()
    
    detector = AnomalyDetector()
    detector.fit(db)
    
    service = CorrelationService(db, detector=detector)
    print(f"Found {len(recent_txs)} recent txs.")
    for tx in recent_txs:
        print(f"Testing tx: {tx.txid}")
        try:
            alert = service.get_correlated_entity(tx.txid)
            print("Success")
        except Exception as e:
            traceback.print_exc()

if __name__ == "__main__":
    test()
