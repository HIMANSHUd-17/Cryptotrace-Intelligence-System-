import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getGraph } from '../api';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function GraphAnalysis() {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [hoverNode, setHoverNode] = useState(null);
    const graphRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        getGraph('mock-id').then(data => {
            setGraphData(data);
            setLoading(false);
            if (graphRef.current) {
                setTimeout(() => graphRef.current.zoomToFit(400, 50), 100);
            }
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

        ctx.beginPath();
        const size = node.val * 1.5;

        if (node.type === 'Wallet') {
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        } else if (node.type === 'TX') {
            ctx.rect(node.x - size, node.y - size, size * 2, size * 2);
        } else if (node.type === 'IP') {
            ctx.moveTo(node.x, node.y - size);
            ctx.lineTo(node.x + size, node.y + size);
            ctx.lineTo(node.x - size, node.y + size);
        }

        // Set Colors
        let fillColor = '#059669'; // low
        if (node.risk === 'High') fillColor = '#e11d48';
        else if (node.risk === 'Medium') fillColor = '#d97706';

        if (isDimmed) {
            fillColor = 'rgba(100, 100, 100, 0.2)';
            ctx.fillStyle = fillColor;
            ctx.shadowBlur = 0;
            ctx.fill();
        } else {
            ctx.fillStyle = fillColor;

            // Add Glow
            if (isHighRisk) {
                ctx.shadowColor = 'rgba(225, 29, 72, 0.8)';
                ctx.shadowBlur = 15;
            } else if (selectedNode?.id === node.id) {
                ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
                ctx.shadowBlur = 15;
                ctx.fillStyle = '#3b82f6';
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fill();

            // Border
            ctx.shadowBlur = 0;
            ctx.strokeStyle = isHighRisk ? '#fff' : 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 0.5 / globalScale;
            if (selectedNode?.id === node.id) {
                ctx.lineWidth = 1.5 / globalScale;
                ctx.strokeStyle = '#fff';
            }
            ctx.stroke();
        }

        // Add ID label for non-dimmed nodes if scaled up
        if (!isDimmed && globalScale >= 3) {
            ctx.font = `${4 / globalScale}px ui-monospace, SFMono-Regular, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(node.label || node.id, node.x, node.y + size + (2 / globalScale));
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
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-3 w-[400px]">
                    <Search className="w-4 h-4 text-zinc-500" />
                    <input type="text" placeholder="Search entity in graph..." className="bg-transparent focus:outline-none text-zinc-200 text-sm flex-1 font-mono placeholder:font-sans placeholder-zinc-500" />
                </div>
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
