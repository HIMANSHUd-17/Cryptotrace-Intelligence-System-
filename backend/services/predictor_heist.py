import joblib
import pandas as pd
import shap
import numpy as np
from pathlib import Path

class HeistPredictor:
    def __init__(self, model_filename="ransomware_model.pkl"):
        base_dir = Path(__file__).resolve().parent.parent
        model_path = base_dir / "ml" / model_filename
        if not model_path.exists():
            model_path = base_dir.parent / "ml" / model_filename
        if not model_path.exists():
            model_path = base_dir / model_filename

        try:
            self.model = joblib.load(str(model_path))
            self.explainer = shap.TreeExplainer(self.model)
            self.feature_names = ["year", "day", "length", "weight", "count", "looped", "neighbors", "income"]
            print(f"Loaded Heist Model: {model_path}")
        except Exception as e:
            print(f"Failed to load Heist model at {model_path}: {e}")
            self.model = None

    def predict(self, feature_array):
        if self.model is None:
            return 50.0, [{"name": "Model Not Found", "value": 100}]
            
        df_feats = pd.DataFrame([feature_array], columns=self.feature_names)
        
        probs = self.model.predict_proba(df_feats)
        risk_score = probs[0][1] * 100.0  # Percentage
        
        shap_values = self.explainer.shap_values(df_feats)
        
        # Handle SHAP dimensionality
        if isinstance(shap_values, list):
            sv = shap_values[1][0] 
        else:
            sv = shap_values[0]
            
        feat_importance = []
        for i, name in enumerate(self.feature_names):
            feat_importance.append({
                "name": name,
                "val_abs": abs(sv[i])
            })
            
        feat_importance.sort(key=lambda x: x["val_abs"], reverse=True)
        
        total_sv = sum([x["val_abs"] for x in feat_importance]) + 1e-9
        top_reasons = []
        for f in feat_importance[:5]:
            top_reasons.append({
                "name": str(f["name"]).capitalize(),
                "value": round((f["val_abs"] / total_sv) * 100, 1)
            })
            
        return risk_score, top_reasons
