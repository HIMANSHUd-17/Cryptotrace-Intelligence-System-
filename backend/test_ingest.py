import requests
import json
import os

# Create dummy network CSV
csv_content = """src_ip,dst_ip,port,txid,geo_asn
192.168.1.1,10.0.0.1,443,tx_123,ASN_1
192.168.1.2,10.0.0.2,80,tx_124,ASN_2
192.168.1.3,10.0.0.3,8080,,ASN_3
"""
with open("test_network.csv", "w") as f:
    f.write(csv_content)

# Create dummy blockchain JSON
json_content = [
    {"txid": "tx_123", "amount": 1.5, "fee": 0.01, "input_wallets": ["w1"], "output_wallets": ["w2"]},
    {"txid": "tx_125", "amount": 2.0, "fee": 0.02, "input_wallets": ["w3"], "output_wallets": ["w4"]},
    {"amount": 3.0} # Missing txid
]
with open("test_blockchain.json", "w") as f:
    json.dump(json_content, f)

# Test Network CSV Upload
print("Testing Network CSV Ingestion...")
with open("test_network.csv", "rb") as f:
    res = requests.post("http://localhost:8000/api/ingest", files={"file": ("test_network.csv", f, "text/csv")}, data={"data_type": "network"})
    print("Response:", res.json())

# Test Blockchain JSON Upload
print("\nTesting Blockchain JSON Ingestion...")
with open("test_blockchain.json", "rb") as f:
    res = requests.post("http://localhost:8000/api/ingest", files={"file": ("test_blockchain.json", f, "application/json")}, data={"data_type": "blockchain"})
    print("Response:", res.json())

# Cleanup
os.remove("test_network.csv")
os.remove("test_blockchain.json")
