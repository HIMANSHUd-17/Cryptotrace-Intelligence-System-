import json
import numpy as np
from sqlalchemy.orm import Session
from db import models
from services.predictor import Predictor
from services.predictor_heist import HeistPredictor
from services.gnn_service import GNNService

class EnsembleService:
    def __init__(self, predictor: Predictor, predictor_heist: HeistPredictor, gnn_service: GNNService):
        self.predictor = predictor
        self.predictor_heist = predictor_heist
        self.gnn_service = gnn_service

    def analyze_entity(self, tx_id: str, db: Session, max_hops: int = 2):
        """
        Unified Threat Scoring & Dual Explainability pipeline.
        Combines XGBoost tabular features + PyG GraphSAGE topological predictions.
        """
        tabular_score = 30.0
        shap_explanations = []
        entity_type = "Unknown"
        is_heist = False

        # 1. Tabular Prediction & SHAP Explainability
        elliptic_row = db.query(models.EllipticFeature).filter(models.EllipticFeature.tx_id == tx_id).first()
        if elliptic_row:
            entity_type = "TX"
            feat_array = json.loads(elliptic_row.features)
            if self.predictor:
                tabular_score, shap_explanations = self.predictor.predict(np.array(feat_array))
        else:
            heist_row = db.query(models.HeistFeature).filter(models.HeistFeature.address == tx_id).first()
            if heist_row:
                entity_type = "Address"
                is_heist = True
                heist_array = json.loads(heist_row.features)
                if self.predictor_heist:
                    tabular_score, shap_explanations = self.predictor_heist.predict(np.array(heist_array))

        # 2. Topological GNN Prediction & Subgraph Extraction
        gnn_result = self.gnn_service.predict(tx_id, db=db, max_hops=max_hops)
        gnn_score = gnn_result.get("illicit_score", 0.0)
        subgraph = gnn_result.get("subgraph", {"nodes": [], "edges": []})

        # 3. Ensemble Composite Scoring
        # Blend: 40% Tabular Risk + 60% GNN Topological Risk
        composite_score = round(0.4 * tabular_score + 0.6 * gnn_score, 2)

        # Categorize Alert Level
        if composite_score >= 75.0:
            alert_level = "CRITICAL"
        elif composite_score >= 50.0:
            alert_level = "HIGH"
        elif composite_score >= 25.0:
            alert_level = "MEDIUM"
        else:
            alert_level = "LOW"

        # 4. Dual Explainability: Topological Risk Driver Detection
        nodes = subgraph.get("nodes", [])
        edges = subgraph.get("edges", [])
        topological_drivers = []
        risk_driver_node_ids = set()

        # Query node IDs in SQLite to identify neighbor risk profiles
        neighbor_ids = [n["id"] for n in nodes if n["id"] != tx_id]
        if neighbor_ids:
            # Check if any neighbor has high feature risk or is known illicit
            elliptic_neighbors = db.query(models.EllipticFeature.tx_id).filter(models.EllipticFeature.tx_id.in_(neighbor_ids)).all()
            elliptic_set = {r[0] for r in elliptic_neighbors}
            heist_neighbors = db.query(models.HeistFeature.address).filter(models.HeistFeature.address.in_(neighbor_ids)).all()
            heist_set = {r[0] for r in heist_neighbors}

            for node in nodes:
                nid = node["id"]
                if nid == tx_id:
                    node["is_risk_driver"] = False
                    continue

                # Flag neighbor as risk driver if it belongs to Elliptic or Ransomware dataset
                if nid in elliptic_set or nid in heist_set or composite_score >= 50.0:
                    node["is_risk_driver"] = True
                    risk_driver_node_ids.add(nid)
                    topological_drivers.append({
                        "node_id": nid,
                        "label": node.get("label", nid),
                        "type": node.get("type", "Transaction"),
                        "reason": "Topological risk driver in multi-hop neighborhood"
                    })
                else:
                    node["is_risk_driver"] = False
        else:
            for node in nodes:
                node["is_risk_driver"] = False

        # Annotate edges connected to risk drivers
        for edge in edges:
            src = edge.get("source")
            tgt = edge.get("target")
            if src in risk_driver_node_ids or tgt in risk_driver_node_ids or (composite_score >= 50.0 and len(nodes) > 1):
                edge["is_risk_driver"] = True
            else:
                edge["is_risk_driver"] = False

        return {
            "tx_id": tx_id,
            "type": entity_type,
            "alert_level": alert_level,
            "composite_score": composite_score,
            "tabular_score": round(tabular_score, 2),
            "gnn_score": round(gnn_score, 2),
            "shap_explanations": shap_explanations,
            "topological_drivers": topological_drivers,
            "subgraph": {
                "nodes": nodes,
                "edges": edges
            }
        }
