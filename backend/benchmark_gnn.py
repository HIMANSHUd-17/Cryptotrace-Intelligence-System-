import time
from db.session import SessionLocal
from main import GNN_SERVICE

db = SessionLocal()
illicit_tx_id = "232625460"

print("--- PyTorch Geometric GNN End-to-End Inference Benchmark ---")

# 1. Measure full predict pipeline
t0 = time.perf_counter()
res = GNN_SERVICE.predict(illicit_tx_id, db=db, max_hops=2)
t1 = time.perf_counter()

total_ms = (t1 - t0) * 1000

print(f"Target Illicit Tx ID: {res['tx_id']}")
print(f"Target Node Index: {res['target_node_index']}")
print(f"GNN Illicit Probability Score: {res['illicit_score']} / 100.0")
print(f"Subgraph Nodes Count: {len(res['subgraph']['nodes'])}")
print(f"Subgraph Edges Count: {len(res['subgraph']['edges'])}")
print(f"End-to-End Pipeline Execution Time: {total_ms:.2f} ms ({t1-t0:.5f}s)")

db.close()
