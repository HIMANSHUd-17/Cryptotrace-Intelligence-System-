from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.data_loader import DataLoader
from services.predictor import Predictor
from services.predictor_heist import HeistPredictor

app = FastAPI(title="CryptoTrace ML Engine")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA = DataLoader()
DATA.load()

PREDICTOR = Predictor("model.pkl")
PREDICTOR_HEIST = HeistPredictor("ransomware_model.pkl")

print("Initializing Real-Time SHAP Attributions for Top Entities...")
for alert in DATA.ranked_alerts:
    feat_array = DATA.get_features(alert['id'])
    if feat_array is not None:
        score, shap_feats = PREDICTOR.predict(feat_array)
        alert['score'] = max(50, int(score))
        if shap_feats and len(shap_feats) > 0:
            alert['features'] = shap_feats

@app.get("/api/stats")
def get_stats():
    return DATA.stats

@app.get("/api/alerts")
def get_alerts():
    return DATA.ranked_alerts

@app.get("/api/entity/{tx_id}")
def get_entity(tx_id: str):
    detail = DATA.get_entity_detail(tx_id)
    return detail if detail else {}

@app.get("/api/graph/{tx_id}")
def get_graph(tx_id: str):
    if tx_id.lower() == "global":
        return DATA.get_global_graph()
    return DATA.get_subgraph(tx_id)

@app.post("/api/investigate")
def investigate(tx_id: str):
    # 1. Pipeline Check: Elliptic Transaction Network
    feat_array = DATA.get_features(tx_id)
    if feat_array is not None:
        score, top_reasons = PREDICTOR.predict(feat_array)
        return {
            "tx_id": tx_id,
            "risk_score": score,
            "type": "TX",
            "top_reasons": top_reasons
        }
        
    # 2. Pipeline Check: Bitcoin Heist Ransomware Addresses
    heist_array = DATA.get_heist_features(tx_id)
    if heist_array is not None:
        score, top_reasons = PREDICTOR_HEIST.predict(heist_array)
        return {
            "tx_id": tx_id,
            "risk_score": score,
            "type": "Address",
            "top_reasons": top_reasons
        }
        
    return {"error": "Entity not found in any dataset."}
