import os
import sys
import json
import torch
import torch.nn as nn
from torch_geometric.data import Data

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.database import SessionLocal
from database.models import Transaction, Edge
from graph.models import GraphSAGE

def train_model():
    print("Loading Graph Data from SQLite...")
    db = SessionLocal()
    
    # 1. Load Nodes (Transactions)
    transactions = db.query(Transaction).all()
    num_nodes = len(transactions)
    print(f"Total Nodes: {num_nodes}")
    if num_nodes == 0:
        print("No transactions found. Make sure Phase 1 DB is seeded!")
        return

    # Map string tx_id to sequential integer indices for PyTorch Geometric
    node_mapping = {}
    x_features = []
    y_labels = []
    
    for idx, tx in enumerate(transactions):
        node_mapping[tx.tx_id] = idx
        
        # Extract features (JSON to list)
        feats = json.loads(tx.features) if isinstance(tx.features, str) else tx.features
        
        # The Elliptic dataset expects 166 features typically, 
        # but our GNN just needs raw vectors (165 features + 1 time_step)
        time_step = float(tx.time_step) if tx.time_step else 1.0
        full_feat = [time_step] + feats
        x_features.append(full_feat)
        
        # Labels: '1' is illicit (1), '2' is licit (0), 'unknown' is unlabeled (-1)
        if tx.class_label == '1':
            y_labels.append(1.0)
        elif tx.class_label == '2':
            y_labels.append(0.0)
        else:
            y_labels.append(-1.0)  # Mask out in training
            
    x = torch.tensor(x_features, dtype=torch.float)
    y = torch.tensor(y_labels, dtype=torch.float).unsqueeze(1) # [N, 1] for BCE

    # 2. Load Edges
    db_edges = db.query(Edge).all()
    print(f"Total Edges: {len(db_edges)}")
    
    edge_list_src = []
    edge_list_tgt = []
    
    for edge in db_edges:
        if edge.source_tx_id in node_mapping and edge.target_tx_id in node_mapping:
            edge_list_src.append(node_mapping[edge.source_tx_id])
            edge_list_tgt.append(node_mapping[edge.target_tx_id])
            
    edge_index = torch.tensor([edge_list_src, edge_list_tgt], dtype=torch.long)
    db.close()

    print("Constructing PyG Data Object...")
    data = Data(x=x, edge_index=edge_index, y=y)
    
    # Create train mask (only labeled nodes, i.e. class 1 or 2)
    train_mask = (y.squeeze() != -1.0)
    data.train_mask = train_mask
    
    labeled_count = int(train_mask.sum().item())
    print(f"Labeled Nodes available for training: {labeled_count}")

    # 3. Setup Model
    in_channels = x.shape[1] # 166
    hidden_channels = 64
    out_channels = 1 # Binary classification
    
    model = GraphSAGE(in_channels, hidden_channels, out_channels)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)
    criterion = nn.BCEWithLogitsLoss()
    
    print("Starting Training Loop (15 Epochs for speed)...")
    model.train()
    for epoch in range(15):
        optimizer.zero_grad()
        out = model(data.x, data.edge_index)
        
        # Calculate loss only on labeled nodes
        loss = criterion(out[data.train_mask], data.y[data.train_mask])
        
        loss.backward()
        optimizer.step()
        
        if epoch % 5 == 0:
            print(f"Epoch {epoch:02d} | Loss: {loss.item():.4f}")

    print("Training Complete!")
    
    # Save Model Weights
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "graphsage.pt")
    torch.save(model.state_dict(), model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_model()
