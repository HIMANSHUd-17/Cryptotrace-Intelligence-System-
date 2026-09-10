import json
import time
from db.session import SessionLocal
from main import ENSEMBLE_SERVICE

db = SessionLocal()

# Test target transaction ID with multi-hop connected sub-graph
target_tx_id = "230425980"

print(f"=== Unified Threat Scoring & Dual Explainability Validation ===")
print(f"Target Transaction ID: {target_tx_id}\n")

t0 = time.perf_counter()
res = ENSEMBLE_SERVICE.analyze_entity(target_tx_id, db=db)
t1 = time.perf_counter()

print(json.dumps(res, indent=2))

print(f"\nExecution Latency: {(t1-t0)*1000:.2f} ms ({(t1-t0):.5f}s)")

db.close()
