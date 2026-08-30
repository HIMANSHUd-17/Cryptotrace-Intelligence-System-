import joblib
import pandas as pd
import numpy as np
import shap

class Predictor:
    def __init__(self, model_path="model.pkl"):
        try:
            self.model = joblib.load(model_path)
            # Create a TreeExplainer once since tree explainer initialization can be slightly intense
            self.explainer = shap.TreeExplainer(self.model)
        except Exception as e:
            print(f"Warning: Model not found at {model_path}. Start the training script first.")
            self.model = None

    def predict(self, feature_array):
        """
        Receives a 165-feature numpy array, runs prediction, and calculates live SHAP scores.
        """
        if self.model is None:
            return 50.0, [{"name": "Model Not Found", "value": 100}]
            
        # Format for XGBoost
        df_feats = pd.DataFrame([feature_array], columns=["time_step"] + [f"f_{i}" for i in range(1, 166)])
        
        # predict_proba returns [prob_0, prob_1]
        probs = self.model.predict_proba(df_feats)
        risk_score = probs[0][1] * 100  # Convert illicit probability to Risk Score percentage
        
        # Calculate SHAP Values
        shap_values = self.explainer.shap_values(df_feats)
        # Using [0] to get the vector for this specific prediction
        shap_vector = shap_values[0] 
        
        # Pair feature names to SHAP outputs to sort the strongest influencers
        feature_importance = [(f"Feature {i+1}", float(val)) for i, val in enumerate(shap_vector)]
        feature_importance.sort(key=lambda x: abs(x[1]), reverse=True)
        
        # Output top 4 reasons specifically formatted for Dashboard.jsx
        top_reasons = []
        for name, val in feature_importance[:4]:
            if val > 0:
                top_reasons.append({"name": name, "value": int(abs(val) * 100) + 10})
        
        return float(risk_score), top_reasons
