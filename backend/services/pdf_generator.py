import io
import json
import numpy as np
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from sqlalchemy.orm import Session
from services.ensemble_service import EnsembleService

def create_forensic_report(tx_id: str, db: Session, ensemble_service: EnsembleService):
    """
    Generates a PDF forensic report summarizing composite threat score,
    tabular SHAP attributions, and GNN topological risk drivers.
    """
    analysis = ensemble_service.analyze_entity(tx_id, db=db)
    if not analysis:
        return None

    composite_score = analysis.get("composite_score", 0.0)
    tabular_score = analysis.get("tabular_score", 0.0)
    gnn_score = analysis.get("gnn_score", 0.0)
    alert_level = analysis.get("alert_level", "LOW")
    entity_type = analysis.get("type", "Transaction")
    shap_explanations = analysis.get("shap_explanations", [])
    topological_drivers = analysis.get("topological_drivers", [])
    subgraph = analysis.get("subgraph", {})
    nodes_count = len(subgraph.get("nodes", []))
    edges_count = len(subgraph.get("edges", []))

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Header
    c.setFont("Helvetica-Bold", 22)
    c.drawString(50, height - 50, "CryptoTrace Forensic Intelligence Report")
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.gray)
    c.drawString(50, height - 68, f"SIH Production Evaluation | Target Entity: {tx_id} ({entity_type})")

    # Divider
    c.setStrokeColor(colors.black)
    c.line(50, height - 80, width - 50, height - 80)

    # Risk Scores
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(50, height - 110, "1. Unified Threat Score & Ensemble Assessment")

    c.setFont("Helvetica", 11)
    c.drawString(65, height - 130, f"• Composite Ensemble Risk Score: {composite_score:.2f} / 100")
    c.drawString(65, height - 148, f"• GNN Topological Risk Score (PyG GraphSAGE): {gnn_score:.2f} / 100")
    c.drawString(65, height - 166, f"• Tabular ML Feature Risk (XGBoost/SHAP): {tabular_score:.2f} / 100")

    # Classification Badge
    c.setFont("Helvetica-Bold", 13)
    if alert_level in ["CRITICAL", "HIGH"]:
        c.setFillColor(colors.red)
    elif alert_level == "MEDIUM":
        c.setFillColor(colors.orange)
    else:
        c.setFillColor(colors.green)
    c.drawString(50, height - 195, f"THREAT SEVERITY CLASSIFICATION: {alert_level}")

    # Divider
    c.setStrokeColor(colors.lightgrey)
    c.line(50, height - 210, width - 50, height - 210)

    # Tabular Explainability / SHAP
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(50, height - 235, "2. Tabular Algorithmic Drivers & SHAP Attributions")

    c.setFont("Helvetica", 11)
    y_pos = height - 255
    if shap_explanations:
        for reason in shap_explanations[:4]:
            c.drawString(65, y_pos, f"• {reason.get('name', 'Feature')} (Influence Score: {reason.get('value', 0)})")
            y_pos -= 18
    else:
        c.drawString(65, y_pos, "• No significant tabular feature anomalies detected.")
        y_pos -= 18

    # Divider
    c.setStrokeColor(colors.lightgrey)
    c.line(50, y_pos - 10, width - 50, y_pos - 10)
    y_pos -= 30

    # Topological Explainability & Subgraph Overview
    c.setFont("Helvetica-Bold", 15)
    c.drawString(50, y_pos, "3. Topological Graph Neighborhood & Risk Drivers")
    y_pos -= 22

    c.setFont("Helvetica", 11)
    c.drawString(65, y_pos, f"Identified a multi-hop sub-topology containing {nodes_count} nodes and {edges_count} edges.")
    y_pos -= 20

    if topological_drivers:
        c.drawString(65, y_pos, f"Flagged {len(topological_drivers)} Topological Risk Drivers:")
        y_pos -= 18
        for driver in topological_drivers[:3]:
            c.drawString(80, y_pos, f"- Node {driver.get('node_id')} ({driver.get('type')}): {driver.get('reason')}")
            y_pos -= 16
    else:
        c.drawString(65, y_pos, "No high-risk topological neighbor nodes flagged.")
        y_pos -= 18

    c.showPage()
    c.save()

    buffer.seek(0)
    return buffer
