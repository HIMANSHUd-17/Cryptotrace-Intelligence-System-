import json
from sqlalchemy import text
from db.models import NetworkEvent, BlockchainEvent, TransactionEdge

class GraphService:
    def __init__(self):
        pass

    def get_subgraph(self, tx_id: str, max_hops: int = 2, db_session=None, **kwargs):
        """
        Returns a multi-hop subgraph using Recursive CTEs in SQLite.
        Output format: {"nodes": [...], "links": [...], "edges": [...]}
        """
        if "hops" in kwargs:
            max_hops = kwargs["hops"]

        if not db_session or not tx_id:
            return {"nodes": [], "links": [], "edges": []}

        sql = text("""
        WITH RECURSIVE graph_cte(source, target, depth) AS (
            SELECT source_tx AS source, target_tx AS target, 1 AS depth
            FROM transaction_edges
            WHERE source_tx = :tx_id OR target_tx = :tx_id

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

        # Ensure target tx_id node exists with High risk & priority size
        nodes_dict[tx_id] = {
            "id": tx_id,
            "label": f"TX: {tx_id[:8]}",
            "type": "Transaction",
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
                    "risk": "High" if src == tx_id else "Medium"
                }
            if tgt not in nodes_dict:
                nodes_dict[tgt] = {
                    "id": tgt,
                    "label": f"TX: {tgt[:8]}",
                    "type": "Transaction",
                    "val": 8,
                    "risk": "High" if tgt == tx_id else "Medium"
                }
            edges_list.append({"source": src, "target": tgt})

        # Integrate Network Events (IP addresses)
        net_events = db_session.query(NetworkEvent).filter(NetworkEvent.txid == tx_id).all()
        for ne in net_events:
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
                edges_list.append({"source": ip, "target": tx_id})

        tx_node_ids = [nid for nid, ndata in nodes_dict.items() if ndata.get("type") == "Transaction"]
        if tx_node_ids:
            bc_events = db_session.query(BlockchainEvent).filter(BlockchainEvent.txid.in_(tx_node_ids)).all()
            for bc in bc_events:
                if bc.txid in nodes_dict:
                    nodes_dict[bc.txid]["amount"] = bc.amount

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

        recent_txs = db_session.query(BlockchainEvent).order_by(BlockchainEvent.timestamp.desc()).limit(50).all()
        for bc_event in recent_txs:
            tx_id = bc_event.txid
            cluster = int(tx_id[-1]) % 6 if tx_id and tx_id[-1].isdigit() else 0
            risk_level = "High" if cluster % 3 == 0 else "Medium" if cluster % 2 == 0 else "Low"
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
                    "risk": "Low",
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
                    "risk": "Low",
                    "cluster": cluster
                }
                edges.append({"source": tx_id, "target": w})

        return {"nodes": list(nodes.values()), "links": edges, "edges": edges}
