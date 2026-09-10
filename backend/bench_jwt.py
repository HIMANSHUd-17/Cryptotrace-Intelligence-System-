import subprocess
import time

with open("temp_token.txt", "r") as f:
    token = f.read().strip()

print(f"Token length: {len(token)}")

for i in range(3):
    start = time.perf_counter()
    res = subprocess.run(["curl.exe", "-w", "%{time_total}", "-H", f"Authorization: Bearer {token}", "-so", "NUL", "http://localhost:8000/api/alerts"], capture_output=True, text=True)
    end = time.perf_counter()
    print(f"RUN {i+1} TIME (from curl): {res.stdout.strip()}s (Python wrapped time: {end-start:.3f}s)")
