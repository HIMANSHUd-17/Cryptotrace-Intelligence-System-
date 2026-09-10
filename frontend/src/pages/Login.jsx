import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Login() {
    const [username, setUsername] = useState('investigator');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const success = await login(username, password);
        setLoading(false);
        if (!success) {
            setError('Invalid investigator credentials');
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center font-sans overflow-hidden relative isolate">
            {/* Background Aesthetics */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-900/20 via-zinc-950 to-zinc-950 pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-white/10 shadow-2xl relative"
            >
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.5)] mb-4">
                        <ShieldAlert className="text-white w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">CryptoTrace DB</h1>
                    <p className="text-zinc-400 text-sm">Forensic Intelligence Portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center"
                        >
                            {error}
                        </motion.div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Investigator ID</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
                            placeholder="username"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Clearance Passkey</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 pl-10 pr-10 rounded-lg bg-black/50 border border-white/5 text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all font-mono tracking-wider"
                                placeholder={showPassword ? "admin@123" : "••••••••"}
                            />
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white rounded-lg font-semibold tracking-wide shadow-lg flex items-center justify-center transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

export default Login;
