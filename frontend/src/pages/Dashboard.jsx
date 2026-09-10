import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, ShieldAlert, Cpu, Network, Zap, Search, Filter, X, CheckCircle2, ArrowRight, Upload } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getAlerts, getSystemStats, API_BASE } from '../api';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }
};

// React.memo memoized table row component to eliminate unnecessary re-renders
const AlertRow = React.memo(({ alert: a, isSelected, onSelect }) => {
    return (
        <tr
            onClick={() => onSelect(a)}
            className={`hover:bg-white/5 cursor-pointer transition-colors ${isSelected ? 'bg-electricBlue/10 border-l-2 border-l-electricBlue group' : 'border-l-2 border-l-transparent'}`}
        >
            <td className="px-6 py-4 font-bold text-zinc-500">#{a.rank}</td>
            <td className="px-6 py-4 font-mono text-xs text-electricBlue/90 break-all">{a.entity}</td>
            <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${a.type === 'IP' ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' : a.type === 'Wallet' ? 'bg-purple-900/40 text-purple-400 border border-purple-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                    {a.type}
                </span>
            </td>
            <td className="px-6 py-4 text-right font-mono font-bold text-white">
                <div className="flex items-center justify-end gap-3">
                    <span>{a.score}</span>
                    <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${a.score >= 90 ? 'bg-riskHigh shadow-[0_0_8px_theme("colors.riskHigh")]' : a.score > 60 ? 'bg-riskMedium' : 'bg-riskLow'}`} style={{ width: `${a.score}%` }}></div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-center font-mono text-zinc-400 text-xs">{a.confidence}%</td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${a.severity === 'High' ? 'bg-riskHigh animate-pulse shadow-[0_0_8px_theme("colors.riskHigh")]' : a.severity === 'Medium' ? 'bg-riskMedium' : 'bg-riskLow'}`}></span>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${a.severity === 'High' ? 'text-zinc-200' : 'text-zinc-500'}`}>{a.severity}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider border ${a.status === 'New' || a.status === 'New Correlation' ? 'border-riskMedium/30 text-riskMedium bg-riskMedium/10' : a.status === 'Reviewing' ? 'border-electricBlue/30 text-electricBlue bg-electricBlue/10' : 'border-zinc-700 text-zinc-500 bg-zinc-800'}`}>{a.status}</span>
            </td>
        </tr>
    );
});

export default function Dashboard() {
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState(null);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [filterType, setFilterType] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Parallel data loading
        Promise.all([getAlerts(), getSystemStats()]).then(([alertsData, statsData]) => {
            setAlerts(Array.isArray(alertsData) ? alertsData : []);
            setStats(statsData);
        });
    }, []);

    const safeAlerts = useMemo(() => Array.isArray(alerts) ? alerts : [], [alerts]);

    // Fast memoized filtering logic
    const filteredAlerts = useMemo(() => {
        return safeAlerts.filter(a => {
            const matchesType = filterType === 'All'
                || a.type === filterType
                || (filterType === 'High' && a.severity === 'High')
                || (filterType === 'Medium' && a.severity === 'Medium')
                || (filterType === 'Safe' && a.severity === 'Low');
            const matchesSearch = a.entity?.toLowerCase().includes(searchQuery.toLowerCase()) || String(a.id).includes(searchQuery);
            return matchesType && matchesSearch;
        });
    }, [safeAlerts, filterType, searchQuery]);

    const handleUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        let dataType = 'blockchain';
        if (file.name.toLowerCase().includes('network') || file.name.toLowerCase().includes('ip')) {
            dataType = 'network';
        }
        formData.append('data_type', dataType);

        try {
            await fetch(`${API_BASE}/ingest`, {
                method: 'POST',
                body: formData
            });
            const { clearCache } = await import('../api');
            clearCache();
            const [freshAlerts, freshStats] = await Promise.all([getAlerts(), getSystemStats()]);
            setAlerts(Array.isArray(freshAlerts) ? freshAlerts : []);
            setStats(freshStats);
            alert(`Successfully ingested ${file.name} as ${dataType} data.`);
        } catch (error) {
            alert('Failed to upload file.');
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    }, []);

    const handleSelectAlert = useCallback((alertItem) => {
        setSelectedAlert(alertItem);
    }, []);

    const illicitCount = useMemo(() => safeAlerts.filter(a => a.severity === 'High').length, [safeAlerts]);

    const displayStats = useMemo(() => stats ? [
        { label: 'Total Nodes', value: stats.totalScanned, icon: Activity, color: 'text-electricBlue' },
        { label: 'Illicit Entities', value: illicitCount, icon: ShieldAlert, color: 'text-riskHigh', isAlert: true },
        { label: 'Licit Entities', value: Math.max(0, (stats.licit || 0) - illicitCount), icon: Network, color: 'text-riskMedium' },
        { label: 'Unknown Classes', value: stats.unknown || 0, icon: Zap, color: 'text-zinc-400' },
        { label: 'Graph Links Discovered', value: stats.edges || 0, icon: Cpu, color: 'text-zinc-400' },
    ] : [], [stats, illicitCount]);

    const riskDistribution = useMemo(() => [
        { name: 'High', value: illicitCount, color: '#e11d48' },
        { name: 'Medium', value: safeAlerts.filter(a => a.severity === 'Medium').length, color: '#d97706' },
        { name: 'Low', value: safeAlerts.filter(a => a.severity === 'Low').length, color: '#059669' }
    ], [illicitCount, safeAlerts]);

    return (
        <div className="flex h-full relative overflow-hidden bg-transparent">
            {/* Main scrollable area */}
            <div className={`flex-1 p-6 space-y-6 overflow-y-auto transition-all duration-500 ease-in-out ${selectedAlert ? 'mr-[420px]' : ''}`}>
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {displayStats.map((stat, i) => (
                        <motion.div variants={itemVariants} key={i} className={`glass-panel p-5 rounded-2xl flex flex-col gap-2 group cursor-default transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 ${stat.isAlert ? 'border-riskHigh/30 shadow-[0_0_15px_rgba(225,29,72,0.1)] hover:shadow-[0_0_20px_rgba(225,29,72,0.2)]' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div className={`p-2 rounded-lg bg-zinc-900/80 border border-white/5`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color} ${stat.isAlert ? 'drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]' : ''}`} />
                                </div>
                            </div>
                            <div className="mt-2">
                                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                                <p className={`text-3xl font-bold tracking-tight mt-1 ${stat.isAlert ? 'text-riskHigh drop-shadow-[0_0_8px_rgba(225,29,72,0.5)]' : 'text-zinc-100'}`}>{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Charts Panel */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl lg:col-span-1 flex flex-col h-[400px]">
                        <h3 className="text-xs font-bold text-zinc-500 mb-6 uppercase tracking-widest">Risk Distribution</h3>
                        <div className="flex-1 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={riskDistribution} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                        {riskDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 0px 8px ${entry.color}80)` }} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <span className="block text-2xl font-bold text-white tracking-tighter">{safeAlerts.length}</span>
                                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between text-[11px] mt-6 font-semibold text-zinc-400 tracking-wider">
                            <button onClick={() => setFilterType(filterType === 'High' ? 'All' : 'High')} className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${filterType === 'High' ? 'bg-riskHigh/20 text-white border border-riskHigh/40' : 'hover:text-white'}`}>
                                <span className="w-2 h-2 rounded-full bg-riskHigh shadow-[0_0_8px_theme('colors.riskHigh')] block"></span> HIGH
                            </button>
                            <button onClick={() => setFilterType(filterType === 'Medium' ? 'All' : 'Medium')} className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${filterType === 'Medium' ? 'bg-riskMedium/20 text-white border border-riskMedium/40' : 'hover:text-white'}`}>
                                <span className="w-2 h-2 rounded-full bg-riskMedium block"></span> MED
                            </button>
                            <button onClick={() => setFilterType(filterType === 'Safe' ? 'All' : 'Safe')} className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${filterType === 'Safe' ? 'bg-riskLow/20 text-white border border-riskLow/40' : 'hover:text-white'}`}>
                                <span className="w-2 h-2 rounded-full bg-riskLow block"></span> SAFE
                            </button>
                        </div>
                    </motion.div>

                    {/* Table Panel */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-panel rounded-2xl lg:col-span-3 flex flex-col h-[400px]">
                        <div className="p-5 border-b border-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/30 rounded-t-2xl">
                            <h2 className="text-sm font-bold tracking-widest text-zinc-200 uppercase flex items-center gap-2">
                                <Activity className="w-4 h-4 text-electricBlue" /> Ranked Alerts
                            </h2>

                            <div className="flex flex-wrap items-center gap-3">
                                <div>
                                    <input
                                        type="file"
                                        id="upload-data"
                                        className="hidden"
                                        onChange={handleUpload}
                                        accept=".csv,.json,.xml"
                                    />
                                    <label
                                        htmlFor="upload-data"
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-all ${isUploading ? 'bg-zinc-800 text-zinc-500' : 'bg-electricBlue hover:bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]'}`}
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        {isUploading ? 'Ingesting...' : 'Upload Data'}
                                    </label>
                                </div>
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                                    <input
                                        type="text"
                                        placeholder="Search entity..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 pr-8 py-1.5 text-xs border border-cardBorder rounded-lg w-52 bg-zinc-900/50 focus:outline-none focus:border-electricBlue focus:ring-1 focus:ring-electricBlue transition-colors text-white placeholder-zinc-500 font-mono"
                                    />
                                    {searchQuery && (
                                        <X className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-2.5 cursor-pointer hover:text-white transition-colors" onClick={() => setSearchQuery('')} />
                                    )}
                                </div>

                                {/* Filter Button Bar & Dropdown */}
                                <div className="flex items-center gap-1 bg-zinc-900/80 p-1 border border-cardBorder rounded-lg">
                                    <Filter className="w-3.5 h-3.5 text-zinc-500 ml-1" />
                                    {['All', 'TX', 'IP', 'Wallet'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setFilterType(t)}
                                            className={`px-2.5 py-1 rounded text-xs font-semibold uppercase transition-all ${filterType === t ? 'bg-electricBlue text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-zinc-900/50 text-zinc-500 font-bold border-b border-cardBorder text-[10px] uppercase tracking-widest sticky top-0 backdrop-blur-md z-10">
                                    <tr>
                                        <th className="px-6 py-4">Rank</th>
                                        <th className="px-6 py-4">Entity ID</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4 text-right">Threat Score</th>
                                        <th className="px-6 py-4 text-center">Confidence</th>
                                        <th className="px-6 py-4">Severity</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cardBorder">
                                    {filteredAlerts.map(a => (
                                        <AlertRow
                                            key={a.id}
                                            alert={a}
                                            isSelected={selectedAlert?.id === a.id}
                                            onSelect={handleSelectAlert}
                                        />
                                    ))}
                                    {filteredAlerts.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="text-center py-12 text-zinc-500 font-mono text-xs uppercase tracking-widest">
                                                No matching alerts found for filter: <span className="text-electricBlue font-bold">{filterType}</span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Slide-over Investigation Panel */}
            <AnimatePresence>
                {selectedAlert && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-[73px] bottom-0 w-[420px] bg-darkBg/95 backdrop-blur-xl border-l border-cardBorder flex flex-col z-40 shadow-2xl"
                    >
                        {/* Permanently Anchored Sticky Close Bar */}
                        <div className="p-5 border-b border-cardBorder flex justify-between items-start bg-zinc-900/80 sticky top-0 z-50 backdrop-blur-md">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-riskHigh opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-riskHigh shadow-[0_0_10px_theme('colors.riskHigh')]"></span>
                                    </span>
                                    <h3 className="font-bold text-white tracking-wide">Primary Target Profile</h3>
                                </div>
                                <p className="text-xs text-electricBlue font-mono bg-electricBlue/10 px-2 py-1 rounded border border-electricBlue/20 inline-block break-all">{selectedAlert.entity}</p>
                            </div>

                            {/* Permanently Visible & Anchored Close Button */}
                            <button
                                onClick={() => setSelectedAlert(null)}
                                title="Close Panel"
                                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors border border-cardBorder shadow-md cursor-pointer shrink-0 ml-4"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Giant Risk Score */}
                            <div className="flex flex-col items-center justify-center p-8 border border-cardBorder rounded-2xl bg-zinc-900/30 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-riskHigh/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3 z-10">Threat Quotient</p>
                                <div className={`text-6xl font-bold tracking-tighter z-10 drop-shadow-[0_0_15px_rgba(225,29,72,0.4)] ${selectedAlert.severity === 'High' ? 'text-riskHigh' : selectedAlert.severity === 'Medium' ? 'text-riskMedium' : 'text-riskLow'}`}>
                                    {selectedAlert.score}
                                </div>
                                <p className="text-xs text-zinc-400 mt-3 font-mono z-10 bg-zinc-950/80 px-3 py-1 rounded-full border border-cardBorder">CONFIDENCE: <span className="text-white">{selectedAlert.confidence}%</span></p>
                            </div>

                            {/* Why Flagged Checklist */}
                            <div>
                                <h4 className="text-[10px] font-bold uppercase text-zinc-500 mb-4 tracking-widest">Why Flagged?</h4>
                                <div className="space-y-3">
                                    {(selectedAlert.reasons || []).map((reason, idx) => (
                                        <div key={idx} className="flex gap-3 items-start bg-zinc-900/40 p-3 rounded-lg border border-white/5">
                                            <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${selectedAlert.severity === 'High' ? 'text-riskHigh drop-shadow-[0_0_5px_theme("colors.riskHigh")]' : 'text-riskMedium'}`} />
                                            <span className="text-xs text-zinc-300 leading-relaxed">{reason}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Feature Contributions bar chart */}
                            <div>
                                <h4 className="text-[10px] font-bold uppercase text-zinc-500 mb-4 tracking-widest">Model Feature Attributions</h4>
                                <div className="space-y-4 bg-zinc-900/40 p-4 rounded-xl border border-white/5">
                                    {(selectedAlert.features || []).map((f, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-zinc-400 uppercase font-semibold tracking-wider text-[9px]">{f.name}</span>
                                                <span className="font-bold text-electricBlue font-mono">{f.value}%</span>
                                            </div>
                                            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    style={{ width: `${f.value}%` }}
                                                    className="h-full rounded-full bg-electricBlue shadow-[0_0_8px_theme('colors.electricBlue')]"
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-cardBorder bg-zinc-900/80 space-y-3 backdrop-blur-lg">
                            <button
                                onClick={() => navigate(`/investigation?id=${selectedAlert.id}`)}
                                className="w-full py-3 rounded-xl bg-electricBlue hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] flex items-center justify-center gap-3"
                            >
                                Deep Investigation <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigate(`/graph?id=${selectedAlert.id}`)}
                                className="w-full py-3 rounded-xl border border-cardBorder hover:bg-zinc-800 hover:border-zinc-600 text-zinc-300 font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-3"
                            >
                                View Network Graph
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
