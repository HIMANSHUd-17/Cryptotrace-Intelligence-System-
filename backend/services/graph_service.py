import json
from sqlalchemy import text
from db.models import NetworkEvent, BlockchainEvent, TransactionEdge

class GraphService:
    def __init__(self, detector=None):
        self.detector = detector

    def get_subgraph(self, tx_id: str, max_hops: int = 2, db_session=None, **kwargs):
        """
        Returns a multi-hop subgraph using Recursive CTEs in SQLite.
        Output format: {"nodes": [...], "links": [...], "edges": [...]}
        """
        if "hops" in kwargs:
            max_hops = kwargs["hops"]

        if not db_session or not tx_id:
            return {"nodes": [], "links": [], "edges": []}

        # 1. Resolve entity ID to root transaction IDs (handles IPs and Wallets)
        root_txids = [tx_id]
        
        net_evs = db_session.query(NetworkEvent).filter(NetworkEvent.src_ip == tx_id).all()
        if net_evs:
            root_txids = [ne.txid for ne in net_evs if ne.txid]
        else:
            bc_evs = db_session.query(BlockchainEvent).filter(
                (BlockchainEvent.input_wallets.like(f'%"{tx_id}"%')) | 
                (BlockchainEvent.output_wallets.like(f'%"{tx_id}"%')) |
                (BlockchainEvent.input_wallets.like(f'%{tx_id}%')) |
                (BlockchainEvent.output_wallets.like(f'%{tx_id}%'))
            ).all()
            if bc_evs:
                root_txids = [bc.txid for bc in bc_evs]

        # Failsafe if empty
        if not root_txids:
            root_txids = [tx_id]

        in_clause = ', '.join([f"'{t}'" for t in root_txids])
        
        sql = text(f"""
        WITH RECURSIVE graph_cte(source, target, depth) AS (
            SELECT source_tx AS source, target_tx AS target, 1 AS depth
            FROM transaction_edges
            WHERE source_tx IN ({in_clause}) OR target_tx IN ({in_clause})

            UNION

            SELECT e.source_tx AS source, e.target_tx AS target, c.depth + 1 AS depth
            FROM transaction_edges e
            JOIN graph_cte c ON (e.source_tx = c.target OR e.target_tx = c.target OR e.source_tx = c.source OR e.target_tx = c.source)
            WHERE c.depth < :max_hops
        )
        SELECT DISTINCT source, target FROM graph_cte;
        """)

        results = db_session.execute(sql, {"tx_id": tx_id, "max_hops": max_hops}).fetchall()

        nodes_dict = {}
        edges_list = []

        # Ensure target node correctly exists if it's an IP or Wallet
        is_ip = bool(net_evs)
        is_wallet = bool(not net_evs and tx_id not in root_txids)
        
        nodes_dict[tx_id] = {
            "id": tx_id,
            "label": f"{'IP' if is_ip else 'Wallet' if is_wallet else 'TX'}: {tx_id[:8]}",
            "type": "IP" if is_ip else "Wallet" if is_wallet else "Transaction",
            "val": 10,
            "risk": "High"
        }

        for row in results:
            src, tgt = str(row[0]), str(row[1])
            if src not in nodes_dict:
                nodes_dict[src] = {
                    "id": src,
                    "label": f"TX: {src[:8]}",
                    "type": "Transaction",
                    "val": 8,
                    "risk": "Low"
                }
            if tgt not in nodes_dict:
                nodes_dict[tgt] = {
                    "id": tgt,
                    "label": f"TX: {tgt[:8]}",
                    "type": "Transaction",
                    "val": 8,
                    "risk": "Low"
                }
            edges_list.append({"source": src, "target": tgt})

        # Integrate Network Events (IP addresses) for all involved transactions
        tx_nodes_for_ips = [nid for nid, ndata in nodes_dict.items() if ndata.get("type") == "Transaction"]
        if tx_nodes_for_ips:
            all_net_events = db_session.query(NetworkEvent).filter(NetworkEvent.txid.in_(tx_nodes_for_ips)).all()
            for ne in all_net_events:
                if ne.src_ip:
                    ip = str(ne.src_ip)
                    if ip not in nodes_dict:
                        nodes_dict[ip] = {
                            "id": ip,
                            "label": f"IP: {ip}",
                            "type": "IP",
                            "val": 6,
                            "risk": "Medium"
                        }
                    edges_list.append({"source": ip, "target": ne.txid})


        tx_node_ids = [nid for nid, ndata in nodes_dict.items() if ndata.get("type") == "Transaction"]
        if tx_node_ids:
            bc_events = db_session.query(BlockchainEvent).filter(BlockchainEvent.txid.in_(tx_node_ids)).all()
            bc_dict = {bc.txid: bc for bc in bc_events}
            
            # Predict Risk Dynamically
            if self.detector and hasattr(self.detector, 'predict_batch'):
                net_events_arr = db_session.query(NetworkEvent).filter(NetworkEvent.txid.in_(tx_node_ids)).all()
                net_map = {}
                for ne in net_events_arr:
                    net_map.setdefault(ne.txid, []).append(ne)
                
                bc_list = [bc_dict.get(tid) for tid in tx_node_ids]
                net_lists = [net_map.get(tid, []) for tid in tx_node_ids]
                
                preds = self.detector.predict_batch(bc_list, net_lists)
                for tid, pred in zip(tx_node_ids, preds):
                    nodes_dict[tid]["risk"] = pred[1]
                    nodes_dict[tid]["val"] = 12 if pred[1] == "High" else 8 if pred[1] == "Medium" else 6
            else:
                for tid in tx_node_ids:
                    nodes_dict[tid]["risk"] = "Low"
            
            for bc in bc_events:
                if bc.txid in nodes_dict:
                    nodes_dict[bc.txid]["amount"] = bc.amount

                    # Extract up to 3 Input Wallets
                    try:
                        inputs = json.loads(bc.input_wallets) if bc.input_wallets else []
                        if isinstance(inputs, (int, float)):
                            inputs = [f"sub_in_wallet_{i}" for i in range(int(inputs))]
                        elif not isinstance(inputs, list):
                            inputs = [str(inputs)]
                    except:
                        inputs = [str(bc.input_wallets)] if bc.input_wallets else []

                    for w in inputs[:3]:
                        if w not in nodes_dict:
                            nodes_dict[w] = {
                                "id": w,
                                "label": f"Wallet: {w[:8]}",
                                "type": "Wallet",
                                "val": 5,
                                "risk": nodes_dict[bc.txid]["risk"]
                            }
                        edges_list.append({"source": w, "target": bc.txid})

                    # Extract up to 3 Output Wallets
                    try:
                        outputs = json.loads(bc.output_wallets) if bc.output_wallets else []
                        if isinstance(outputs, (int, float)):
                            outputs = [f"sub_out_wallet_{i}" for i in range(int(outputs))]
                        elif not isinstance(outputs, list):
                            outputs = [str(outputs)]
                    except:
                        outputs = [str(bc.output_wallets)] if bc.output_wallets else []

                    for w in outputs[:3]:
                        if w not in nodes_dict:
                            nodes_dict[w] = {
                                "id": w,
                                "label": f"Wallet: {w[:8]}",
                                "type": "Wallet",
                                "val": 5,
                                "risk": nodes_dict[bc.txid]["risk"]
                            }
                        edges_list.append({"source": bc.txid, "target": w})

        return {
            "nodes": list(nodes_dict.values()),
            "links": edges_list,
            "edges": edges_list
        }

    def get_global_graph(self, db_session=None):
        """
        Returns a sample of highly connected nodes for the dashboard landing page.
        """
        if not db_session:
            return {"nodes": [], "links": [], "edges": []}

        nodes = {}
        edges = []

        recent_txs = db_session.query(BlockchainEvent).order_by(BlockchainEvent.timestamp.desc()).limit(1500).all()
        
        severity_map = {}
        if self.detector and hasattr(self.detector, 'predict_batch'):
            tx_ids = [tx.txid for tx in recent_txs]
            net_events = db_session.query(NetworkEvent).filter(NetworkEvent.txid.in_(tx_ids)).all()
            net_map = {}
            for ne in net_events:
                net_map.setdefault(ne.txid, []).append(ne)
                
            net_lists = [net_map.get(tx.txid, []) for tx in recent_txs]
            preds = self.detector.predict_batch(recent_txs, net_lists)
            severity_map = {tx.txid: pred[1] for tx, pred in zip(recent_txs, preds)}

        for bc_event in recent_txs:
            tx_id = bc_event.txid
            cluster = int(tx_id[-1]) % 6 if tx_id and tx_id[-1].isdigit() else 0
            risk_level = severity_map.get(tx_id, "Low")
            
            val_size = 12 if risk_level == "High" else 8 if risk_level == "Medium" else 6

            nodes[tx_id] = {
                "id": tx_id,
                "label": f"TX: {tx_id[:8]}",
                "type": "Transaction",
                "val": val_size,
                "risk": risk_level,
                "amount": bc_event.amount,
                "cluster": cluster
            }

            try:
                inputs = json.loads(bc_event.input_wallets) if bc_event.input_wallets else []
                if isinstance(inputs, (int, float)):
                    inputs = [f"grp{cluster}_in_wallet_{i}" for i in range(int(inputs))]
                elif not isinstance(inputs, list):
                    inputs = [str(inputs)]
            except:
                inputs = [str(bc_event.input_wallets)] if bc_event.input_wallets else []

            for w in inputs[:3]:
                nodes[w] = {
                    "id": w,
                    "label": f"Wallet: {w[:8]}",
                    "type": "Wallet",
                    "val": 5,
                    "risk": risk_level,
                    "cluster": cluster
                }
                edges.append({"source": w, "target": tx_id})

            try:
                outputs = json.loads(bc_event.output_wallets) if bc_event.output_wallets else []
                if isinstance(outputs, (int, float)):
                    outputs = [f"grp{cluster}_out_wallet_{i}" for i in range(int(outputs))]
                elif not isinstance(outputs, list):
                    outputs = [str(outputs)]
            except:
                outputs = [str(bc_event.output_wallets)] if bc_event.output_wallets else []

            for w in outputs[:3]:
                nodes[w] = {
                    "id": w,
                    "label": f"Wallet: {w[:8]}",
                    "type": "Wallet",
                    "val": 5,
                    "risk": risk_level,
                    "cluster": cluster
                }
                edges.append({"source": tx_id, "target": w})

        return {"nodes": list(nodes.values()), "links": edges, "edges": edges}
