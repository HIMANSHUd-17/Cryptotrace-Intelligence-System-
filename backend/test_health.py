import json
from db.session import SessionLocal
from main import health_check

db = SessionLocal()

print("=== Demo Health Check Verification ===")
health_response = health_check(db=db)
print(json.dumps(health_response, indent=2))

db.close()
