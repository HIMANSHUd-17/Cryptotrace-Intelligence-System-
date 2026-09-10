import time
from db.session import SessionLocal
from services.graph_service import GraphService

db = SessionLocal()
service = GraphService()
tx_id = "230425980"

print("--- Multi-Hop Subgraph Traversal Benchmark ---")

# 2-hop benchmark
t0 = time.perf_counter()
res_2hop = service.get_subgraph(tx_id, max_hops=2, db_session=db)
t1 = time.perf_counter()
time_2hop = (t1 - t0) * 1000  # in ms
print(f"2-Hop Traversal:")
print(f"  - Nodes count: {len(res_2hop['nodes'])}")
print(f"  - Edges count: {len(res_2hop['edges'])}")
print(f"  - Execution time: {time_2hop:.2f} ms ({t1-t0:.5f}s)")
print(f"  - Sample payload node: {res_2hop['nodes'][0] if res_2hop['nodes'] else None}")
print(f"  - Sample payload edge: {res_2hop['edges'][0] if res_2hop['edges'] else None}")

print("\n----------------------------------------------\n")

# 3-hop benchmark
t0 = time.perf_counter()
res_3hop = service.get_subgraph(tx_id, max_hops=3, db_session=db)
t1 = time.perf_counter()
time_3hop = (t1 - t0) * 1000  # in ms
print(f"3-Hop Traversal:")
print(f"  - Nodes count: {len(res_3hop['nodes'])}")
print(f"  - Edges count: {len(res_3hop['edges'])}")
print(f"  - Execution time: {time_3hop:.2f} ms ({t1-t0:.5f}s)")

db.close()
