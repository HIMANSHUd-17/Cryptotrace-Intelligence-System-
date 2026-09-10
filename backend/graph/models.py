import torch
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv

class GraphSAGE(torch.nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels):
        super(GraphSAGE, self).__init__()
        # 165 input features -> 64 hidden
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        # 64 hidden -> 32 hidden
        self.conv2 = SAGEConv(hidden_channels, hidden_channels // 2)
        # 32 hidden -> binary classification (illicit vs licit)
        self.conv3 = SAGEConv(hidden_channels // 2, out_channels)

    def forward(self, x, edge_index):
        # Layer 1
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.4, training=self.training)
        
        # Layer 2
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.4, training=self.training)
        
        # Layer 3 / Output
        x = self.conv3(x, edge_index)
        
        # We return raw logits. BCEWithLogitsLoss will handle the sigmoid during training.
        return x
