import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Investigation from './pages/Investigation';
import GraphAnalysis from './pages/GraphAnalysis';
import { motion } from 'framer-motion';

function NavLink({ to, children }) {
    const location = useLocation();
    const active = location.pathname === to;
    return (
        <Link to={to} className="relative px-3 py-2 flex items-center justify-center">
            <span className={`text-sm font-semibold tracking-wide transition-colors z-10 ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {children}
            </span>
            {active && (
                <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white/10 rounded-md border border-white/10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
        </Link>
    );
}

function App() {
    return (
        <Router>
            <div className="h-screen w-screen bg-[#09090b] text-zinc-300 flex flex-col font-sans overflow-hidden">
                {/* Top Navbar - Glassmorphism */}
                <header className="shrink-0 relative z-50 flex items-center justify-between px-6 py-4 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.4)]">
                            <span className="text-white font-bold font-mono text-lg tracking-tighter">CT</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-white">CryptoTrace</h1>
                    </div>
                    <nav className="flex gap-2">
                        <NavLink to="/">Overview & Alerts</NavLink>
                        <NavLink to="/investigation">Investigation</NavLink>
                        <NavLink to="/graph">Graph Analysis</NavLink>
                    </nav>
                </header>

                {/* Main Layout Area */}
                <main className="flex-1 min-h-0 overflow-hidden relative isolate">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950 pointer-events-none"></div>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/investigation" element={<Investigation />} />
                        <Route path="/graph" element={<GraphAnalysis />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
