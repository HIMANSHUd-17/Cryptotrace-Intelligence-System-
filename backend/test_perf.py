import time
import requests

def test_perf():
    start = time.time()
    try:
        r = requests.get('http://localhost:8000/api/alerts')
        r.raise_for_status()
        duration = time.time() - start
        print(f"Request took {duration:.3f} seconds. Parsed {len(r.json())} alerts.")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == '__main__':
    test_perf()
