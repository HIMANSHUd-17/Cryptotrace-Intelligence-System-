import time
from db.session import SessionLocal
from main import investigate

db = SessionLocal()

# Test 1: Elliptic Tx ID
t0 = time.perf_counter()
res1 = investigate("230425880", db=db)
t1 = time.perf_counter()
print(f"Elliptic Tx Investigation Time: {t1-t0:.4f}s")
print("Response:", res1)

# Test 2: Heist Address
t0 = time.perf_counter()
res2 = investigate("11212231", db=db)
t1 = time.perf_counter()
print(f"Heist Address Investigation Time: {t1-t0:.4f}s")
print("Response:", res2)

# Test 3: Non-existent ID
res3 = investigate("non_existent_id_999999", db=db)
print("Non-existent ID Response:", res3)

db.close()
