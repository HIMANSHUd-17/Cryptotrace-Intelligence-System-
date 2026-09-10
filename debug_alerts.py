import sys
import os
import traceback

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.db.session import SessionLocal
from backend.db import models
from backend.services.correlation_service import CorrelationService
from backend.main import ANOMALY_DETECTOR

def test():
    db = SessionLocal()
    recent_txs = db.query(models.BlockchainEvent).order_by(models.BlockchainEvent.timestamp.desc()).limit(5).all()
    service = CorrelationService(db, detector=ANOMALY_DETECTOR)
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
