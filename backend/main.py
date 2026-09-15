from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import Response, JSONResponse
import orjson
import json
import time
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from services.auth import get_current_user, get_current_user_optional
from services.predictor import Predictor
from services.predictor_heist import HeistPredictor
from services.ingestion_service import IngestionService
from services.graph_service import GraphService
from services.anomaly_detector import AnomalyDetector
from services.gnn_service import GNNService
from services.ensemble_service import EnsembleService
from services.pdf_generator import create_forensic_report

app = FastAPI(title="CryptoTrace ML Engine")

from db.session import engine, Base, get_db
from db import models

# Create database tables
Base.metadata.create_all(bind=engine)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    if request.url.path == "/api/alerts":
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        with open("server_time.log", "a") as f:
            f.write(f"MIDDLEWARE TOTAL SERVER TIME: {process_time:.4f}s\n")
        return response
    return await call_next(request)


PREDICTOR = Predictor("model.pkl")
PREDICTOR_HEIST = HeistPredictor("ransomware_model.pkl")
GNN_SERVICE = GNNService()
ENSEMBLE_SERVICE = EnsembleService(PREDICTOR, PREDICTOR_HEIST, GNN_SERVICE)

print("Initializing Anomaly Detector...")
ANOMALY_DETECTOR = AnomalyDetector()
with Session(engine) as db_session:
    ANOMALY_DETECTOR.fit(db_session)

print("Initializing Real-Time SHAP Attributions for Top Entities...")
with Session(engine) as db_session:
    recent_txs = db_session.query(models.BlockchainEvent).order_by(models.BlockchainEvent.timestamp.desc()).limit(50).all()
    for tx in recent_txs:
        tx_id = tx.txid
        elliptic_row = db_session.query(models.EllipticFeature).filter(models.EllipticFeature.tx_id == tx_id).first()
        if elliptic_row:
            feat_array = json.loads(elliptic_row.features)
            PREDICTOR.predict(feat_array)
        else:
            heist_row = db_session.query(models.HeistFeature).filter(models.HeistFeature.address == tx_id).first()
            if heist_row:
                heist_array = json.loads(heist_row.features)
                PREDICTOR_HEIST.predict(heist_array)



def retrain_ml_background():
    with Session(engine) as db_session:
        print("Dataset Ingested. Asynchronously retraining ML engine to prevent stale fallback scores...")
        ANOMALY_DETECTOR.fit(db_session)

@app.post("/api/ingest")
async def ingest_data(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    data_type: str = Form(...),
    mode: str = Form("append"),
    db: Session = Depends(get_db)
):
    try:
        # Full dynamic wipe sequence if requested by frontend
        if mode == "wipe":
            print("WIPE MODE ENABLED: Purging existing datasets...")
            db.query(models.NetworkEvent).delete()
            db.query(models.BlockchainEvent).delete()
            db.query(models.TransactionEdge).delete()
            db.query(models.EllipticFeature).delete()
            db.query(models.HeistFeature).delete()
            db.commit()

        service = IngestionService(db)
        result = service.process_file_stream(file.file, file.filename, data_type)
        
        # Clean up the large array before returning response
        if "processed_txids" in result:
            del result["processed_txids"]
            
        background_tasks.add_task(retrain_ml_background)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

from scripts.dataset_generator import SyntheticGenerator

@app.post("/api/generate_dataset")
def generate_dataset(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        generator = SyntheticGenerator(db)
        tx_count, net_count = generator.generate_and_inject(num_normal=80, num_illicit=5)
        background_tasks.add_task(retrain_ml_background)
        return {"status": "success", "message": f"Generated {tx_count} synthetic transactions and {net_count} network nodes."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/clear_data")
def clear_data(db: Session = Depends(get_db)):
    try:
        db.query(models.NetworkEvent).delete()
        db.query(models.BlockchainEvent).delete()
        db.query(models.TransactionEdge).delete()
        db.query(models.EllipticFeature).delete()
        db.query(models.HeistFeature).delete()
        db.commit()
        return {"status": "success", "message": "All ingested data has been permanently wiped from the analytical system."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    tx_count = db.query(models.BlockchainEvent).count()
    net_count = db.query(models.NetworkEvent).count()
    
    # We could theoretically query Neo4j for nodes and edges, but for MVP we use SQL counts
    # Approximate graph links based on transactions + network events + inputs/outputs
    return {
        "totalScanned": tx_count + net_count,
        "illicit": 0, # Placeholder until we persist ML tags to DB
        "licit": tx_count,
        "unknown": net_count,
        "edges": (tx_count * 2) + net_count
    }

from services.correlation_service import CorrelationService

@app.get("/api/alerts")
def get_alerts(db: Session = Depends(get_db), current_user = Depends(get_current_user_optional)):
    t0 = time.perf_counter()
    # Fetch recent transactions reduced to 500 for SIH lightning response speed
    recent_txs = db.query(models.BlockchainEvent).order_by(models.BlockchainEvent.timestamp.desc()).limit(500).all()
    t1 = time.perf_counter()
    with open("server_time.log", "a") as f: f.write(f"SQL Fetch 500 txs: {t1-t0:.4f}s\n")

    
    service = CorrelationService(db, detector=ANOMALY_DETECTOR)
    txids = [tx.txid for tx in recent_txs]
    alerts = service.get_correlated_entities_batch(txids)
            
    # Sort by risk score descending, then assign ranks
    alerts.sort(key=lambda x: x.get("score", 0), reverse=True)
    for i, alert in enumerate(alerts):
        alert["rank"] = i + 1
        
    return Response(content=orjson.dumps(alerts, option=orjson.OPT_SERIALIZE_NUMPY), media_type="application/json")

@app.get("/api/entity/{tx_id}")
def get_entity(tx_id: str, db: Session = Depends(get_db)):
    service = CorrelationService(db, detector=ANOMALY_DETECTOR)
    detail = service.get_correlated_entity(tx_id)
    
    return detail if detail else {}

@app.get("/api/graph/global")
def get_global_graph(db: Session = Depends(get_db)):
    graph_service = GraphService(detector=ANOMALY_DETECTOR)
    return graph_service.get_global_graph(db)

@app.get("/api/graph/{txid}")
@app.get("/api/graph/entity/{txid}")
def get_entity_graph(txid: str, hops: int = 1, db: Session = Depends(get_db)):
    if txid == "global":
        graph_service = GraphService(detector=ANOMALY_DETECTOR)
        return graph_service.get_global_graph(db)
    graph_service = GraphService(detector=ANOMALY_DETECTOR)
    return graph_service.get_subgraph(txid, hops, db)


@app.get("/api/investigate/{tx_id}")
@app.post("/api/investigate")
def investigate(tx_id: str, db: Session = Depends(get_db)):
    return ENSEMBLE_SERVICE.analyze_entity(tx_id, db=db)


@app.get("/api/gnn/{tx_id}")
def get_gnn_prediction(tx_id: str, hops: int = 2, db: Session = Depends(get_db)):
    return GNN_SERVICE.predict(tx_id, db=db, max_hops=hops)

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "disconnected"
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    models_loaded = (
        PREDICTOR is not None and PREDICTOR.model is not None and
        PREDICTOR_HEIST is not None and PREDICTOR_HEIST.model is not None and
        GNN_SERVICE is not None and GNN_SERVICE.model is not None
    )

    return {
        "status": "offline_ready",
        "db": db_status,
        "models": "loaded" if models_loaded else "degraded"
    }

@app.get("/api/report/{tx_id}")
def generate_pdf_report(tx_id: str, db: Session = Depends(get_db)):
    pdf_buffer = create_forensic_report(tx_id, db=db, ensemble_service=ENSEMBLE_SERVICE)
    if not pdf_buffer:
        raise HTTPException(status_code=404, detail="Entity not found for report generation")
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=crypto_trace_report_{tx_id}.pdf"}
    )



