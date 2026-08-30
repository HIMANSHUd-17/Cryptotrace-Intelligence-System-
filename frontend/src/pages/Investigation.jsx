import React, { useState, useEffect } from 'react';
import { Search, Hash, Clock, MapPin, Code, Cpu, Network, ArrowRight, Activity } from 'lucide-react';
import { getAlerts, getTimeline } from '../api';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Investigation() {
    const [search, setSearch] = useState('');
    const [timeline, setTimeline] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [selectedEntity, setSelectedEntity] = useState(null);

    useEffect(() => {
        getAlerts().then(data => {
            setAlerts(data);
            const urlId = new URLSearchParams(window.location.search).get('id');
            if (urlId) {
                import('../api').then(async ({ investigateLive }) => {
                    const res = await investigateLive(urlId);
                    if (!res.error) {
                        setSelectedEntity({
                            id: res.tx_id,
                            score: Math.round(res.risk_score),
                            severity: res.risk_score > 60 ? 'High' : 'Medium',
                            type: res.type || 'TX',
                            reasons: ["Cross-linked Target Scanned via ML Node"],
                            details: {
                                timestamp: new Date().toISOString(),
                                totalReceived: "Unknown (Live Endpoint)",
                                totalSent: "Unknown (Live Endpoint)",
                                currentBalance: "Unknown (Live Endpoint)",
                                firstSeen: "Unknown",
                                associatedHash: "Cross-link Execution Complete"
                            },
                            features: res.top_reasons,
                            timeline: [],
                            flow: []
                        });
                    } else {
                        const target = data.find(a => String(a.id) === String(urlId));
                        setSelectedEntity(target || (data.length > 0 ? data[0] : null));
                    }
                });
            } else if (data.length > 0) {
                setSelectedEntity(data[0]);
            }
        });
    }, []);

    const handleSearch = async (e) => {
        if (e.key === 'Enter' && search.trim() !== '') {
            import('../api').then(async ({ investigateLive }) => {
                const res = await investigateLive(search.trim());
                if (!res.error) {
                    setSelectedEntity({
                        id: res.tx_id,
                        score: Math.round(res.risk_score),
                        severity: res.risk_score > 60 ? 'High' : 'Medium',
                        type: 'TX',
                        reasons: ["Live Target Scanned via ML Node"],
                        details: {
                            timestamp: new Date().toISOString(),
                            totalReceived: "Unknown (Live Endpoint)",
                            totalSent: "Unknown (Live Endpoint)",
                            currentBalance: "Unknown (Live Endpoint)",
                            firstSeen: "Unknown",
                            associatedHash: "Pending Graph Execution..."
                        },
                        features: res.top_reasons,
                        timeline: [],
                        flow: []
                    });
                }
            });
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full w-full bg-darkBg text-zinc-300">
            {/* Left Column (25%) */}
            <div className="w-full lg:w-[25%] border-r border-cardBorder/50 bg-cardBg/30 flex flex-col pt-4">
                <div className="px-5 pb-4 border-b border-cardBorder/50">
                    <h2 className="text-sm font-semibold tracking-wide text-zinc-100 mb-3">INVESTIGATION TARGET</h2>
                    <div className="relative">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Enter Address, TXID, IP..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearch}
                            className="w-full pl-9 pr-10 py-2 border border-cardBorder/50 bg-zinc-950/50 rounded-md focus:outline-none focus:border-electricBlue focus:ring-1 focus:ring-electricBlue text-sm transition-colors text-zinc-200"
                        />
                        {search && (
                            <X className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 cursor-pointer hover:text-white" onClick={() => setSearch('')} />
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    <h3 className="text-xs font-semibold text-zinc-500 tracking-wider mb-2 px-2">RECENTLY FLAGGED</h3>
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-1.5">
                        {alerts
                            .filter(a => search.trim() === '' || String(a.id).includes(search) || a.entity?.includes(search))
                            .slice(0, 15).map((entity, i) => (
                                <motion.div
                                    variants={itemVariants}
                                    key={entity.id}
                                    onClick={() => setSelectedEntity(entity)}
                                    className={`p-3 rounded-lg border border-transparent hover:border-cardBorder/50 hover:bg-zinc-800/50 cursor-pointer transition-colors ${selectedEntity?.id === entity.id ? 'bg-zinc-800/80 border-cardBorder/50 border-l-2 border-l-riskHigh' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-mono text-xs text-electricBlue/90 truncate w-3/4">{entity.id}</span>
                                        <span className={`w-2 h-2 mt-1 rounded-full ${entity.severity === 'High' ? 'bg-riskHigh shadow-[0_0_8px_theme("colors.riskHigh")]' : entity.severity === 'Medium' ? 'bg-riskMedium' : 'bg-riskLow'}`}></span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                                        <span>{entity.type}</span>
                                        <span>{new Date(entity.details.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                </motion.div>
                            ))}
                    </motion.div>
                </div>
            </div>

            {/* Right Column (75%) */}
            <div className="flex-1 overflow-y-auto bg-darkBg/95 p-6 space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Entity Intelligence Profile</h1>
                        <p className="text-sm font-mono text-electricBlue mt-1">
                            {selectedEntity ? `${selectedEntity.id} (${selectedEntity.reasons?.[0] || 'Unknown'})` : 'Select an Entity'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 border font-bold rounded-md text-xs tracking-wider uppercase flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.15)] ${selectedEntity?.severity === 'High' ? 'bg-riskHigh/20 border-riskHigh/30 text-riskHigh' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                            Threat Score: {selectedEntity ? selectedEntity.score : 0}/100
                        </span>
                        <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md text-xs uppercase tracking-wider font-semibold">Cluster: Lazarus Group</span>
                    </div>
                </div>

                {/* Card 1: Details */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-xl border border-cardBorder/50">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Identity & Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Total Received</p>
                            <p className="text-lg font-mono text-zinc-100">{selectedEntity?.details?.totalReceived || "Retrieving..."}</p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Total Sent</p>
                            <p className="text-lg font-mono text-zinc-100">{selectedEntity?.details?.totalSent || "Retrieving..."}</p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Current Balance</p>
                            <p className="text-lg font-mono text-zinc-100">{selectedEntity?.details?.currentBalance || "Retrieving..."}</p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">First Seen</p>
                            <p className="text-sm font-mono text-zinc-300 mt-1">{selectedEntity?.details?.firstSeen || "Retrieving..."}</p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Last Active</p>
                            <p className="text-sm font-mono text-zinc-300 mt-1">{selectedEntity?.details?.timestamp ? new Date(selectedEntity.details.timestamp).toISOString().split('T')[0] : "Retrieving..."}</p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Known IPs</p>
                            <p className="text-sm font-mono text-zinc-300 mt-1 flex gap-2">
                                <span>{Math.floor(Math.random() * 5) + 1}</span>
                                <span className={`px-1.5 rounded text-[10px] uppercase font-bold border ${selectedEntity?.severity === 'High' ? 'bg-riskHigh/20 text-riskHigh border-riskHigh/30' : 'bg-riskMedium/20 text-riskMedium border-riskMedium/30'}`}>{selectedEntity?.severity === 'High' ? 'Tor' : 'VPN'}</span>
                            </p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Associated Hash</p>
                            <p className="text-sm font-mono text-zinc-400 break-all bg-zinc-950/50 p-2 rounded border border-cardBorder/30">
                                {selectedEntity?.details?.associatedHash || `0000000000000000000${selectedEntity?.id || 'XXX'}e4811a0c7edb2be4...`}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Card 2: Activity Timeline */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-xl border border-cardBorder/50">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 border-b border-cardBorder/50 pb-3">Temporal Activity Feed</h3>
                    <div className="relative mt-8 mb-4">
                        {/* Animated Line Base */}
                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-zinc-800 -translate-y-1/2"></div>
                        {/* Animated Line Progress */}
                        <motion.div
                            initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-electricBlue to-riskHigh -translate-y-1/2 shadow-[0_0_10px_theme('colors.electricBlue')]"
                        ></motion.div>

                        <div className="relative flex justify-between">
                            {(selectedEntity?.timeline || []).map((event, i) => (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + (i * 0.15), type: "spring" }}
                                    key={i}
                                    className="flex flex-col items-center group cursor-pointer"
                                    title={`${event.amount} BTC - ${event.type}`}
                                >
                                    <div className="mb-4 text-[10px] text-zinc-500 font-mono tracking-tighter absolute -top-8 w-20 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {new Date(event.date).toLocaleDateString()}
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border-2 border-darkBg relative z-10 transition-transform group-hover:scale-125 ${event.risk === 'High' ? 'bg-riskHigh shadow-[0_0_15px_theme("colors.riskHigh")]' : 'bg-zinc-500 group-hover:bg-electricBlue'}`}>
                                    </div>
                                    <div className="mt-4 text-[10px] text-zinc-400 font-bold uppercase w-16 text-center group-hover:text-zinc-200 transition-colors">
                                        {event.type}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Card 3: Model Analysis & Evidence Chain */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-xl border border-cardBorder/50">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Attribution & Evidence Chain</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-[11px] uppercase font-bold text-zinc-600 mb-4 bg-zinc-900/50 p-2 rounded">Algorithmic Drivers</h4>
                            <div className="space-y-4">
                                {selectedEntity && selectedEntity.features ? selectedEntity.features.map((feat, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-300">{feat.name}</span>
                                            <span className="text-electricBlue font-mono">{parseFloat(feat.value).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${feat.value}%` }} transition={{ duration: 1, delay: 0.8 + i * 0.1 }} className={`h-full ${i === 0 ? 'bg-riskHigh shadow-[0_0_10px_theme("colors.riskHigh")]' : 'bg-electricBlue shadow-[0_0_10px_theme("colors.electricBlue")]'}`}></motion.div>
                                        </div>
                                    </div>
                                )) : <div className="text-xs text-zinc-500 flex items-center justify-center py-4">Extracting dynamic features...</div>}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[11px] uppercase font-bold text-zinc-600 mb-4 bg-zinc-900/50 p-2 rounded">Forensic Flow Chart (Causal Steps)</h4>
                            <div className="flex flex-col space-y-0 relative pl-4">
                                {/* Vertical dotted line */}
                                <div className="absolute left-[27px] top-4 bottom-8 w-[2px] border-l-2 border-dashed border-zinc-700"></div>

                                {selectedEntity && selectedEntity.flow ? selectedEntity.flow.map((step, i) => (
                                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.2 }} key={i} className={`flex items-start gap-4 relative z-10 ${i === selectedEntity.flow.length - 1 ? '' : 'pb-6'}`}>
                                        <div className={`p-2 rounded-full border mt-0.5 ${i === 0 ? 'bg-zinc-900 border-zinc-700' : i === 1 ? 'bg-zinc-900 border-riskHigh/50' : 'bg-riskHigh/20 border-riskHigh'}`}>
                                            {i === 0 ? <Clock className="w-4 h-4 text-zinc-400" /> : i === 1 ? <Activity className="w-4 h-4 text-riskHigh" /> : <MapPin className={`w-4 h-4 text-riskHigh shadow-[0_0_10px_theme('colors.riskHigh')] rounded-full`} />}
                                        </div>
                                        <div>
                                            <p className={`text-xs font-mono mb-1 ${i === 0 ? 'text-electricBlue' : 'text-riskHigh'}`}>{step.time} {step.title}</p>
                                            <p className={`text-sm text-zinc-200 bg-zinc-900/50 p-2 rounded flex items-center gap-2 border border-cardBorder/30 ${i > 0 ? "shadow-[0_0_15px_rgba(225,29,72,0.1)]" : ""}`}>
                                                {step.desc}
                                                {i === 2 && <><ArrowRight className="w-3 h-3 text-zinc-500" /> Known Mixer</>}
                                            </p>
                                        </div>
                                    </motion.div>
                                )) : <div className="text-xs text-zinc-500 py-4">Generating forensic tree...</div>}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
