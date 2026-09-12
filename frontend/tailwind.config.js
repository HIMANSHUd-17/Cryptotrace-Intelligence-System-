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
                darkBg: '#f8fafc', // slate-50 background body
                cardBg: '#ffffff', // pure white cards
                cardBorder: '#e2e8f0' // slate-200 lines
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
            }
        },
    },
    plugins: [],
}
