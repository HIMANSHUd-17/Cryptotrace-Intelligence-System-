import pandas as pd
import xgboost as xgb
import os
import joblib
import time
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score

def train_bitcoin_heist_model():
    print("🚀 Initializing Bitcoin Heist Ransomware Training Pipeline...")
    start_time = time.time()
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "../data/bitcoin_heist/BitcoinHeistData.csv")
    
    print("Loading CSV Data (This may take a moment due to 2.9M rows)...")
    df = pd.read_csv(data_path)
    
    print(f"Dataset fully loaded. Initial shape: {df.shape}")
    
    # 1. Label Mapping (white -> 0, anything else -> 1)
    df["label"] = df["label"].apply(lambda x: 0 if x.strip().lower() == 'white' else 1)
    
    # Check balance
    illicit_count = len(df[df["label"] == 1])
    licit_count = len(df[df["label"] == 0])
    print(f"\nLabel Distribution Before Sampling:")
    print(f"Ransomware Associated (1): {illicit_count}")
    print(f"Benign 'White' (0): {licit_count}")
    
    # 2. Smart Under-Sampling for Memory Optimization & Speed
    # We'll take ALL ransomware labels, and sample around 250,000 benign labels
    licit_sample = df[df["label"] == 0].sample(n=min(250000, licit_count), random_state=42)
    illicit_sample = df[df["label"] == 1]
    
    df_balanced = pd.concat([licit_sample, illicit_sample]).sample(frac=1, random_state=42) # Shuffle
    print(f"\nTraining on optimized subset of {len(df_balanced)} rows.")
    
    # 3. Target/Feature Split
    X = df_balanced.drop(columns=["address", "label"])
    y = df_balanced["label"]
    
    # 4. Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # 5. XGBoost Setup
    scale_pos_weight = len(y_train[y_train == 0]) / len(y_train[y_train == 1])
    
    print(f"\nScale pos weight calculated: {scale_pos_weight:.2f}")
    
    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        tree_method="hist", 
        n_jobs=-1,
        random_state=42
    )
    
    print("\n⚙️  Training XGBClassifier (Bitcoin Heist Model)...")
    model.fit(X_train, y_train)
    
    print("Training complete! Running evaluations...")
    preds = model.predict(X_test)
    
    print("\n--- Accuracy Report ---")
    print(classification_report(y_test, preds))
    
    model_out = os.path.join(script_dir, "ransomware_model.pkl")
    joblib.dump(model, model_out)
    print(f"✅ Model artifact successfully saved to: {model_out}")
    print(f"⏱️  Total compile time: {time.time() - start_time:.2f} seconds.")

if __name__ == "__main__":
    train_bitcoin_heist_model()
