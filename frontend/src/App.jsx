import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Investigation from './pages/Investigation';
import GraphAnalysis from './pages/GraphAnalysis';
import Landing from './pages/Landing';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Network, LogOut, User, ChevronDown } from 'lucide-react';

function NavLink({ to, children }) {
    const location = useLocation();
    const active = location.pathname === to;
    return (
        <Link to={to} className="relative px-3 py-2 flex items-center justify-center">
            <span className={`text-sm font-semibold tracking-wide transition-colors z-10 ${active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}>
                {children}
            </span>
            {active && (
                <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-blue-50 rounded-md border border-blue-100"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
        </Link>
    );
}

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    useEffect(() => {
        const authFlag = localStorage.getItem('sih_auth');
        if (authFlag === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    const handleLogin = () => {
        localStorage.setItem('sih_auth', 'true');
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('sih_auth');
        window.location.href = '/';
    };

    // If not authenticated, lock to Landing
    if (!isAuthenticated) {
        return <Landing onLogin={handleLogin} />;
    }

    return (
        <Router>
            <div className="h-screen w-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
                {/* Top Navbar - Clean Professional Light Mode */}
                <header className="shrink-0 relative z-50 flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm">
                    {/* Professional Enterprise Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
                            <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-800">
                            CryptoTrace
                        </h1>
                    </div>

                    <nav className="flex gap-2">
                        <NavLink to="/">Overview & Alerts</NavLink>
                        <NavLink to="/investigation">Investigation</NavLink>
                        <NavLink to="/graph">Graph Analysis</NavLink>
                    </nav>

                    {/* Admin Profile Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-2 pl-3 pr-2 py-1.5 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
                        >
                            <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden">
                                <User className="w-4 h-4 text-slate-500" />
                            </div>
                            <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-800">Admin</span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </button>

                        <AnimatePresence>
                            {profileOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                                >
                                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Signed in as</p>
                                        <p className="text-sm font-medium text-slate-800 truncate">admin@gmail.com</p>
                                    </div>
                                    <div className="p-1.5">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                        >
                                            <LogOut className="w-4 h-4" /> Sign Out
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </header>

                {/* Main Layout Area */}
                <main className="flex-1 min-h-0 overflow-hidden relative isolate bg-slate-50">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/investigation" element={<Investigation />} />
                        <Route path="/graph" element={<GraphAnalysis />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
