import time

t0 = time.perf_counter()
import main
t1 = time.perf_counter()

print(f"Backend Startup Import Time: {t1 - t0:.4f} seconds")
