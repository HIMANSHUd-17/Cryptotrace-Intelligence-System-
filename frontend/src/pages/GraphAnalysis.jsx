import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getGraph } from '../api';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
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
    const graphRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        import('../api').then(({ getAlerts, getGraph }) => {
            getAlerts().then(alerts => {
                const searchParams = new URLSearchParams(window.location.search);
                const queryId = searchParams.get('id');
                const targetId = queryId || 'global';

                getGraph(targetId).then(data => {
                    setGraphData(data);
                    setLoading(false);
                    if (graphRef.current) {
                        setTimeout(() => graphRef.current.zoomToFit(400, 50), 100);
                    }
                });
            });
        });
    }, []);

    const updateHighlight = () => {
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());

        if (selectedNode) {
            const hNodes = new Set([selectedNode.id]);
            const hLinks = new Set();
            graphData.links.forEach(link => {
                const s = typeof link.source === 'object' ? link.source.id : link.source;
                const t = typeof link.target === 'object' ? link.target.id : link.target;
                if (s === selectedNode.id || t === selectedNode.id) {
                    hLinks.add(link);
                    hNodes.add(s);
                    hNodes.add(t);
                }
            });
            setHighlightNodes(hNodes);
            setHighlightLinks(hLinks);
        } else if (hoverNode) {
            const hNodes = new Set([hoverNode.id]);
            const hLinks = new Set();
            graphData.links.forEach(link => {
                const s = typeof link.source === 'object' ? link.source.id : link.source;
                const t = typeof link.target === 'object' ? link.target.id : link.target;
                if (s === hoverNode.id || t === hoverNode.id) {
                    hLinks.add(link);
                    hNodes.add(s);
                    hNodes.add(t);
                }
            });
            setHighlightNodes(hNodes);
            setHighlightLinks(hLinks);
        }
    };

    useEffect(() => {
        updateHighlight();
    }, [selectedNode, hoverNode]);

    const handleNodeClick = useCallback(node => {
        setSelectedNode(node);
        if (graphRef.current) {
            graphRef.current.centerAt(node.x, node.y, 1000);
            graphRef.current.zoom(8, 1000);
        }
    }, [graphRef]);

    const paintNode = useCallback((node, ctx, globalScale) => {
        const isDimmed = (selectedNode || hoverNode) && !highlightNodes.has(node.id);
        const isHighRisk = node.risk === 'High';
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoverNode?.id === node.id;

        // Base sizing
        const baseSize = node.val * 0.8;
        const size = (isSelected || isHovered) ? baseSize * 1.3 : baseSize;

        // Brand Colors
        let themeColor = '#059669'; // Safe/Low - Emerald
        if (node.risk === 'High') themeColor = '#e11d48'; // High - Rose
        else if (node.risk === 'Medium') themeColor = '#d97706'; // Medium - Amber

        ctx.beginPath();
        // We will render all entities as polished orbs for a premium constellation network feel
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);

        if (isDimmed) {
            ctx.fillStyle = 'rgba(30, 30, 30, 0.5)';
            ctx.shadowBlur = 0;
            ctx.fill();
            ctx.strokeStyle = 'rgba(100, 100, 100, 0.1)';
            ctx.lineWidth = 0.2 / globalScale;
            ctx.stroke();
        } else {
            // Neon Tinted Glass Fill
            ctx.fillStyle = isSelected
                ? 'rgba(59, 130, 246, 0.3)' // Electric Blue for selection
                : `${themeColor}33`; // 20% opacity hex tint

            // Intense Outer Glow
            ctx.shadowColor = isSelected ? '#3b82f6' : themeColor;
            ctx.shadowBlur = isHighRisk || isSelected ? 20 : 10;
            ctx.fill();

            // Crisp Cyber Border
            ctx.shadowBlur = 0;
            ctx.strokeStyle = isSelected ? '#fff' : themeColor;
            ctx.lineWidth = isSelected ? (2 / globalScale) : (1 / globalScale);
            ctx.stroke();

            // Bright Inner Core (The "Node Energy")
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * 0.25, 0, 2 * Math.PI, false);
            ctx.fillStyle = isSelected ? '#fff' : themeColor;
            ctx.fill();

            // Outer Ring for specific types (e.g. TX vs Wallet)
            if (node.type === 'TX') {
                ctx.beginPath();
                ctx.arc(node.x, node.y, size + (3 / globalScale), 0, 2 * Math.PI, false);
                ctx.setLineDash([4 / globalScale, 4 / globalScale]);
                ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.4)' : `${themeColor}66`;
                ctx.lineWidth = 0.5 / globalScale;
                ctx.stroke();
                ctx.setLineDash([]); // reset
            }
        }

        // Add ID label for non-dimmed nodes if scaled up
        if (!isDimmed && globalScale >= 2.5) {
            ctx.font = `600 ${4 / globalScale}px ui-sans-serif, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = isSelected ? '#fff' : 'rgba(255, 255, 255, 0.9)';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4 / globalScale;

            const labelText = node.label || node.id;
            ctx.fillText(labelText, node.x, node.y + size + (4 / globalScale));
            ctx.shadowBlur = 0; // reset
        }

    }, [selectedNode, hoverNode, highlightNodes]);

    return (
        <div className="relative h-full w-full bg-darkBg overflow-hidden">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-darkBg/60 pointer-events-none"></div>

            {loading && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-zinc-500 z-10 bg-darkBg/80 backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-electricBlue" />
                    <p className="tracking-widest uppercase text-xs font-semibold">Tracing Blockchain Subgraphs...</p>
                </div>
            )}

            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeCanvasObject={paintNode}
                nodeRelSize={4}
                linkColor={(link) => {
                    const isDimmed = (selectedNode || hoverNode) && !highlightLinks.has(link);
                    return isDimmed ? 'rgba(255, 255, 255, 0.02)' :
                        highlightLinks.has(link) ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 255, 255, 0.1)';
                }}
                linkWidth={(link) => highlightLinks.has(link) ? 2 : 1}
                linkDirectionalParticles={(link) => highlightLinks.has(link) ? 4 : 0}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleColor={() => 'rgba(59, 130, 246, 0.8)'}
                onNodeClick={handleNodeClick}
                onNodeHover={node => setHoverNode(node)}
                onBackgroundClick={() => setSelectedNode(null)}
                backgroundColor="transparent"
            />

            {/* Floating Top Search Bar */}
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
                <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-3 w-[450px]">
                    <Search className="w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search entity in graph..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-transparent focus:outline-none text-zinc-200 text-sm flex-1 font-mono placeholder:font-sans placeholder-zinc-500"
                    />
                    {search && <X className="w-4 h-4 text-zinc-400 cursor-pointer hover:text-white transition-colors" onClick={() => { setSearch(''); setSelectedNode(null); }} />}
                </div>

                {/* Autocomplete Dropdown */}
                {search && (
                    <div className="mt-2 w-[450px] bg-darkBg/95 backdrop-blur-xl border border-cardBorder rounded-xl shadow-2xl max-h-[300px] overflow-y-auto">
                        {graphData.nodes
                            .filter(n => String(n.id).includes(search) || (n.label && String(n.label).includes(search)))
                            .slice(0, 10).map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => {
                                        setSearch(n.id);
                                        handleNodeClick(n);
                                    }}
                                    className="px-5 py-3 hover:bg-electricBlue/10 cursor-pointer border-b border-cardBorder/50 last:border-0 flex justify-between items-center group transition-colors"
                                >
                                    <span className="text-sm font-mono text-zinc-300 group-hover:text-electricBlue transition-colors">{n.id}</span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${n.risk === 'High' ? 'bg-riskHigh/20 text-riskHigh' : n.risk === 'Medium' ? 'bg-riskMedium/20 text-riskMedium' : 'bg-riskLow/20 text-riskLow'}`}>
                                        {n.risk} Node
                                    </span>
                                </div>
                            ))}
                        {graphData.nodes.filter(n => String(n.id).includes(search) || (n.label && String(n.label).includes(search))).length === 0 && (
                            <div className="px-5 py-4 text-xs text-center text-zinc-500">No nodes found in current subgraph.</div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Bottom Legend */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-6 left-6 z-20 glass-panel px-4 py-3 rounded-lg flex items-center gap-6">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-zinc-400"></div><span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">Wallet</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-zinc-400"></div><span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">TX</span></div>
                <div className="flex items-center gap-2"><div className="border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-zinc-400"></div><span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">IP</span></div>
                <div className="w-px h-6 bg-cardBorder mx-2"></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-riskHigh shadow-[0_0_8px_theme('colors.riskHigh')]"></span><span className="text-xs text-zinc-300">High Risk</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-riskMedium"></span><span className="text-xs text-zinc-300">Medium Risk</span></div>
            </motion.div>

            {/* Floating Details Panel */}
            <AnimatePresence>
                {selectedNode && (
                    <motion.div
                        initial={{ opacity: 0, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-24 right-6 w-80 glass-panel p-5 rounded-xl border border-cardBorder shadow-2xl z-20"
                    >
                        <div className="flex justify-between items-start mb-4 border-b border-cardBorder/50 pb-4">
                            <div>
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest leading-none mb-2">Entity Profile</h3>
                                <p className="text-sm font-mono text-white break-all leading-tight">{selectedNode.label || selectedNode.id}</p>
                            </div>
                            <button onClick={() => setSelectedNode(null)} className="text-zinc-500 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between">
                                <span className="text-xs text-zinc-400">Type</span>
                                <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-semibold tracking-wider font-mono uppercase">{selectedNode.type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-zinc-400">Threat Risk</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${selectedNode.risk === 'High' ? 'bg-riskHigh/20 text-riskHigh border border-riskHigh/30 shadow-[0_0_10px_rgba(225,29,72,0.15)]' : selectedNode.risk === 'Medium' ? 'bg-riskMedium/20 text-riskMedium border border-riskMedium/30' : 'bg-riskLow/20 text-riskLow border border-riskLow/30'}`}>
                                    {selectedNode.risk} ({selectedNode.val * 20} Score)
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-zinc-400">Connections</span>
                                <span className="text-xs text-white font-mono">{highlightLinks.size} Hops</span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/investigation?id=${selectedNode.id}`)}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-electricBlue/10 hover:bg-electricBlue border border-electricBlue text-electricBlue hover:text-white rounded-md text-sm font-medium transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]"
                        >
                            Full Investigation <ArrowRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
