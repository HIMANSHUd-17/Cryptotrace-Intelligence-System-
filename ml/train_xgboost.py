import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.metrics import classification_report
import joblib
import os
import time

def main():
    print("🚀 Initializing Elliptic Dataset XGBoost Training Pipeline...")
    start_time = time.time()
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, "../data/elliptic_bitcoin_dataset")
    
    if not os.path.exists(data_dir):
        print(f"❌ Error: Could not locate {data_dir}")
        return

    print("📊 Loading Classes...")
    classes = pd.read_csv(f"{data_dir}/elliptic_txs_classes.csv")
    
    print("📊 Loading Features (this might take a few moments)...")
    # Header=None because elliptic_txs_features has no header row
    features = pd.read_csv(f"{data_dir}/elliptic_txs_features.csv", header=None)
    
    # Col 0 = txId, Col 1 = time_step, Col 2..166 = features
    features.columns = ["txId", "time_step"] + [f"f_{i}" for i in range(1, 166)]
    
    print("🔄 Merging & Masking labels...")
    df = features.merge(classes, on="txId", how="left")
    
    # 1=illicit, 2=licit, unknown=unlabeled (we map to 1=illicit, 0=licit, -1=unknown)
    df["class"] = df["class"].map({"1": 1, "2": 0, "unknown": -1})
    
    labeled = df[df["class"] != -1].copy()
    print(f"✅ Extracted {len(labeled)} labeled transactions out of {len(df)} total.")
    
    # Time-series split. Time step 34 separates train/test to prevent future-state leak.
    train = labeled[labeled["time_step"] <= 34]
    test = labeled[labeled["time_step"] > 34]
    
    print(f"✂️  Train set (Timesteps <= 34): {len(train)} records")
    print(f"✂️  Test set  (Timesteps > 34):  {len(test)} records")
    
    X_train, y_train = train.drop(columns=["txId", "class"]), train["class"]
    X_test, y_test = test.drop(columns=["txId", "class"]), test["class"]

    # Calculate scale_pos_weight to aggressively balance the 98% Licit vs 2% Illicit class ratio
    # formula: count(negative) / count(positive)
    imbalance_weight = (y_train == 0).sum() / (y_train == 1).sum()
    print(f"⚖️  Calculated scale_pos_weight for XGBoost: {imbalance_weight:.2f}")

    print("⚙️  Training XGBClassifier (Tree Limit: 300, Depth: 6)...")
    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=imbalance_weight,
        eval_metric="aucpr",
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)

    print("📊 Evaluating Test Predictions (Time Steps 35 - 49)...")
    preds = model.predict(X_test)
    
    # Standard output metrics
    report = classification_report(y_test, preds, target_names=["licit", "illicit"])
    print("\n" + "="*50)
    print("🧠 MODEL CLASSIFICATION REPORT (XGBoost)")
    print("="*50)
    print(report)
    
    save_path = "model.pkl"
    joblib.dump(model, save_path)
    print(f"💾 Saved binary compiled model to {save_path}")
    print(f"⏱️  Total compile time: {time.time() - start_time:.2f} seconds.")

if __name__ == "__main__":
    main()
