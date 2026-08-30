/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                glowRed: '#ef4444',
                riskHigh: '#e11d48', // rose-600
                riskMedium: '#d97706', // amber-600
                riskLow: '#059669', // emerald-600
                accentIndigo: '#4f46e5', // indigo-600
                electricBlue: '#3b82f6', // blue-500
                darkBg: '#09090b', // zinc-950 / obsidan
                cardBg: '#18181b', // zinc-900 elevated
                cardBorder: 'rgba(255, 255, 255, 0.1)'
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
            }
        },
    },
    plugins: [],
}
