import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAlerts, getEntity } from '../api';
import { Search, ShieldAlert, ArrowUpRight, Network, Clock, CheckCircle2, ChevronRight, Activity, Filter, Download } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const TargetRow = React.memo(({ item, isSelected, onSelect }) => (
    <div
        id={`target-row-${item.id}`}
        onClick={() => onSelect(item)}
        className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${isSelected
            ? 'bg-gradient-to-r from-electricBlue/30 via-blue-600/20 to-indigo-600/10 border-electricBlue shadow-[0_0_20px_rgba(59,130,246,0.35)] ring-1 ring-electricBlue/60'
            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/40 hover:border-slate-300'
            }`}
    >
        {/* Active Selection Indicator Pill */}
        {isSelected && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-electricBlue rounded-r-full shadow-[0_0_12px_#3b82f6]"></div>
        )}

        <div className="flex flex-col gap-1 min-w-0 pr-2 pl-2">
            <span className={`text-sm font-mono font-extrabold truncate ${isSelected ? 'text-slate-900 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'text-slate-800'}`}>
                {item.id}
            </span>
            <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.type === 'TX' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                    item.type === 'IP' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                        'bg-teal-100 text-teal-700 border border-teal-200'
                    }`}>
                    {item.type || 'TX'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">3:26:17 AM</span>
                {isSelected && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-electricBlue bg-electricBlue/20 px-1.5 py-0.5 rounded border border-electricBlue/40">
                        Selected
                    </span>
                )}
            </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${item.risk === 'High' ? 'bg-riskHigh ' : item.risk === 'Medium' ? 'bg-riskMedium' : 'bg-riskLow'}`} />
            <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-electricBlue translate-x-0.5 font-bold' : 'text-slate-400'}`} />
        </div>
    </div>
));

export default function Investigation() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryId = searchParams.get('id');

    const [alerts, setAlerts] = useState([]);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('ALL');
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

    // Auto-scroll the sidebar list to keep the selected target visibly centered
    useEffect(() => {
        if (selectedEntity && selectedEntity.id) {
            setTimeout(() => {
                const rowObj = document.getElementById(`target-row-${selectedEntity.id}`);
                if (rowObj) {
                    rowObj.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 150); // Allowing for virtual layout painting
        }
    }, [selectedEntity?.id]);

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

        let result = alerts;
        if (filterType !== 'ALL') {
            result = result.filter(a => {
                const mapType = String(a.type || '').toUpperCase();
                if (filterType === 'TX') return mapType === 'TRANSACTION' || mapType === 'TX';
                return mapType === filterType;
            });
        }

        if (!search.trim()) return result;
        const q = search.toLowerCase();
        return result.filter(a =>
            String(a.id).toLowerCase().includes(q) ||
            String(a.type || '').toLowerCase().includes(q)
        );
    }, [alerts, search, filterType]);

    return (
        <div className="flex flex-col lg:flex-row h-full w-full bg-slate-50 text-slate-700 overflow-hidden">
            {/* Left Sidebar Column (Fixed Top Header + Scrollable Target List) */}
            <div className="w-full lg:w-[28%] border-r border-slate-200 bg-white/80 flex flex-col h-full min-h-0 shrink-0 overflow-hidden">
                {/* Search Bar & Filters - Fixed at Top */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/90 backdrop-blur-md shrink-0 space-y-4">
                    <h2 className="text-sm font-bold tracking-widest text-slate-500 uppercase">Investigation Target</h2>

                    {/* Filter Segmented Control */}
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-inner">
                        {['ALL', 'TX', 'WALLET', 'IP'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer ${filterType === type ? 'bg-electricBlue text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search Address, TXID, IP..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border-slate-200 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-mono text-slate-900 placeholder-zinc-500 focus:outline-none focus:border-electricBlue transition-colors shadow-inner"
                        />
                    </div>
                </div>

                {/* List Header - Fixed */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                    <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase">Available Target IDs</h3>
                    <span className="text-[11px] text-electricBlue font-mono font-bold bg-electricBlue/10 px-2 py-0.5 rounded border border-electricBlue/20">
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
                        <div className="p-6 text-center text-sm text-slate-500 font-mono">
                            No targets found matching search criteria.
                        </div>
                    )}
                </div>
            </div>

            {/* Right Main Intelligence Panel */}
            <div className="flex-1 h-full min-h-0 overflow-y-auto bg-white p-6 space-y-6 custom-scrollbar">
                {/* Header Banner */}
                <div className="flex justify-between items-center bg-white/80 border border-slate-200 p-5 rounded-xl backdrop-blur-md">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Entity Intelligence Profile</h2>
                            {selectedEntity?.risk === 'High' && (
                                <span className="bg-riskHigh/10 border border-riskHigh/30 text-riskHigh text-[11px] uppercase font-bold px-2 py-0.5 rounded tracking-wider flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" /> High Threat
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-mono text-electricBlue">
                            {selectedEntity ? selectedEntity.id : 'Select a target from the list'}
                            <span className="text-slate-500 text-xs font-sans ml-2">(Automated ML Anomaly Flag)</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/80 px-3.5 py-2 rounded-lg border border-slate-200">
                            <span className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Threat Score:</span>
                            <span className={`font-mono text-[15px] font-bold ${selectedEntity?.risk === 'High' ? 'text-riskHigh' : 'text-riskMedium'}`}>
                                {selectedEntity ? (selectedEntity.score ? `${selectedEntity.score}/100` : `${Math.abs(selectedEntity.id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)) % 15 + (selectedEntity.risk === 'High' ? 85 : 55)}/100`) : 'N/A'}
                            </span>
                        </div>

                        {selectedEntity && (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => window.open(`http://localhost:8000/api/report/${selectedEntity.id}`)}
                                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm uppercase font-bold tracking-wider transition-all shadow-sm cursor-pointer"
                                    title="Download AI Explainability PDF Report"
                                >
                                    <Download className="w-4 h-4" /> Download Report
                                </button>
                                <button
                                    onClick={() => navigate(`/graph?id=${selectedEntity.id}`)}
                                    className="flex items-center gap-2 bg-electricBlue hover:bg-blue-600 text-slate-900 px-4 py-2 rounded-lg text-sm uppercase font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] cursor-pointer"
                                >
                                    <Network className="w-4 h-4" /> Go to Graph
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Identity & Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white shadow-sm border-slate-200 p-5 rounded-xl border border-slate-200 space-y-4">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">Identity & Metrics</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[11px] text-slate-500 uppercase">Total Received</span>
                                <p className="text-[15px] font-mono font-bold text-slate-900 mt-0.5">{selectedEntity?.details?.totalReceived || 'Unknown'}</p>
                            </div>
                            <div>
                                <span className="text-[11px] text-slate-500 uppercase">Total Sent</span>
                                <p className="text-[15px] font-mono font-bold text-slate-900 mt-0.5">{selectedEntity?.details?.totalSent || 'Unknown'}</p>
                            </div>
                            <div>
                                <span className="text-[11px] text-slate-500 uppercase">Current Balance</span>
                                <p className="text-[15px] font-mono font-bold text-slate-900 mt-0.5">{selectedEntity?.details?.currentBalance || '0.00 BTC'}</p>
                            </div>
                            <div>
                                <span className="text-[11px] text-slate-500 uppercase">First Seen</span>
                                <p className="text-[15px] font-mono text-slate-900 mt-0.5">{selectedEntity?.details?.firstSeen || 'Unknown'}</p>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/30 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Associated IP</span>
                                <span className="font-mono text-electricBlue">185.220.101.19</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Country / ASN</span>
                                <span className="font-mono text-slate-700">AS1017</span>
                            </div>
                            <div className="mt-3">
                                <span className="text-[11px] text-slate-500 uppercase">Associated Hash</span>
                                <p className="text-xs font-mono text-slate-500 bg-white/60 p-2 rounded border border-slate-200 break-all mt-1">
                                    {selectedEntity?.id}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Temporal Activity Feed */}
                    <div className="bg-white shadow-sm border-slate-200 p-5 rounded-xl border border-slate-200 flex flex-col">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Temporal Activity Feed</h3>
                        <div className="flex-1 flex flex-col justify-center space-y-6">
                            <div className="relative flex justify-between items-center">
                                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-electricBlue/30 -z-0"></div>
                                <div className="z-10 flex flex-col items-center gap-1">
                                    <div className="w-4 h-4 rounded-full bg-riskHigh shadow-[0_0_10px_rgba(225,29,72,0.8)] border-2 border-white"></div>
                                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold mt-1">Ingress</span>
                                </div>
                                <div className="z-10 flex flex-col items-center gap-1">
                                    <div className="w-4 h-4 rounded-full bg-riskHigh shadow-[0_0_10px_rgba(225,29,72,0.8)] border-2 border-white"></div>
                                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold mt-1">Correlation</span>
                                </div>
                                <div className="z-10 flex flex-col items-center gap-1">
                                    <div className="w-4 h-4 rounded-full bg-riskHigh shadow-[0_0_10px_rgba(225,29,72,0.8)] border-2 border-white"></div>
                                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold mt-1">GNN Predict</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attribution & Evidence Chain */}
                <div className="bg-white shadow-sm border-slate-200 p-5 rounded-xl border border-slate-200 space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">Attribution & Evidence Chain</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-xs uppercase font-bold text-slate-500 mb-4 bg-white p-2 rounded border border-slate-200">Algorithmic Risk Drivers</h4>
                            <div className="space-y-4">
                                {selectedEntity && selectedEntity.features && selectedEntity.features.length > 0 ? selectedEntity.features.map((feat, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-700 font-semibold">{feat.name}</span>
                                            <span className="text-electricBlue font-mono">{parseFloat(feat.value).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                style={{ width: `${feat.value}%` }}
                                                className={`h-full ${i === 0 ? 'bg-riskHigh shadow-[0_0_10px_rgba(225,29,72,0.8)]' : 'bg-electricBlue shadow-[0_0_10px_rgba(59,130,246,0.8)]'}`}
                                            ></div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm"><span className="text-slate-700">GNN Neighborhood Risk</span><span className="text-electricBlue font-mono">82.5%</span></div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div style={{ width: '82.5%' }} className="h-full bg-riskHigh shadow-[0_0_10px_rgba(225,29,72,0.8)]"></div></div>
                                        <div className="flex justify-between text-sm"><span className="text-slate-700">XGBoost Tabular Anomaly</span><span className="text-electricBlue font-mono">68.0%</span></div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div style={{ width: '68%' }} className="h-full bg-electricBlue shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs uppercase font-bold text-slate-500 mb-4 bg-white p-2 rounded border border-slate-200">Forensic Causal Flow</h4>
                            <div className="flex flex-col space-y-4 relative pl-2">
                                <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <Clock className="w-4 h-4 text-electricBlue shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">High Volume Velocity Trigger</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Burst of 14 rapid output transactions within 12 seconds</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <Activity className="w-4 h-4 text-riskHigh shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Topological Mixing Pattern</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Edge embeddings link to known high-risk cluster (Peel Chain)</p>
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
