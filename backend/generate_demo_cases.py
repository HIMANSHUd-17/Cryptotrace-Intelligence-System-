import json
from db.session import SessionLocal
from main import ENSEMBLE_SERVICE, create_forensic_report

db = SessionLocal()

print("=========================================================")
print("   CRYPTO-TRACE GOLDEN DEMO SUITE & CHEAT-SHEET          ")
print("=========================================================\n")

# Deterministic demo candidates
tx_benign_id = "100000185"
tx_laundering_id = "230425980"
tx_critical_id = "232625460"

benign_case = ENSEMBLE_SERVICE.analyze_entity(tx_benign_id, db=db)
laundering_case = ENSEMBLE_SERVICE.analyze_entity(tx_laundering_id, db=db)
critical_case = ENSEMBLE_SERVICE.analyze_entity(tx_critical_id, db=db)

def print_case_details(title, case_dict):
    print(f"---------------------------------------------------------")
    print(f" DEMO CASE: {title}")
    print(f"---------------------------------------------------------")
    print(f" • Transaction ID : {case_dict.get('tx_id')}")
    print(f" • Composite Score: {case_dict.get('composite_score')} / 100.0 (Severity: {case_dict.get('alert_level')})")
    print(f" • Tabular Score  : {case_dict.get('tabular_score')} / 100.0")
    print(f" • GNN Risk Score : {case_dict.get('gnn_score')} / 100.0")
    print(f" • Subgraph Size  : {len(case_dict.get('subgraph', {}).get('nodes', []))} Nodes | {len(case_dict.get('subgraph', {}).get('edges', []))} Edges")
    print(f" • Risk Drivers   : {len(case_dict.get('topological_drivers', []))} Topological Drivers")
    shaps = case_dict.get("shap_explanations", [])
    if shaps:
        top_shap_str = ", ".join([f"{s['name']}:{s['value']}" for s in shaps[:3]])
        print(f" • Top SHAP Feats : {top_shap_str}")
    print()

print_case_details("1. LOW-RISK BENIGN TRANSACTION (tx_benign)", benign_case)
print_case_details("2. GRAPH LAUNDERING SCHEME (tx_laundering)", laundering_case)
print_case_details("3. CRITICAL ILLICIT ENTITY (tx_critical)", critical_case)

# PDF Report Verification for tx_critical
print(f"Generating PDF Forensic Report for tx_critical ({tx_critical_id})...")
pdf_buffer = create_forensic_report(tx_critical_id, db=db, ensemble_service=ENSEMBLE_SERVICE)

if pdf_buffer:
    pdf_size = len(pdf_buffer.getvalue())
    print(f"[SUCCESS] Forensic PDF compiled seamlessly ({pdf_size} bytes).")
else:
    print("[ERROR] PDF generation failed.")

db.close()
