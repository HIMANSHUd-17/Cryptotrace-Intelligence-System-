export const API_BASE = window.location.hostname === 'localhost'
    ? "http://localhost:8000/api"
    : `http://${window.location.hostname}:8000/api`;

const cache = new Map();
const CACHE_DURATION = 60000;

async function fetchWithCache(url) {
    if (cache.has(url)) {
        const entry = cache.get(url);
        if (Date.now() - entry.time < CACHE_DURATION) {
            return entry.data;
        }
    }

    const headers = {};
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(url, { headers });
        if (!res.ok) {
            console.warn(`API fetch ${url} returned status ${res.status}`);
            return url.includes('/alerts') ? [] : null;
        }
        const data = await res.json();
        if (url.includes('/alerts') && !Array.isArray(data)) {
            return [];
        }
        cache.set(url, { data, time: Date.now() });
        return data;
    } catch (e) {
        console.error(`Network error requesting ${url}:`, e);
        return url.includes('/alerts') ? [] : null;
    }
}

// Function to clear cache if needed after data ingestion
export function clearCache() {
    cache.clear();
}

export async function getSystemStats() {
    try {
        return await fetchWithCache(`${API_BASE}/stats`);
    } catch (e) {
        console.error("FastAPI Backend connection failed.", e);
        return { totalScanned: "Error", illicit: 0, licit: 0, unknown: 0, edges: 0 };
    }
}

export async function getAlerts() {
    try {
        const data = await fetchWithCache(`${API_BASE}/alerts`);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("Error in getAlerts:", e);
        return [];
    }
}

export async function getEntity(id) {
    try {
        return await fetchWithCache(`${API_BASE}/entity/${id}`);
    } catch (e) {
        return null;
    }
}

export async function getGraph(id) {
    try {
        const targetId = (!id || id === 'global') ? 'global' : id;
        const url = `${API_BASE}/graph/${targetId}`;
        const data = await fetchWithCache(url);
        if (!data) return { nodes: [], links: [] };

        const nodes = Array.isArray(data.nodes) ? data.nodes.map(n => ({
            ...n,
            val: n.val || (n.risk === 'High' ? 12 : n.risk === 'Medium' ? 8 : 5),
            risk: n.risk || (n.type === 'IP' ? 'Medium' : n.type === 'Transaction' ? 'High' : 'Low')
        })) : [];

        const rawLinks = data.links || data.edges || [];
        const links = Array.isArray(rawLinks) ? rawLinks.map(l => ({
            source: typeof l.source === 'object' ? l.source.id : l.source,
            target: typeof l.target === 'object' ? l.target.id : l.target
        })) : [];

        return { nodes, links };
    } catch (e) {
        console.error("Error in getGraph:", e);
        return { nodes: [], links: [] };
    }
}


export async function getTimeline(id) {
    return [];
}

export async function investigateLive(id) {
    try {
        const headers = {};
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/investigate?tx_id=${id}`, {
            method: 'POST',
            headers
        });
        return await res.json();
    } catch (e) {
        return { error: 'Failed to reach ML backend' };
    }
}
