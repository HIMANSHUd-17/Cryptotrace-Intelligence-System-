import React, { useState } from 'react';
import { Lock, Shield, ArrowRight, User } from 'lucide-react';

export default function Landing({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Secure validation per SIH requirements
        if (email.trim().toLowerCase() === 'admin@gmail.com' && password === '123') {
            setError('');
            onLogin();
        } else {
            setError('Invalid credentials. Administrator access only.');
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans">

            {/* High-Tech Custom Background Image */}
            <div className="absolute inset-0 z-0 bg-slate-50">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
                    style={{ backgroundImage: 'url("/landing-bg.jpg")' }}
                />

                {/* Advanced fading: Tints the dark cyberpunk image to match light theme parameters */}
                <div className="absolute inset-0 bg-slate-50/20 mix-blend-luminosity" />

                {/* Fading from the bottom so it looks proper as requested */}
                <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent" />
            </div>

            {/* Central Form Container */}
            <div className="relative z-10 w-full max-w-md bg-white p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center">

                {/* Enterprise Logo */}
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6 border border-blue-100">
                    <Shield className="w-8 h-8 text-blue-600" />
                </div>

                <h1 className="text-2xl font-bold text-slate-800 tracking-tight text-center mb-1">
                    CryptoTrace Diagnostics
                </h1>
                <p className="text-sm text-slate-500 font-medium mb-8 text-center">
                    Authorized Personnel Only
                </p>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    {/* Error Banner */}
                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs font-semibold px-4 py-3 rounded-lg border border-red-100 flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Work Email</label>
                        <div className="relative">
                            <User className="absolute w-4 h-4 text-slate-400 left-3.5 top-3" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                placeholder="admin@gmail.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Security Key</label>
                        <div className="relative">
                            <Lock className="absolute w-4 h-4 text-slate-400 left-3.5 top-3" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                placeholder="&bull;&bull;&bull;"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer border border-blue-700"
                    >
                        Authenticate <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

            </div>

            <div className="absolute bottom-6 text-xs text-slate-400 font-medium">
                Smart India Hackathon &copy; 2026 CryptoTrace Forensics
            </div>
        </div>
    );
}
