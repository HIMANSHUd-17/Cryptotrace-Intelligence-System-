const API_BASE = "http://localhost:8000/api";

export async function getSystemStats() {
    try {
        const res = await fetch(`${API_BASE}/stats`);
        return res.json();
    } catch (e) {
        console.error("FastAPI Backend connection failed.", e);
        return { totalScanned: "Error", illicit: 0, licit: 0, unknown: 0, edges: 0 };
    }
}

export async function getAlerts() {
    try {
        const res = await fetch(`${API_BASE}/alerts`);
        return res.json();
    } catch (e) {
        return [];
    }
}

export async function getEntity(id) {
    try {
        const res = await fetch(`${API_BASE}/entity/${id}`);
        return res.json();
    } catch (e) {
        return null;
    }
}

export async function getGraph(id) {
    try {
        const res = await fetch(`${API_BASE}/graph/${id}`);
        return res.json();
    } catch (e) {
        return { nodes: [], links: [] };
    }
}

export async function getTimeline(id) {
    // Deprecated. Timeline is integrated inside the entity object from getEntity().
    return [];
}

export async function investigateLive(id) {
    try {
        const res = await fetch(`${API_BASE}/investigate?tx_id=${id}`, {
            method: 'POST'
        });
        return res.json();
    } catch (e) {
        return { error: 'Failed to reach ML backend' };
    }
}
