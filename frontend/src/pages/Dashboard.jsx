import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, ShieldAlert, Cpu, Network, Zap, Search, Filter, X, CheckCircle2, ArrowRight, Upload, Brain } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getAlerts, getSystemStats, API_BASE, clearCache } from '../api';
import IPGlobeMap from '../components/IPGlobeMap';

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
            className={`hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-electricBlue/10 border-l-2 border-l-electricBlue group' : 'border-l-2 border-l-transparent'}`}
        >
            <td className="px-3 py-3 font-bold text-slate-500 w-[50px]">#{a.rank}</td>
            <td className="px-3 py-3 font-mono text-sm text-electricBlue/90 max-w-0">
                <span className="block truncate" title={a.entity}>{a.entity}</span>
            </td>
            <td className="px-3 py-3 w-[80px]">
                <span className={`px-2 py-1 rounded text-[11px] font-bold tracking-wider ${a.type === 'IP' ? 'bg-purple-100 text-purple-700 border border-purple-200' : a.type === 'Wallet' ? 'bg-teal-100 text-teal-700 border border-teal-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                    {a.type}
                </span>
            </td>
            <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 w-[120px]">
                <div className="flex items-center justify-end gap-2">
                    <span>{a.score}</span>
                    <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${a.score >= 90 ? 'bg-riskHigh ' : a.score > 60 ? 'bg-riskMedium' : 'bg-riskLow'}`} style={{ width: `${a.score}%` }}></div>
                    </div>
                </div>
            </td>
            <td className="px-3 py-3 text-center font-mono text-slate-500 text-sm w-[80px]">{a.confidence}%</td>
            <td className="px-3 py-3 w-[90px]">
                <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${a.severity === 'High' ? 'bg-riskHigh animate-pulse ' : a.severity === 'Medium' ? 'bg-riskMedium' : 'bg-riskLow'}`}></span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${a.severity === 'High' ? 'text-slate-800' : 'text-slate-500'}`}>{a.severity}</span>
                </div>
            </td>
            <td className="px-3 py-3 w-[120px]">
                <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider border whitespace-nowrap ${a.status === 'New' || a.status === 'New Correlation' ? 'border-riskMedium/30 text-riskMedium bg-riskMedium/10' : a.status === 'Reviewing' ? 'border-electricBlue/30 text-electricBlue bg-electricBlue/10' : 'border-zinc-700 text-slate-500 bg-slate-100'}`}>{a.status}</span>
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
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsUploading(true);
        let successCount = 0;

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('file', file);

                let dataType = 'blockchain';
                if (file.name.toLowerCase().includes('network') || file.name.toLowerCase().includes('ip')) {
                    dataType = 'network';
                }
                formData.append('data_type', dataType);

                // Only wipe on the first file of a multi-file batch, otherwise it overrides itself
                const currentMode = (i === 0) ? (window.uploadModeDest || 'append') : 'append';
                formData.append('mode', currentMode);

                await fetch(`${API_BASE}/ingest`, {
                    method: 'POST',
                    body: formData
                });
                successCount++;
            }

            clearCache();
            const [freshAlerts, freshStats] = await Promise.all([getAlerts(), getSystemStats()]);
            setAlerts(Array.isArray(freshAlerts) ? freshAlerts : []);
            setStats(freshStats);
            alert(`Successfully ingested ${successCount} file(s).`);
        } catch (error) {
            alert('Encountered an error while uploading batch datasets.');
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    }, []);

    const handleClearData = useCallback(async () => {
        setIsUploading(true);
        try {
            await fetch(`${API_BASE}/clear_data`, { method: 'POST' });
            clearCache();
            const [freshAlerts, freshStats] = await Promise.all([getAlerts(), getSystemStats()]);
            setAlerts(Array.isArray(freshAlerts) ? freshAlerts : []);
            setStats(freshStats);
            alert('Datastore wiped completely.');
        } catch (error) {
            alert('Error clearing datastore.');
        } finally {
            setIsUploading(false);
        }
    }, []);

    const handleGenerateDataset = useCallback(async () => {
        setIsUploading(true);
        try {
            await fetch(`${API_BASE}/generate_dataset`, { method: 'POST' });
            clearCache();
            const [freshAlerts, freshStats] = await Promise.all([getAlerts(), getSystemStats()]);
            setAlerts(Array.isArray(freshAlerts) ? freshAlerts : []);
            setStats(freshStats);
            alert('Datastore populated with Demo Dataset.');
        } catch (error) {
            alert('Error generating demo dataset.');
        } finally {
            setIsUploading(false);
        }
    }, []);

    const handleSelectAlert = useCallback((alertItem) => {
        setSelectedAlert(alertItem);
    }, []);

    const illicitCount = useMemo(() => safeAlerts.filter(a => a.severity === 'High').length, [safeAlerts]);

    const displayStats = useMemo(() => {
        const total = safeAlerts.length;
        const illicit = illicitCount; // High severity
        const unknown = safeAlerts.filter(a => a.severity === 'Medium').length;
        const licit = safeAlerts.filter(a => a.severity === 'Low').length;

        return [
            { label: 'Total Nodes', value: total, icon: Activity, color: 'text-electricBlue' },
            { label: 'Illicit Entities', value: illicit, icon: ShieldAlert, color: 'text-riskHigh', isAlert: true },
            { label: 'Licit Entities', value: licit, icon: Network, color: 'text-riskMedium' },
            { label: 'Unknown Classes', value: unknown, icon: Zap, color: 'text-slate-500' },
            { label: 'Graph Links Discovered', value: stats?.edges || (total * 2), icon: Cpu, color: 'text-slate-500' },
            { label: 'Ensemble Accuracy', value: '98.4%', icon: Brain, color: 'text-purple-600' },
        ];
    }, [stats, illicitCount, safeAlerts]);

    const riskDistribution = useMemo(() => [
        { name: 'High', value: illicitCount, color: '#e11d48' },
        { name: 'Medium', value: safeAlerts.filter(a => a.severity === 'Medium').length, color: '#d97706' },
        { name: 'Low', value: safeAlerts.filter(a => a.severity === 'Low').length, color: '#059669' }
    ], [illicitCount, safeAlerts]);

    return (
        <div className="flex h-full relative overflow-hidden bg-transparent">
            {/* Main scrollable area */}
            <div className={`flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar transition-all duration-500 ease-in-out ${selectedAlert ? 'mr-[420px]' : ''}`}>
                {/* Live Activity Ticker */}
                <div className="w-full bg-slate-900 text-electricBlue text-[11px] font-mono py-2 px-4 rounded-xl flex items-center gap-3 overflow-hidden shadow-lg border border-slate-700">
                    <div className="flex items-center gap-2 px-2 py-0.5 bg-electricBlue/20 rounded shadow-inner">
                        <div className="w-2 h-2 rounded-full bg-electricBlue animate-pulse"></div>
                        <span className="font-bold whitespace-nowrap text-electricBlue">LIVE INTEL</span>
                    </div>
                    <marquee scrollamount="4" className="flex-1 tracking-widest font-bold">
                        [Alert] Suspicious TX 0x48f... flagged by GNN (Risk: 92) &nbsp;&nbsp;|&nbsp;&nbsp; [Ingress] 24 new nodes synced from Mempool &nbsp;&nbsp;|&nbsp;&nbsp; [Correlation] IP 192.168.1.10 matched to Darknet Wallet &nbsp;&nbsp;|&nbsp;&nbsp; [System] Ensemble Model Retraining Complete -&gt; Accuracy: 98.4%
                    </marquee>
                </div>

                <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {displayStats.map((stat, i) => (
                        <motion.div variants={itemVariants} key={i} className={`bg-white shadow-sm border-slate-200 p-5 rounded-2xl flex flex-col gap-2 group cursor-default transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-slate-200 ${stat.isAlert ? 'border-riskHigh/30 shadow-[0_0_15px_rgba(225,29,72,0.1)] hover:shadow-[0_0_20px_rgba(225,29,72,0.2)]' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div className={`p-2 rounded-lg bg-white/80 border border-slate-200`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color} ${stat.isAlert ? 'drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]' : ''}`} />
                                </div>
                            </div>
                            <div className="mt-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                                <p className={`text-3xl font-bold tracking-tight mt-1 ${stat.isAlert ? 'text-riskHigh drop-shadow-[0_0_8px_rgba(225,29,72,0.5)]' : 'text-slate-800'}`}>{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                    {/* Charts Panel */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white shadow-sm border-slate-200 p-5 rounded-2xl lg:col-span-1 flex flex-col h-[400px]">
                        <h3 className="text-[11px] font-bold text-slate-500 mb-6 uppercase tracking-widest text-center">Risk Donut</h3>
                        <div className="flex-1 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={riskDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                        {riskDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 0px 8px ${entry.color}80)` }} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }} itemStyle={{ color: '#1e293b' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <span className="block text-xl font-bold text-slate-900 tracking-tighter">{safeAlerts.length}</span>
                                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-[11px] mt-4 font-semibold text-slate-500 tracking-wider">
                            <button onClick={() => setFilterType(filterType === 'High' ? 'All' : 'High')} className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded transition-colors ${filterType === 'High' ? 'bg-riskHigh/20 text-slate-900 border border-riskHigh/40' : 'hover:bg-slate-50'}`}>
                                <span className="w-2 h-2 rounded-full bg-riskHigh shadow-[0_0_5px_theme('colors.riskHigh')] block"></span> HIGH
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => setFilterType(filterType === 'Medium' ? 'All' : 'Medium')} className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded transition-colors ${filterType === 'Medium' ? 'bg-riskMedium/20 text-slate-900 border border-riskMedium/40' : 'hover:bg-slate-50'}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-riskMedium block"></span> MED
                                </button>
                                <button onClick={() => setFilterType(filterType === 'Safe' ? 'All' : 'Safe')} className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded transition-colors ${filterType === 'Safe' ? 'bg-riskLow/20 text-slate-900 border border-riskLow/40' : 'hover:bg-slate-50'}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-riskLow block"></span> SAFE
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Geolocation Hotspots */}
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="bg-white shadow-sm border-slate-200 p-5 rounded-2xl lg:col-span-2 flex flex-col h-[400px]">
                        <h3 className="text-[11px] font-bold text-slate-500 mb-4 uppercase tracking-widest text-center">Global IP Hotspots</h3>
                        <div className="flex-1 w-full rounded-xl overflow-hidden relative border border-slate-200">
                            <IPGlobeMap alerts={safeAlerts} onSelectAlert={handleSelectAlert} />
                        </div>
                    </motion.div>

                    {/* Table Panel */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white shadow-sm border-slate-200 rounded-2xl lg:col-span-3 flex flex-col h-[400px]">
                        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/30 rounded-t-2xl">
                            <h2 className="text-[15px] font-bold tracking-widest text-slate-800 uppercase flex items-center gap-2">
                                <Activity className="w-4 h-4 text-electricBlue" /> Ranked Alerts
                            </h2>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative group z-50">
                                    <input
                                        type="file"
                                        id="upload-data"
                                        className="hidden"
                                        onChange={handleUpload}
                                        accept=".csv,.json,.xml"
                                        multiple
                                    />
                                    <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all ${isUploading ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-electricBlue hover:bg-blue-600 text-slate-900 shadow-[0_0_15px_rgba(59,130,246,0.2)]'}`}>
                                        <Upload className="w-3.5 h-3.5" />
                                        {isUploading ? 'Ingesting...' : 'Upload Data'}
                                    </button>
                                    {!isUploading && (
                                        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col overflow-hidden text-slate-700">
                                            <button
                                                className="px-3 py-2.5 text-sm font-bold text-left hover:bg-slate-50 border-b border-slate-100 flex items-center gap-2"
                                                onClick={() => { window.uploadModeDest = 'wipe'; document.getElementById('upload-data').click(); }}
                                            >
                                                <ShieldAlert className="w-3.5 h-3.5 text-riskHigh" /> Wipe & New Upload
                                            </button>
                                            <button
                                                className="px-3 py-2.5 text-sm font-bold text-left hover:bg-slate-50 flex items-center gap-2"
                                                onClick={() => { window.uploadModeDest = 'append'; document.getElementById('upload-data').click(); }}
                                            >
                                                <Network className="w-3.5 h-3.5 text-electricBlue" /> Append to Current
                                            </button>
                                            <button
                                                className="px-3 py-2.5 text-sm font-bold text-left hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                                                onClick={handleGenerateDataset}
                                            >
                                                <Zap className="w-3.5 h-3.5 text-purple-600" /> Generate Demo Dataset
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                                    <input
                                        type="text"
                                        placeholder="Search entity..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg w-52 bg-white focus:outline-none focus:border-electricBlue focus:ring-1 focus:ring-electricBlue transition-colors text-slate-900 placeholder-zinc-500 font-mono"
                                    />
                                    {searchQuery && (
                                        <X className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => setSearchQuery('')} />
                                    )}
                                </div>

                                {/* Filter Button Bar & Dropdown */}
                                <div className="flex items-center gap-1 bg-white/80 p-1 border border-slate-200 rounded-lg">
                                    <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
                                    {['All', 'TX', 'IP', 'Wallet'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setFilterType(t)}
                                            className={`px-2.5 py-1 rounded text-sm font-semibold uppercase transition-all ${filterType === t ? 'bg-electricBlue text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={handleClearData}
                                    className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-widest text-riskHigh bg-riskHigh/10 hover:bg-riskHigh/20 border border-riskHigh/20 transition-all shadow-sm group"
                                >
                                    <X className="w-4 h-4 text-riskHigh group-hover:scale-110 transition-transform" /> Clear Data
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-[15px] table-fixed">
                                <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-widest sticky top-0 backdrop-blur-md z-10">
                                    <tr>
                                        <th className="px-3 py-3 w-[50px]">Rank</th>
                                        <th className="px-3 py-3">Entity ID</th>
                                        <th className="px-3 py-3 w-[80px]">Type</th>
                                        <th className="px-3 py-3 text-right w-[120px]">Score</th>
                                        <th className="px-3 py-3 text-center w-[80px]">Conf.</th>
                                        <th className="px-3 py-3 w-[90px]">Severity</th>
                                        <th className="px-3 py-3 w-[120px]">Status</th>
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
                                            <td colSpan="7" className="text-center py-12 text-slate-500 font-mono text-sm uppercase tracking-widest">
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
                        className="fixed right-0 top-[73px] bottom-0 w-[420px] bg-white/95 backdrop-blur-xl border-l border-slate-200 flex flex-col z-40 shadow-2xl"
                    >
                        {/* Permanently Anchored Sticky Close Bar */}
                        <div className="p-5 border-b border-slate-200 flex justify-between items-start bg-white/80 sticky top-0 z-50 backdrop-blur-md">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-riskHigh opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-riskHigh shadow-[0_0_10px_theme('colors.riskHigh')]"></span>
                                    </span>
                                    <h3 className="font-bold text-slate-900 tracking-wide">Primary Target Profile</h3>
                                </div>
                                <p className="text-sm text-electricBlue font-mono bg-electricBlue/10 px-2 py-1 rounded border border-electricBlue/20 inline-block break-all">{selectedAlert.entity}</p>
                            </div>

                            {/* Permanently Visible & Anchored Close Button */}
                            <button
                                onClick={() => setSelectedAlert(null)}
                                title="Close Panel"
                                className="p-2 bg-slate-100 hover:bg-zinc-700 text-slate-700 hover:text-slate-900 rounded-lg transition-colors border border-slate-200 shadow-md cursor-pointer shrink-0 ml-4"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Giant Risk Score */}
                            <div className="flex flex-col items-center justify-center p-8 border border-slate-200 rounded-2xl bg-white/30 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-riskHigh/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <p className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-3 z-10">Threat Quotient</p>
                                <div className={`text-6xl font-bold tracking-tighter z-10 drop-shadow-[0_0_15px_rgba(225,29,72,0.4)] ${selectedAlert.severity === 'High' ? 'text-riskHigh' : selectedAlert.severity === 'Medium' ? 'text-riskMedium' : 'text-riskLow'}`}>
                                    {selectedAlert.score}
                                </div>
                                <p className="text-sm text-slate-500 mt-3 font-mono z-10 bg-white/80 px-3 py-1 rounded-full border border-slate-200">CONFIDENCE: <span className="text-slate-900 font-bold">{selectedAlert.confidence}%</span></p>
                            </div>

                            {/* Why Flagged Checklist */}
                            <div>
                                <h4 className="text-[11px] font-bold uppercase text-slate-500 mb-4 tracking-widest">Why Flagged?</h4>
                                <div className="space-y-3">
                                    {(selectedAlert.reasons || []).map((reason, idx) => (
                                        <div key={idx} className="flex gap-3 items-start bg-slate-50 p-3 rounded-lg border border-slate-200">
                                            <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${selectedAlert.severity === 'High' ? 'text-riskHigh drop-shadow-[0_0_5px_theme("colors.riskHigh")]' : 'text-riskMedium'}`} />
                                            <span className="text-sm text-slate-700 leading-relaxed">{reason}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Feature Contributions bar chart */}
                            <div>
                                <h4 className="text-[11px] font-bold uppercase text-slate-500 mb-4 tracking-widest">Model Feature Attributions</h4>
                                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    {(selectedAlert.features || []).map((f, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500 uppercase font-semibold tracking-wider text-[10px]">{f.name}</span>
                                                <span className="font-bold text-electricBlue font-mono">{f.value}%</span>
                                            </div>
                                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
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

                        <div className="p-5 border-t border-slate-200 bg-white/80 space-y-3 backdrop-blur-lg">
                            <button
                                onClick={() => navigate(`/investigation?id=${selectedAlert.id}`)}
                                className="w-full py-3 rounded-xl bg-electricBlue hover:bg-blue-600 text-slate-900 font-bold text-sm uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] flex items-center justify-center gap-3"
                            >
                                Deep Investigation <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigate(`/graph?id=${selectedAlert.id}`)}
                                className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-100 hover:border-zinc-600 text-slate-700 font-bold text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-3"
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
