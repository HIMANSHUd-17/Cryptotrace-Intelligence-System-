import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getGraph } from '../api';
import { Search, X, Loader2, ArrowRight, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function GraphAnalysis() {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedNode, setSelectedNode] = useState(null);
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [hoverNode, setHoverNode] = useState(null);
    const [tick, setTick] = useState(0);

    const graphRef = useRef();
    const containerRef = useRef();
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const navigate = useNavigate();

    // ResizeObserver to ensure ForceGraph2D canvas matches exact container dimensions
    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Smooth pulse animation tick
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 50);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setLoading(true);
        const searchParams = new URLSearchParams(window.location.search);
        const queryId = searchParams.get('id');
        const targetId = queryId || 'global';

        getGraph(targetId).then(data => {
            const safeNodes = Array.isArray(data?.nodes) ? data.nodes : [];
            const safeLinks = Array.isArray(data?.links) ? data.links : (Array.isArray(data?.edges) ? data.edges : []);

            safeNodes.forEach(node => {
                node.cluster = 0;
                if (typeof node.id === 'string') {
                    if (node.id.startsWith('TX')) {
                        const lastChar = node.id.charAt(node.id.length - 1);
                        if (!isNaN(lastChar)) node.cluster = parseInt(lastChar) % 6;
                    } else if (node.id.includes('grp')) {
                        const match = node.id.match(/grp(\d+)/);
                        if (match) node.cluster = parseInt(match[1]);
                    } else if (node.type === 'IP') {
                        const parts = node.id.split('.');
                        if (parts.length === 4) node.cluster = parseInt(parts[2]);
                    }
                }
                if (!node.val) node.val = node.risk === 'High' ? 12 : node.risk === 'Medium' ? 8 : 5;
                if (!node.risk) node.risk = node.type === 'IP' ? 'Medium' : 'Low';
            });

            setGraphData({ nodes: safeNodes, links: safeLinks });
            setLoading(false);
        });
    }, []);

    // Selection & Neighborhood Calculation
    const selectAndHighlightNode = useCallback((node, dataNodes = graphData.nodes, dataLinks = graphData.links) => {
        if (!node) return;
        setSelectedNode(node);

        const neighbors = new Set();
        const links = new Set();

        dataLinks.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;

            if (String(sourceId) === String(node.id)) {
                neighbors.add(String(targetId));
                links.add(link);
            } else if (String(targetId) === String(node.id)) {
                neighbors.add(String(sourceId));
                links.add(link);
            }
        });

        neighbors.add(String(node.id));
        setHighlightNodes(neighbors);
        setHighlightLinks(links);

        // Frame target node AND all connected neighbor nodes in view
        if (graphRef.current) {
            setTimeout(() => {
                if (!graphRef.current) return;
                if (neighbors.size > 1) {
                    graphRef.current.zoomToFit(1000, 180, (n) => neighbors.has(String(n.id)));
                } else if (typeof node.x === 'number') {
                    graphRef.current.centerAt(node.x, node.y, 800);
                    graphRef.current.zoom(1.5, 800);
                }
            }, 100);
        }
    }, [graphData]);

    const handleNodeClick = useCallback((node) => {
        selectAndHighlightNode(node);
    }, [selectAndHighlightNode]);

    // Dynamic Animation Engine & Auto Centering
    useEffect(() => {
        if (!graphRef.current || graphData.nodes.length === 0) return;

        graphRef.current.d3Force('center', null);

        const clusterForce = (alpha) => {
            const time = Date.now() / 1000;
            graphData.nodes.forEach(node => {
                const cluster = node.cluster || 0;
                const baseAngle = (cluster / 6) * 2 * Math.PI;
                const spinSpeed = (cluster % 2 === 0 ? 0.15 : -0.15) * (1 + cluster * 0.1);
                const dynamicAngle = baseAngle + (time * spinSpeed);
                const breathe = Math.sin(time * (1 + cluster * 0.5)) * 50;
                const distance = 400 + breathe;

                const targetX = Math.cos(dynamicAngle) * distance;
                const targetY = Math.sin(dynamicAngle) * distance;

                node.vx += (targetX - node.x) * alpha * 0.15;
                node.vy += (targetY - node.y) * alpha * 0.15;
            });
        };

        graphRef.current.d3Force('cluster', clusterForce);
        graphRef.current.d3Force('charge').strength(-250);

        // Frame target node AND all connected neighbors after physics engine warms up
        const timer = setTimeout(() => {
            if (!graphRef.current) return;
            const searchParams = new URLSearchParams(window.location.search);
            const queryId = searchParams.get('id');

            if (queryId) {
                const targetNode = graphData.nodes.find(n => String(n.id) === String(queryId));
                if (targetNode) {
                    selectAndHighlightNode(targetNode, graphData.nodes, graphData.links);
                    return;
                }
            }
            graphRef.current.zoomToFit(1000, 120);
        }, 500);

        return () => clearTimeout(timer);
    }, [graphData, selectAndHighlightNode]);

    const handleBackgroundClick = useCallback(() => {
        setSelectedNode(null);
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
        if (graphRef.current) {
            graphRef.current.zoomToFit(1000, 120);
        }
    }, []);

    const handleExit = useCallback(() => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/investigation');
        }
    }, [navigate]);

    // Canvas Node Painter
    const paintNode = useCallback((node, ctx, globalScale) => {
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoverNode?.id === node.id;
        const isHighlighted = highlightNodes.has(String(node.id));
        const isDimmed = highlightNodes.size > 0 && !isHighlighted;

        ctx.save();
        if (isDimmed) ctx.globalAlpha = 0.15;

        const baseSize = node.val || 6;
        const radius = (isHovered || isSelected) ? baseSize * 1.4 : baseSize;

        // Base colors by entity type (will be overridden by risk)
        let color = '#8b5cf6'; // Indigo default for IP/Other
        if (node.type === 'Wallet') color = '#10b981'; // Emerald/Teal
        else if (node.type === 'Transaction') color = '#3b82f6'; // Electric Blue

        // OVERRIDE: Keep High Risk idea intact
        if (node.risk === 'High') color = '#e11d48'; // Red for High Risk
        else if (node.risk === 'Medium') color = '#d97706'; // Amber for Medium Risk

        // Outer Glow Pulse
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 3 + node.cluster) * 3;

        if (node.risk === 'High' || isSelected || isHighlighted) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 4 + pulse, 0, 2 * Math.PI);
            ctx.fillStyle = node.risk === 'High' ? 'rgba(225, 29, 72, 0.25)' : 'rgba(59, 130, 246, 0.25)';
            ctx.fill();
        }

        // Draw distinct shape by type
        ctx.beginPath();
        if (node.type === 'IP') {
            // Triangle for IPs
            const size = radius * 1.5;
            ctx.moveTo(node.x, node.y - size);
            ctx.lineTo(node.x - size, node.y + size);
            ctx.lineTo(node.x + size, node.y + size);
            ctx.closePath();
        } else if (node.type === 'Transaction') {
            // Diamond for Transactions
            const size = radius * 1.4;
            ctx.moveTo(node.x, node.y - size);
            ctx.lineTo(node.x + size, node.y);
            ctx.lineTo(node.x, node.y + size);
            ctx.lineTo(node.x - size, node.y);
            ctx.closePath();
        } else {
            // Circle for Wallets (default)
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        }

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = (isHovered || isSelected || isHighlighted) ? 15 : 8;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = isSelected ? 2.5 : isHighlighted ? 1.5 : 0.8;
        ctx.stroke();

        // Label Rendering
        if (globalScale > 0.8 || isHovered || isSelected || isHighlighted || node.risk === 'High') {
            const label = node.label || node.id;
            ctx.font = `bold ${Math.max(11 / globalScale, 9)}px monospace`;
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 4;
            ctx.fillText(label, node.x, node.y + radius + 14 / globalScale);
        }

        ctx.restore();
    }, [selectedNode, hoverNode, highlightNodes]);

    const activeNodeCount = useMemo(() => graphData.nodes.length, [graphData.nodes]);
    const hopCount = useMemo(() => Math.max(0, highlightNodes.size - 1), [highlightNodes]);

    return (
        <div className="flex h-full w-full bg-slate-50 text-slate-700 relative overflow-hidden">
            {/* Anchored Exit Button in Top-Right Corner */}
            <button
                onClick={handleExit}
                title="Exit Graph View"
                className="fixed top-6 right-6 z-50 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 px-4 py-2.5 rounded-full border border-slate-200 shadow-xl backdrop-blur-md transition-all cursor-pointer hover:scale-105 flex items-center justify-center gap-2 group"
            >
                <X className="w-4 h-4 text-slate-400 group-hover:text-slate-900" />
                <span className="text-sm font-bold uppercase tracking-wider hidden md:inline">Exit Graph</span>
            </button>

            {/* Left Sidebar - Fixed Clean Width & Formatting */}
            <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-72 shrink-0 border-r border-slate-200 bg-white/90 backdrop-blur-xl flex flex-col z-20 shadow-2xl h-full overflow-hidden"
            >
                <div className="p-5 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-electricBlue/10 border border-electricBlue/20 shrink-0">
                            <Network className="w-5 h-5 text-electricBlue" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Topology Map</h2>
                            <p className="text-[11px] text-slate-500 font-mono">Dynamic Multi-Hop Graph</p>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center text-sm whitespace-nowrap">
                            <span className="text-slate-500 font-medium">Sub-Graph Scope</span>
                            <span className="font-mono text-electricBlue font-bold bg-electricBlue/10 px-2.5 py-0.5 rounded border border-electricBlue/20">
                                {activeNodeCount} Nodes
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm whitespace-nowrap">
                            <span className="text-slate-500 font-medium">Topological Edges</span>
                            <span className="font-mono text-slate-600 font-bold bg-slate-200/50 px-2.5 py-0.5 rounded border border-slate-300">
                                {graphData.links.length} Links
                            </span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                        <p className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-4">Risk Distribution</p>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm whitespace-nowrap">
                                <span className="flex items-center gap-2 text-slate-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-riskHigh shadow-[0_0_8px_theme('colors.riskHigh')]"></span> High Risk
                                </span>
                                <span className="font-mono text-slate-800 font-bold">{graphData.nodes.filter(n => n.risk === 'High').length}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm whitespace-nowrap">
                                <span className="flex items-center gap-2 text-slate-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-riskMedium shadow-[0_0_8px_theme('colors.riskMedium')]"></span> Medium Risk
                                </span>
                                <span className="font-mono text-slate-800 font-bold">{graphData.nodes.filter(n => n.risk === 'Medium').length}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm whitespace-nowrap">
                                <span className="flex items-center gap-2 text-slate-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-riskLow shadow-[0_0_8px_theme('colors.riskLow')]"></span> Low Risk
                                </span>
                                <span className="font-mono text-slate-800 font-bold">{graphData.nodes.filter(n => n.risk === 'Low').length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 flex flex-col gap-3">
                        <button
                            onClick={() => window.location.href = '/graph'}
                            className="w-full py-2.5 rounded-lg border border-electricBlue/50 hover:bg-electricBlue/10 text-electricBlue text-xs uppercase font-bold tracking-widest transition-all cursor-pointer flex justify-center items-center gap-2"
                        >
                            <Network className="w-3.5 h-3.5" /> View Global Network
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="w-full py-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 text-xs uppercase font-bold tracking-widest transition-all cursor-pointer"
                        >
                            Back to Investigation
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Graph Canvas Container */}
            <div ref={containerRef} className="flex-1 relative h-full w-full overflow-hidden bg-slate-50">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

                {loading && (
                    <div className="absolute inset-0 flex flex-col justify-center items-center text-slate-500 z-10 bg-white/60 backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-electricBlue" />
                        <p className="tracking-widest uppercase text-sm font-semibold">Tracing Blockchain Subgraphs...</p>
                    </div>
                )}

                <ForceGraph2D
                    ref={graphRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={graphData}
                    nodeCanvasObject={paintNode}
                    nodeRelSize={5}
                    linkColor={link => {
                        const isHighlighted = highlightLinks.has(link);
                        const isDimmed = highlightLinks.size > 0 && !isHighlighted;
                        return isHighlighted ? '#3b82f6' : isDimmed ? 'rgba(0, 0, 0, 0.04)' : 'rgba(59, 130, 246, 0.35)'; // brighter blue on default state
                    }}
                    linkWidth={link => {
                        return highlightLinks.has(link) ? 3.5 : 1.5;
                    }}
                    linkDirectionalArrowLength={7}
                    linkDirectionalArrowRelPos={1}
                    linkDirectionalParticles={link => {
                        const isDimmed = highlightLinks.size > 0 && !highlightLinks.has(link);
                        return isDimmed ? 0 : 1; // Limit to a single slow packet per edge
                    }}
                    linkDirectionalParticleWidth={link => highlightLinks.has(link) ? 3 : 2}
                    linkDirectionalParticleSpeed={0.0015} // Drastically reduced speed to a slow data pulse
                    linkDirectionalParticleColor={() => '#3b82f6'}
                    linkCurvature={0}
                    onNodeClick={handleNodeClick}
                    onNodeHover={node => setHoverNode(node)}
                    onBackgroundClick={handleBackgroundClick}
                    backgroundColor="transparent"
                />

                {/* Floating Top Search Bar */}
                <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
                    <div className="px-4 py-2 rounded-full flex items-center gap-3 w-[400px] shadow-lg border border-slate-200 bg-white/95 backdrop-blur-md">
                        <Search className="w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search entity in graph..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent focus:outline-none text-slate-800 text-sm flex-1 font-mono placeholder:font-sans placeholder-slate-400"
                        />
                        {search && <X className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => { setSearch(''); setSelectedNode(null); }} />}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {search && (
                        <div className="mt-2 w-[400px] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl max-h-[250px] overflow-y-auto">
                            {graphData.nodes
                                .filter(n => String(n.id).toLowerCase().includes(search.toLowerCase()) || (n.label && String(n.label).toLowerCase().includes(search.toLowerCase())))
                                .slice(0, 10).map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => {
                                            setSearch(n.id);
                                            handleNodeClick(n);
                                        }}
                                        className="px-4 py-2.5 hover:bg-electricBlue/10 cursor-pointer border-b border-cardBorder/50 last:border-0 flex justify-between items-center group transition-colors"
                                    >
                                        <span className="text-xs font-mono text-zinc-300 group-hover:text-electricBlue transition-colors">{n.id}</span>
                                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${n.risk === 'High' ? 'bg-riskHigh/20 text-riskHigh' : n.risk === 'Medium' ? 'bg-riskMedium/20 text-riskMedium' : 'bg-riskLow/20 text-riskLow'}`}>
                                            {n.risk} Node
                                        </span>
                                    </div>
                                ))}
                            {graphData.nodes.filter(n => String(n.id).toLowerCase().includes(search.toLowerCase()) || (n.label && String(n.label).toLowerCase().includes(search.toLowerCase()))).length === 0 && (
                                <div className="px-5 py-4 text-xs text-center text-slate-500">No nodes found in current subgraph.</div>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* Bottom Legend */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white/90 shadow-lg border border-slate-200 px-6 py-2.5 rounded-full flex items-center gap-5 backdrop-blur-md whitespace-nowrap">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type:</span>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-slate-600 bg-slate-50"></div><span className="text-[11px] text-slate-700 uppercase tracking-widest font-semibold">Wallet</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 border-2 border-slate-600 bg-slate-50 rotate-45"></div><span className="text-[11px] text-slate-700 uppercase tracking-widest font-semibold">TX</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-slate-600"></div><span className="text-[11px] text-slate-700 uppercase tracking-widest font-semibold">IP</span></div>

                    <div className="w-px h-4 bg-slate-300 mx-1"></div>

                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk:</span>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#e11d48]"></div><span className="text-[11px] text-riskHigh font-bold uppercase tracking-widest">High</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#d97706]"></div><span className="text-[11px] text-riskMedium font-bold uppercase tracking-widest">Med</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div><span className="text-[11px] text-slate-600 font-bold uppercase tracking-widest">Low</span></div>
                </div>

                {/* Floating Details Panel */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div
                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-20 right-6 w-72 bg-white/95 backdrop-blur-xl shadow-2xl p-5 rounded-2xl border border-slate-200 z-20"
                        >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-electricBlue/20 blur-2xl rounded-full pointer-events-none"></div>

                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entity Profile</h3>
                                    <div className="font-mono text-sm text-slate-800 break-all">{selectedNode.label || selectedNode.id}</div>
                                </div>
                                <button onClick={() => window.location.href = '/graph'} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                                    <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Node Type</span>
                                    <span className="font-mono text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded text-xs border border-slate-200">
                                        {selectedNode.type.toUpperCase()}
                                    </span>
                                </div>
                                {selectedNode.amount && (
                                    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                                        <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Amount</span>
                                        <span className="font-mono text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded text-xs border border-slate-200">
                                            {selectedNode.amount} BTC
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                                    <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Connections</span>
                                    <span className="font-mono text-electricBlue bg-electricBlue/10 px-2.5 py-0.5 rounded text-[11px] border border-electricBlue/20">
                                        In: {(graphData.links || []).filter(l => l.target === selectedNode || l.target.id === selectedNode.id).length} &middot; Out: {(graphData.links || []).filter(l => l.source === selectedNode || l.source.id === selectedNode.id).length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm pb-1">
                                    <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Threat Risk</span>
                                    <span className={`font-mono text-[11px] font-bold px-2.5 py-0.5 rounded border ${selectedNode.risk === 'High' ? 'bg-riskHigh/10 text-riskHigh border-riskHigh/20' : selectedNode.risk === 'Medium' ? 'bg-riskMedium/10 text-riskMedium border-riskMedium/20' : 'bg-riskLow/10 text-riskLow border-riskLow/20'}`}>
                                        {selectedNode.risk} ({selectedNode.val * 20})
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/investigation?id=${selectedNode.id}`)}
                                className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-electricBlue hover:bg-blue-600 text-white rounded-lg text-xs uppercase font-bold tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] cursor-pointer"
                            >
                                Deep Investigation <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
}
