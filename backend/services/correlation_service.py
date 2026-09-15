from db.models import NetworkEvent, BlockchainEvent
import json
import datetime
import time

class CorrelationService:
    def __init__(self, db_session, detector=None):
        self.db = db_session
        self.detector = detector

    def get_correlated_entities_batch(self, txids: list):
        if not txids:
            return []

        t0 = time.perf_counter()
        # 1. Fetch Blockchain data (Batched)
        bc_events = self.db.query(BlockchainEvent).filter(BlockchainEvent.txid.in_(txids)).all()
        bc_map = {bc.txid: bc for bc in bc_events}

        # 2. Fetch Network IPs (Batched)
        net_events = self.db.query(NetworkEvent).filter(NetworkEvent.txid.in_(txids)).all()
        net_map = {}
        for ne in net_events:
            if ne.txid not in net_map:
                net_map[ne.txid] = []
            net_map[ne.txid].append(ne)

        t1 = time.perf_counter()

        alerts = []
        bc_event_list = []
        net_events_list = []
        valid_txids = []

        for tx_id in txids:
            bc_event = bc_map.get(tx_id)
            net_evs = net_map.get(tx_id, [])
            if not bc_event and not net_evs:
                continue
            bc_event_list.append(bc_event)
            net_events_list.append(net_evs)
            valid_txids.append(tx_id)

        # Batch ML inference
        if self.detector and hasattr(self.detector, 'predict_batch'):
            batch_results = self.detector.predict_batch(bc_event_list, net_events_list)
        else:
            batch_results = [(50, "Pending Analysis", [{"name": "Isolation Anomaly Distance", "value": 0}, {"name": "Velocity / Cluster Proximity", "value": 0}, {"name": "Network Entity Association", "value": 0}]) for _ in valid_txids]

        seen_entities = set()

        # Build objects
        for i, tx_id in enumerate(valid_txids):
            bc_event = bc_event_list[i]
            net_evs = net_events_list[i]
            risk_score, severity, features = batch_results[i]

            try:
                inputs = json.loads(bc_event.input_wallets) if bc_event and bc_event.input_wallets else []
                if isinstance(inputs, (int, float)):
                    inputs = [f"input_wallet_{j}" for j in range(int(inputs))]
                elif not isinstance(inputs, list):
                    inputs = [str(inputs)]
            except:
                inputs = [str(bc_event.input_wallets)] if bc_event and bc_event.input_wallets else []

            try:
                outputs = json.loads(bc_event.output_wallets) if bc_event and bc_event.output_wallets else []
                if isinstance(outputs, (int, float)):
                    outputs = [f"output_wallet_{j}" for j in range(int(outputs))]
                elif not isinstance(outputs, list):
                    outputs = [str(outputs)]
            except:
                outputs = [str(bc_event.output_wallets)] if bc_event and bc_event.output_wallets else []

            associated_ips = [ne.src_ip for ne in net_evs if ne.src_ip]
            primary_ip = associated_ips[0] if associated_ips else "Unknown"
            primary_country = net_evs[0].geo_asn if net_evs and net_evs[0].geo_asn else "Unknown"

            # 1. Main Transaction Alert
            if tx_id not in seen_entities:
                seen_entities.add(tx_id)
                alerts.append({
                    "id": tx_id,
                    "rank": 0,
                    "type": "TX",
                    "entity": tx_id,
                    "score": risk_score,
                    "confidence": 85 if self.detector and getattr(self.detector, 'is_trained', False) else 75,
                    "severity": severity,
                    "status": "New Correlation",
                    "reasons": ["Automated ML Anomaly Flag" if risk_score > 60 else "Routine Transaction"],
                    "details": {
                        "timestamp": datetime.datetime.utcnow().isoformat(),
                        "totalReceived": f"{bc_event.amount} BTC" if bc_event else "Unknown",
                        "totalSent": f"{bc_event.amount} BTC" if bc_event else "Unknown",
                        "currentBalance": "0.00 BTC",
                        "firstSeen": bc_event.timestamp.strftime("%Y-%m-%d") if bc_event and bc_event.timestamp else "Unknown",
                        "associatedHash": tx_id,
                        "inputs": [{"wallet": w, "amount": "Unknown"} for w in inputs],
                        "outputs": [{"wallet": w, "amount": "Unknown"} for w in outputs],
                        "fee": f"{bc_event.fee} BTC" if bc_event else "Unknown",
                        "associatedIp": primary_ip,
                        "country": primary_country,
                        "network_hits": len(net_evs)
                    },
                    "features": features,
                    "timeline": [],
                    "flow": [],
                    "ips": associated_ips
                })

            # 2. IP Entity Alert (if synthetic / real IP available)
            if primary_ip != "Unknown" and primary_ip not in seen_entities:
                seen_entities.add(primary_ip)
                alerts.append({
                    "id": primary_ip,
                    "rank": 0,
                    "type": "IP",
                    "entity": primary_ip,
                    "score": min(98, risk_score + 5),
                    "confidence": 90,
                    "severity": "High" if risk_score > 60 else "Medium",
                    "status": "Flagged IP Node",
                    "reasons": [f"Tor / Proxy Traffic linked to transaction {tx_id[:8]}"],
                    "details": {
                        "timestamp": datetime.datetime.utcnow().isoformat(),
                        "associatedIp": primary_ip,
                        "country": primary_country,
                        "associatedHash": tx_id
                    },
                    "features": features,
                    "timeline": [],
                    "flow": [],
                    "ips": [primary_ip]
                })

            # 3. Wallet Entity Alert (if wallet available)
            for w in inputs + outputs:
                if w and isinstance(w, str) and not w.startswith("grp") and w not in seen_entities:
                    seen_entities.add(w)
                    alerts.append({
                        "id": w,
                        "rank": 0,
                        "type": "Wallet",
                        "entity": w,
                        "score": risk_score,
                        "confidence": 88,
                        "severity": severity,
                        "status": "Active Wallet",
                        "reasons": [f"Synthetic Wallet participant in TX {tx_id[:8]}"],
                        "details": {
                            "timestamp": datetime.datetime.utcnow().isoformat(),
                            "associatedHash": tx_id,
                            "inputs": [{"wallet": w, "amount": "Unknown"}]
                        },
                        "features": features,
                        "timeline": [],
                        "flow": []
                    })

        return alerts

    def get_correlated_entity(self, tx_id: str):
        results = self.get_correlated_entities_batch([tx_id])
        return results[0] if results else None
