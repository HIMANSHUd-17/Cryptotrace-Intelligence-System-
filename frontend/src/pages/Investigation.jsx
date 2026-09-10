import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAlerts, getEntity } from '../api';
import { Search, ShieldAlert, ArrowUpRight, Network, Clock, CheckCircle2, ChevronRight, Activity, Filter } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const TargetRow = React.memo(({ item, isSelected, onSelect }) => (
    <div
        onClick={() => onSelect(item)}
        className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${isSelected
            ? 'bg-gradient-to-r from-electricBlue/30 via-blue-600/20 to-indigo-600/10 border-electricBlue shadow-[0_0_20px_rgba(59,130,246,0.35)] ring-1 ring-electricBlue/60'
            : 'bg-zinc-900/40 border-cardBorder/50 hover:bg-zinc-800/40 hover:border-zinc-700'
            }`}
    >
        {/* Active Selection Indicator Pill */}
        {isSelected && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-electricBlue rounded-r-full shadow-[0_0_12px_#3b82f6]"></div>
        )}

        <div className="flex flex-col gap-1 min-w-0 pr-2 pl-2">
            <span className={`text-xs font-mono font-extrabold truncate ${isSelected ? 'text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'text-zinc-200'}`}>
                {item.id}
            </span>
            <div className="flex items-center gap-2">
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${item.type === 'TX' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                    item.type === 'IP' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                    {item.type || 'TX'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">3:26:17 AM</span>
                {isSelected && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-electricBlue bg-electricBlue/20 px-1.5 py-0.5 rounded border border-electricBlue/40">
                        Selected
                    </span>
                )}
            </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${item.risk === 'High' ? 'bg-riskHigh shadow-[0_0_10px_theme("colors.riskHigh")]' : item.risk === 'Medium' ? 'bg-riskMedium' : 'bg-riskLow'}`} />
            <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-electricBlue translate-x-0.5 font-bold' : 'text-zinc-600'}`} />
        </div>
    </div>
));

export default function Investigation() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryId = searchParams.get('id');

    const [alerts, setAlerts] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAlerts().then(data => {
            const safeAlerts = Array.isArray(data) ? data : [];
            setAlerts(safeAlerts);

            if (queryId) {
                const match = safeAlerts.find(a => String(a.id).toLowerCase() === String(queryId).toLowerCase());
                if (match) {
                    setSelectedEntity(match);
                    setLoading(false);
                    return;
                }
            }

            if (safeAlerts.length > 0 && !selectedEntity) {
                setSelectedEntity(safeAlerts[0]);
            }
            setLoading(false);
        });
    }, [queryId]);

    const handleSelectEntity = useCallback((entity) => {
        setSelectedEntity(entity);
        setLoading(true);
        getEntity(entity.id).then(res => {
            if (res && typeof res === 'object') {
                setSelectedEntity(prev => ({
                    ...entity,
                    ...res,
                    id: entity.id
                }));
            }
            setLoading(false);
        });
    }, []);

    const filteredAlerts = useMemo(() => {
        if (!Array.isArray(alerts)) return [];
        if (!search.trim()) return alerts;
        const q = search.toLowerCase();
        return alerts.filter(a =>
            String(a.id).toLowerCase().includes(q) ||
            String(a.type || '').toLowerCase().includes(q)
        );
    }, [alerts, search]);

    return (
        <div className="flex flex-col lg:flex-row h-full w-full bg-darkBg text-zinc-300 overflow-hidden">
            {/* Left Sidebar Column (Fixed Top Header + Scrollable Target List) */}
            <div className="w-full lg:w-[28%] border-r border-cardBorder/50 bg-cardBg/30 flex flex-col h-full min-h-0 shrink-0 overflow-hidden">
                {/* Search Bar Header - Fixed at Top */}
                <div className="p-4 border-b border-cardBorder/50 bg-darkBg/60 backdrop-blur-md shrink-0 space-y-3">
                    <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Investigation Target</h2>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search Address, TXID, IP..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-zinc-900/90 border border-cardBorder rounded-lg pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-electricBlue transition-colors shadow-inner"
                        />
                    </div>
                </div>

                {/* List Header - Fixed */}
                <div className="px-4 py-2.5 bg-zinc-900/40 border-b border-cardBorder/50 flex justify-between items-center shrink-0">
                    <h3 className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">Available Target IDs</h3>
                    <span className="text-[10px] text-electricBlue font-mono font-bold bg-electricBlue/10 px-2 py-0.5 rounded border border-electricBlue/20">
                        {filteredAlerts.length} total
                    </span>
                </div>

                {/* Target List Items - ONLY THIS SCROLLS */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                    {filteredAlerts.length > 0 ? (
                        filteredAlerts.map(item => (
                            <TargetRow
                                key={item.id}
                                item={item}
                                isSelected={selectedEntity && String(selectedEntity.id).toLowerCase() === String(item.id).toLowerCase()}
                                onSelect={handleSelectEntity}
                            />
                        ))
                    ) : (
                        <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                            No targets found matching search criteria.
                        </div>
                    )}
                </div>
            </div>

            {/* Right Main Intelligence Panel */}
            <div className="flex-1 h-full min-h-0 overflow-y-auto bg-darkBg/95 p-6 space-y-6 custom-scrollbar">
                {/* Header Banner */}
                <div className="flex justify-between items-center bg-cardBg/40 border border-cardBorder p-5 rounded-xl backdrop-blur-md">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-white tracking-tight">Entity Intelligence Profile</h2>
                            {selectedEntity?.risk === 'High' && (
                                <span className="bg-riskHigh/10 border border-riskHigh/30 text-riskHigh text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wider flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" /> High Threat
                                </span>
                            )}
                        </div>
                        <p className="text-xs font-mono text-electricBlue">
                            {selectedEntity ? selectedEntity.id : 'Select a target from the list'}
                            <span className="text-zinc-500 text-[11px] font-sans ml-2">(Automated ML Anomaly Flag)</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-zinc-900/80 px-3.5 py-2 rounded-lg border border-cardBorder">
                            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Threat Score:</span>
                            <span className={`font-mono text-sm font-bold ${selectedEntity?.risk === 'High' ? 'text-riskHigh' : 'text-riskMedium'}`}>
                                {selectedEntity ? (selectedEntity.risk === 'High' ? '100/100' : '65/100') : 'N/A'}
                            </span>
                        </div>

                        {selectedEntity && (
                            <button
                                onClick={() => navigate(`/graph?id=${selectedEntity.id}`)}
                                className="flex items-center gap-2 bg-electricBlue hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs uppercase font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] cursor-pointer"
                            >
                                <Network className="w-4 h-4" /> Go to Graph
                            </button>
                        )}
                    </div>
                </div>

                {/* Identity & Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-5 rounded-xl border border-cardBorder space-y-4">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-cardBorder/50 pb-2">Identity & Metrics</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[10px] text-zinc-500 uppercase">Total Received</span>
                                <p className="text-sm font-mono font-bold text-white mt-0.5">{selectedEntity?.details?.totalReceived || 'Unknown'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-500 uppercase">Total Sent</span>
                                <p className="text-sm font-mono font-bold text-white mt-0.5">{selectedEntity?.details?.totalSent || 'Unknown'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-500 uppercase">Current Balance</span>
                                <p className="text-sm font-mono font-bold text-white mt-0.5">{selectedEntity?.details?.currentBalance || '0.00 BTC'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-500 uppercase">First Seen</span>
                                <p className="text-sm font-mono text-white mt-0.5">{selectedEntity?.details?.firstSeen || 'Unknown'}</p>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-cardBorder/30 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400">Associated IP</span>
                                <span className="font-mono text-electricBlue">185.220.101.19</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400">Country / ASN</span>
                                <span className="font-mono text-zinc-300">AS1017 (Synthetic Host)</span>
                            </div>
                            <div className="mt-3">
                                <span className="text-[10px] text-zinc-500 uppercase">Associated Hash</span>
                                <p className="text-[11px] font-mono text-zinc-400 bg-zinc-900/60 p-2 rounded border border-white/5 break-all mt-1">
                                    {selectedEntity?.id}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Temporal Activity Feed */}
                    <div className="glass-panel p-5 rounded-xl border border-cardBorder flex flex-col">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-cardBorder/50 pb-2 mb-4">Temporal Activity Feed</h3>
                        <div className="flex-1 flex flex-col justify-center space-y-6">
                            <div className="relative flex justify-between items-center">
                                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-electricBlue/30 -z-0"></div>
                                <div className="z-10 flex flex-col items-center gap-1">
                                    <div className="w-4 h-4 rounded-full bg-riskHigh shadow-[0_0_10px_rgba(225,29,72,0.8)] border-2 border-darkBg"></div>
                                    <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold mt-1">Ingress</span>
                                </div>
                                <div className="z-10 flex flex-col items-center gap-1">
                                    <div className="w-4 h-4 rounded-full bg-riskHigh shadow-[0_0_10px_rgba(225,29,72,0.8)] border-2 border-darkBg"></div>
                                    <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold mt-1">Correlation</span>
                                </div>
                                <div className="z-10 flex flex-col items-center gap-1">
                                    <div className="w-4 h-4 rounded-full bg-riskHigh shadow-[0_0_10px_rgba(225,29,72,0.8)] border-2 border-darkBg"></div>
                                    <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold mt-1">GNN Predict</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attribution & Evidence Chain */}
                <div className="glass-panel p-5 rounded-xl border border-cardBorder space-y-4">
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-cardBorder/50 pb-2">Attribution & Evidence Chain</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-[11px] uppercase font-bold text-zinc-400 mb-4 bg-zinc-900/50 p-2 rounded border border-white/5">Algorithmic Risk Drivers</h4>
                            <div className="space-y-4">
                                {selectedEntity && selectedEntity.features && selectedEntity.features.length > 0 ? selectedEntity.features.map((feat, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-300 font-semibold">{feat.name}</span>
                                            <span className="text-electricBlue font-mono">{parseFloat(feat.value).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                style={{ width: `${feat.value}%` }}
                                                className={`h-full ${i === 0 ? 'bg-riskHigh shadow-[0_0_10px_rgba(225,29,72,0.8)]' : 'bg-electricBlue shadow-[0_0_10px_rgba(59,130,246,0.8)]'}`}
                                            ></div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs"><span className="text-zinc-300">GNN Neighborhood Risk</span><span className="text-electricBlue font-mono">82.5%</span></div>
                                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden"><div style={{ width: '82.5%' }} className="h-full bg-riskHigh shadow-[0_0_10px_rgba(225,29,72,0.8)]"></div></div>
                                        <div className="flex justify-between text-xs"><span className="text-zinc-300">XGBoost Tabular Anomaly</span><span className="text-electricBlue font-mono">68.0%</span></div>
                                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden"><div style={{ width: '68%' }} className="h-full bg-electricBlue shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[11px] uppercase font-bold text-zinc-400 mb-4 bg-zinc-900/50 p-2 rounded border border-white/5">Forensic Causal Flow</h4>
                            <div className="flex flex-col space-y-4 relative pl-2">
                                <div className="flex items-start gap-3 bg-zinc-900/40 p-3 rounded-lg border border-white/5">
                                    <Clock className="w-4 h-4 text-electricBlue shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold text-zinc-200">High Volume Velocity Trigger</p>
                                        <p className="text-[11px] text-zinc-500 mt-0.5">Burst of 14 rapid output transactions within 12 seconds</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-zinc-900/40 p-3 rounded-lg border border-white/5">
                                    <Activity className="w-4 h-4 text-riskHigh shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold text-zinc-200">Topological Mixing Pattern</p>
                                        <p className="text-[11px] text-zinc-500 mt-0.5">Edge embeddings link to known high-risk cluster (Peel Chain)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
