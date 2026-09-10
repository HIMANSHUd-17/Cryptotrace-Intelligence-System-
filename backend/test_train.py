import requests
import json
import os

# Create dummy blockchain JSON with 6 records to trigger training
json_content = [
    {"txid": "tx_201", "amount": 1.5, "fee": 0.01, "input_wallets": ["w1"], "output_wallets": ["w2"]},
    {"txid": "tx_202", "amount": 2.0, "fee": 0.02, "input_wallets": ["w3"], "output_wallets": ["w4"]},
    {"txid": "tx_203", "amount": 0.5, "fee": 0.01, "input_wallets": ["w5"], "output_wallets": ["w6"]},
    {"txid": "tx_204", "amount": 10.0, "fee": 0.50, "input_wallets": ["w7", "w8", "w9"], "output_wallets": ["w10"]},
    {"txid": "tx_205", "amount": 100.0, "fee": 5.0, "input_wallets": ["w11"], "output_wallets": ["w12"]},
    {"txid": "tx_206", "amount": 0.1, "fee": 0.001, "input_wallets": ["w13"], "output_wallets": ["w14"]}
]

with open("test_train.json", "w") as f:
    json.dump(json_content, f)

# Ingest the 6 records
with open("test_train.json", "rb") as f:
    res = requests.post("http://localhost:8000/api/ingest", files={"file": ("test_train.json", f, "application/json")}, data={"data_type": "blockchain"})
    print("Ingest Response:", res.json())

# Query the most anomalous one (tx_205 - 100 BTC)
# Wait, the model trains ON STARTUP, so ingesting now won't train it unless we restart or hit a manual train endpoint.
# Actually, since it trains on startup, I will just print this logic and then we must restart the server.
