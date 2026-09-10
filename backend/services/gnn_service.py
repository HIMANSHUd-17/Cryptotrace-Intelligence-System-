import json
from pathlib import Path
import torch
from torch_geometric.data import Data
from sqlalchemy.orm import Session
from db import models
from graph.models import GraphSAGE
from services.graph_service import GraphService

class GNNService:
    def __init__(self, model_path: str = None):
        if not model_path:
            base_dir = Path(__file__).resolve().parent.parent
            resolved_path = base_dir / "graph" / "graphsage.pt"
        else:
            resolved_path = Path(model_path)
        
        self.in_channels = 166
        self.hidden_channels = 64
        self.out_channels = 1
        self.model = GraphSAGE(self.in_channels, self.hidden_channels, self.out_channels)
        
        if resolved_path.exists():
            self.model.load_state_dict(torch.load(str(resolved_path), map_location=torch.device('cpu')))
            print(f"Loaded GNN model weights from {resolved_path}")
        else:
            print(f"Warning: GNN model weights file not found at {resolved_path}")
            
        self.model.eval()
        self.graph_service = GraphService()

    def build_pyg_data(self, tx_id: str, max_hops: int, db: Session):
        """
        1. Extract subgraph payload from GraphService (nodes, edges).
        2. Map node IDs to continuous 0 to N-1 integer indices.
        3. Build edge_index tensor (2, E).
        4. Fetch node features from models.EllipticFeature / models.HeistFeature.
        5. Return PyG Data object, target_index, and original subgraph payload.
        """
        subgraph = self.graph_service.get_subgraph(tx_id, max_hops=max_hops, db_session=db)
        nodes = subgraph.get("nodes", [])
        edges = subgraph.get("edges", [])

        if not nodes:
            return None, None, subgraph

        # Continuous node mapping 0..N-1
        node_to_idx = {node["id"]: i for i, node in enumerate(nodes)}
        target_idx = node_to_idx.get(tx_id, 0)

        # Build edge_index (2, E)
        src_indices = []
        dst_indices = []
        for edge in edges:
            src = edge["source"]
            dst = edge["target"]
            if src in node_to_idx and dst in node_to_idx:
                src_indices.append(node_to_idx[src])
                dst_indices.append(node_to_idx[dst])

        if src_indices:
            edge_index = torch.tensor([src_indices, dst_indices], dtype=torch.long)
        else:
            edge_index = torch.empty((2, 0), dtype=torch.long)

        # Fetch node features from SQLite in batched query
        node_ids = list(node_to_idx.keys())
        elliptic_rows = db.query(models.EllipticFeature).filter(models.EllipticFeature.tx_id.in_(node_ids)).all()
        features_dict = {row.tx_id: json.loads(row.features) for row in elliptic_rows}

        # Handle Heist address features if present
        heist_rows = db.query(models.HeistFeature).filter(models.HeistFeature.address.in_(node_ids)).all()
        for row in heist_rows:
            h_feats = json.loads(row.features)
            features_dict[row.address] = h_feats + [0.0] * (166 - len(h_feats))

        x_list = []
        for nid in node_ids:
            if nid in features_dict:
                feat = features_dict[nid]
                if len(feat) < 166:
                    feat = feat + [0.0] * (166 - len(feat))
                elif len(feat) > 166:
                    feat = feat[:166]
                x_list.append(feat)
            else:
                # Default zero vector for IP addresses or unlisted nodes
                x_list.append([0.0] * 166)

        x = torch.tensor(x_list, dtype=torch.float)
        data = Data(x=x, edge_index=edge_index)
        return data, target_idx, subgraph

    def predict(self, tx_id: str, db: Session, max_hops: int = 2):
        """
        Runs GNN forward pass on the dynamic PyG data object for target tx_id.
        Returns GNN illicit score (0-100) and subgraph payload.
        """
        data, target_idx, subgraph = self.build_pyg_data(tx_id, max_hops, db)
        if data is None:
            return {
                "tx_id": tx_id,
                "illicit_score": 0.0,
                "subgraph": {"nodes": [], "edges": []}
            }

        with torch.no_grad():
            out = self.model(data.x, data.edge_index)
            logit = out[target_idx]
            prob = torch.sigmoid(logit).item()
            if isinstance(prob, list):
                prob = prob[0]
            illicit_score = round(prob * 100, 2)

        return {
            "tx_id": tx_id,
            "target_node_index": target_idx,
            "illicit_score": illicit_score,
            "subgraph": subgraph
        }
