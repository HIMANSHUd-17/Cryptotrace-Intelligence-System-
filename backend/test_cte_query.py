import time
from sqlalchemy import text
from db.session import SessionLocal

db = SessionLocal()
tx_id = "230425980"

sql = text("""
WITH RECURSIVE graph_cte(source, target, depth) AS (
    SELECT source_tx AS source, target_tx AS target, 1 AS depth
    FROM transaction_edges
    WHERE source_tx = :tx_id OR target_tx = :tx_id

    UNION

    SELECT e.source_tx AS source, e.target_tx AS target, c.depth + 1 AS depth
    FROM transaction_edges e
    JOIN graph_cte c ON (e.source_tx = c.target OR e.target_tx = c.target OR e.source_tx = c.source)
    WHERE c.depth < :max_hops
)
SELECT DISTINCT source, target FROM graph_cte;
""")

for hops in [1, 2, 3]:
    t0 = time.perf_counter()
    results = db.execute(sql, {"tx_id": tx_id, "max_hops": hops}).fetchall()
    t1 = time.perf_counter()
    print(f"Hops: {hops} | Edges Found: {len(results)} | Execution Time: {t1-t0:.4f}s")

db.close()
