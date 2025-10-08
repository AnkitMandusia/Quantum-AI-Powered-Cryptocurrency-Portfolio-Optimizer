// page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, ReferenceLine } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Play, Loader, AlertTriangle, Cpu, Bot, PieChart as PieChartIcon, CheckCircle } from 'lucide-react';

// --- PortfolioMetrics Component ---
const PortfolioMetrics = ({ metrics }) => {
    if (!metrics) return null;
    const monteCarloData = [
        { name: '5th %', value: metrics.monte_carlo['5th_percentile'] },
        { name: 'Mean', value: metrics.monte_carlo['mean_return'] },
        { name: '95th %', value: metrics.monte_carlo['95th_percentile'] },
    ];
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {/* KPI Cards */}
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center">
                <h3 className="text-sm text-gray-400">Expected Return</h3>
                <p className="text-2xl font-bold text-cyan-400">{(metrics.expected_return * 100).toFixed(2)}%</p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center">
                <h3 className="text-sm text-gray-400">Volatility</h3>
                <p className="text-2xl font-bold text-yellow-400">{(metrics.volatility * 100).toFixed(2)}%</p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center">
                <h3 className="text-sm text-gray-400">Sharpe Ratio</h3>
                <p className="text-2xl font-bold text-green-400">{metrics.sharpe_ratio.toFixed(2)}</p>
            </div>
            {/* Monte Carlo Bar Chart */}
            <div className="col-span-1 md:col-span-3 bg-gray-900/50 p-4 rounded-lg border border-gray-700 mt-4">
                <h3 className="text-gray-400 text-sm mb-2">Monte Carlo Portfolio Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monteCarloData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${(value * 100).toFixed(2)}%`} />
                        <Bar dataKey="value" fill="#0ea5e9" />
                        <ReferenceLine y={metrics.expected_return} stroke="#facc15" strokeDasharray="3 3" label="Expected" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- Helper & UI Components ---
const LoadingDisplay = () => (
    <div className="flex flex-col items-center justify-center space-y-4 text-center h-full">
        <div className="relative flex items-center justify-center">
            <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-cyan-400"></div>
            <Cpu className="absolute h-10 w-10 text-cyan-500 animate-pulse" />
        </div>
        <p className="text-lg font-medium text-cyan-300">Engaging Quantum Circuits...</p>
        <p className="text-sm text-gray-400">Agentic AI is collaborating to find the optimal solution.</p>
    </div>
);

const ErrorDisplay = ({ message }) => (
    <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg flex items-center space-x-3 h-full">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <div>
            <strong className="font-bold">Optimization Failed</strong>
            <span className="block sm:inline ml-2">{message}</span>
        </div>
    </div>
);

const LogStream = ({ logs, isAudioReady }) => {
    const logContainerRef = useRef(null);
    const [displayedLogs, setDisplayedLogs] = useState([]);
    const [currentTypingLine, setCurrentTypingLine] = useState('');
    const logQueue = useRef([]);
    const isTyping = useRef(false);
    const synth = useRef(null);

    useEffect(() => {
        if (isAudioReady && window.Tone && !synth.current) {
            synth.current = new window.Tone.MonoSynth({
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.1 },
                filterEnvelope: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.2 },
            }).toDestination();
            const reverb = new window.Tone.Reverb(0.5).toDestination();
            synth.current.connect(reverb);
        }
    }, [isAudioReady]);

    useEffect(() => {
        if (logs.length > (displayedLogs.length + logQueue.current.length)) {
            const newLogs = logs.slice(displayedLogs.length + logQueue.current.length);
            logQueue.current = [...logQueue.current, ...newLogs];
        }
    }, [logs, displayedLogs]);

    useEffect(() => {
        const processQueue = () => {
            if (isTyping.current || logQueue.current.length === 0) {
                return;
            }
            isTyping.current = true;
            const lineToType = logQueue.current.shift();
            let charIndex = 0;
            const typingInterval = setInterval(() => {
                if (charIndex < lineToType.length) {
                    setCurrentTypingLine(lineToType.substring(0, charIndex + 1));
                    if (synth.current && lineToType[charIndex] !== ' ') {
                        synth.current.triggerAttackRelease('C6', '32n');
                    }
                    charIndex++;
                } else {
                    clearInterval(typingInterval);
                    setDisplayedLogs(prev => [...prev, lineToType]);
                    setCurrentTypingLine('');
                    isTyping.current = false;
                }
            }, 20);
        };
        const queueInterval = setInterval(processQueue, 100);
        return () => clearInterval(queueInterval);
    }, []);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [displayedLogs, currentTypingLine]);

    return (
        <div ref={logContainerRef} className="h-full bg-black/30 rounded-md p-4 space-y-2 overflow-y-auto font-mono text-sm border border-gray-700 custom-scrollbar">
            {displayedLogs.map((log, index) => (
                <div key={index} className="flex items-start">
                    <Bot className="h-4 w-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="flex-grow text-gray-300">{log}</span>
                </div>
            ))}
            {currentTypingLine && (
                <div className="flex items-start">
                    <Bot className="h-4 w-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="flex-grow text-gray-300">
                        {currentTypingLine}
                        <span className="animate-pulse bg-cyan-400 w-2 h-4 inline-block ml-1" style={{ verticalAlign: 'middle' }}></span>
                    </span>
                </div>
            )}
        </div>
    );
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-700/80 backdrop-blur-sm border border-gray-600 rounded-lg p-2 text-sm">
                <p className="text-white font-bold">{`${payload[0].name}`}</p>
            </div>
        );
    }
    return null;
};

// --- Main Application Component ---
const CRYPTO_OPTIONS = [
    { id: 'bitcoin', name: 'Bitcoin', ticker: 'BTC' },
    { id: 'ethereum', name: 'Ethereum', ticker: 'ETH' },
    { id: 'solana', name: 'Solana', ticker: 'SOL' },
    { id: 'ripple', name: 'XRP', ticker: 'XRP' },
    { id: 'cardano', name: 'Cardano', ticker: 'ADA' },
    { id: 'avalanche-2', name: 'Avalanche', ticker: 'AVAX' },
    { id: 'chainlink', name: 'Chainlink', ticker: 'LINK' },
    { id: 'polkadot', name: 'Polkadot', ticker: 'DOT' },
    { id: 'dogecoin', name: 'Dogecoin', ticker: 'DOGE' },
    { id: 'matic-network', name: 'Polygon', ticker: 'MATIC' },
];

const COLORS = ['#00E5FF', '#82ca9d', '#FFD600', '#FFAB00', '#FF6D00', '#a78bfa', '#DD2C00', '#00B8D4'];

export default function QOptiFolioPage() {
    const [selectedAssets, setSelectedAssets] = useState(['bitcoin', 'ethereum', 'solana', 'cardano']);
    const [riskFactor, setRiskFactor] = useState(0.5);
    const [budget, setBudget] = useState(3);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [logs, setLogs] = useState(["Agent log stream initialized..."]);
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [metrics, setMetrics] = useState(null);

    useEffect(() => {
        if (!document.querySelector('script[src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js"]')) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js';
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    const handleAssetToggle = (assetId) => {
        setSelectedAssets(prev =>
            prev.includes(assetId)
                ? prev.filter(id => id !== assetId)
                : [...prev, assetId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedAssets.length < budget) {
            setError('Please select at least as many assets as your portfolio size.');
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);
        setMetrics(null);
        setLogs(["[SYSTEM] Initiating optimization sequence..."]);

        try {
            if (window.Tone && !isAudioReady) {
                await window.Tone.start();
                console.log('Audio context started successfully.');
                setIsAudioReady(true);
            }
            const API_URL = "http://localhost:8000/optimize";

            const mockLogs = [
                "[AGENT: Market Analyst] Task received. Fetching market data...",
                "[TOOL] Executing fetch_market_data for: " + selectedAssets.join(', '),
                "[AGENT: Market Analyst] Data processed. Passing to strategist.",
                "[AGENT: Quantum Strategist] Task received. Engaging QAOA protocol...",
                "[TOOL] Executing run_quantum_optimization...",
                "[AGENT: Quantum Strategist] Optimization complete.",
                "[AGENT: AI Financial Advisor] Compiling final report..."
            ];
            setLogs(prev => [...prev, ...mockLogs]);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asset_ids: selectedAssets,
                    risk_factor: riskFactor,
                    budget: parseInt(budget, 10),
                }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP error! Status: ${response.status} - ${errorData}`);
            }
            const data = await response.json();
            if (data.status === 'error') {
                throw new Error(data.message);
            }

            let reportString = (typeof data.report === 'string') ? data.report : JSON.stringify(data.report, null, 2);
            reportString = reportString.replace(/^[\s*#-]+|[\s*#-]+$/g, '').trim();
            setResult(reportString);
            setMetrics(data.metrics); // Set actual metrics from backend
            setLogs(prev => [...prev, "[SYSTEM] Final report received. Mission complete."]);
        } catch (err) {
            setError(err.message || 'An unknown error occurred.');
            setLogs(prev => [...prev, `[SYSTEM] CRITICAL ERROR: ${err.message}`]);
        } finally {
            setLoading(false);
        }
    };

    const getChartData = () => {
        if (!result || typeof result !== 'string') return [];
        try {
            const assetRegex = new RegExp(`(${CRYPTO_OPTIONS.map(c => c.name).join('|')})`, 'gi');
            const matches = result.match(assetRegex) || [];
            const uniqueAssets = [...new Set(matches.map(m => m.toLowerCase()))];
            if (uniqueAssets.length === 0) return [];
            const data = uniqueAssets.map((assetName) => {
                const crypto = CRYPTO_OPTIONS.find(c => c.name.toLowerCase() === assetName);
                return {
                    name: crypto ? crypto.ticker : assetName,
                    value: 1,
                };
            });
            return data.map((d, index) => ({ ...d, fill: COLORS[index % COLORS.length] }));
        } catch (e) {
            console.error("Error parsing chart data with regex:", e);
            return [];
        }
    };
    const chartData = getChartData();

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8" style={{
            backgroundImage: `radial-gradient(circle at top left, rgba(7, 89, 133, 0.2), transparent 30%),
                             radial-gradient(circle at bottom right, rgba(107, 33, 168, 0.2), transparent 30%)`
        }}>
            <main className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-3">
                        <Cpu className="h-10 w-10 text-cyan-400" />
                        <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                            Q-OptiFolio
                        </h1>
                    </div>
                    <p className="text-gray-400 mt-2 text-sm sm:text-base">
                        Autonomous Crypto Portfolio Optimization with Agentic AI & Quantum Computing
                    </p>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg shadow-2xl border border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 text-cyan-300">Configuration Matrix</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">1. Asset Universe ({selectedAssets.length})</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CRYPTO_OPTIONS.map(asset => (
                                            <button
                                                type="button" key={asset.id}
                                                onClick={() => handleAssetToggle(asset.id)}
                                                className={`px-3 py-1 text-xs rounded-full transition-all duration-200 border-2 ${selectedAssets.includes(asset.id)
                                                        ? 'bg-cyan-500 border-cyan-400 text-white font-bold'
                                                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                                                    }`}
                                            >
                                                {asset.ticker}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="budget" className="block text-sm font-medium text-gray-300">2. Portfolio Size</label>
                                    <p className="text-xs text-gray-500 mb-2">Number of assets to select in final portfolio.</p>
                                    <input
                                        id="budget" type="number" min="1" max={selectedAssets.length}
                                        value={budget}
                                        onChange={e => setBudget(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="risk" className="block text-sm font-medium text-gray-300">3. Risk Tolerance</label>
                                    <p className="text-xs text-gray-500 mb-2">Lower value prioritizes stability; higher value seeks more returns.</p>
                                    <input
                                        id="risk" type="range" min="0.1" max="1.0" step="0.1"
                                        value={riskFactor}
                                        onChange={e => setRiskFactor(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb-cyan"
                                    />
                                </div>
                                <button
                                    type="submit" disabled={loading}
                                    className="w-full flex items-center justify-center bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                    {loading ? <Loader className="animate-spin mr-2" /> : <Play className="mr-2" />}
                                    {loading ? 'Processing...' : 'Initiate Optimization'}
                                </button>
                            </form>
                        </div>
                        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg shadow-2xl border border-gray-700 min-h-[16rem] flex-grow flex flex-col">
                            <h2 className="text-xl font-semibold mb-4 flex-shrink-0 text-cyan-300">Agent Log Stream</h2>
                            <div className="flex-grow">
                                <LogStream logs={logs} isAudioReady={isAudioReady} />
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg shadow-2xl border border-gray-700 min-h-[40rem] flex flex-col">
                        <h2 className="text-xl font-semibold mb-4 text-center text-cyan-300">Optimization Results</h2>
                        <div className="flex-grow flex flex-col justify-center items-center">
                            {loading && <LoadingDisplay />}
                            {error && <ErrorDisplay message={error} />}
                            {!loading && !error && !result && (
                                <div className="text-center text-gray-500">
                                    <p>Your optimized portfolio will be visualized here.</p>
                                    <p className="text-sm mt-1">Configure parameters and initiate optimization to begin.</p>
                                </div>
                            )}
                            {result && (
                                <div className="w-full flex-grow flex flex-col space-y-6">
                                    <div className="max-w-none h-80 overflow-y-auto custom-scrollbar p-1">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-cyan-300 mb-4" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-cyan-400 mt-6 mb-3 border-b border-gray-700 pb-2" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-white mt-4 mb-2" {...props} />,
                                                p: ({node, ...props}) => <p className="text-sm text-gray-300 mb-4 leading-relaxed" {...props} />,
                                                strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4" {...props} />,
                                                li: ({node, ...props}) => <li className="text-sm text-gray-300" {...props} />,
                                                table: ({node, ...props}) => <table className="w-full text-sm text-left my-4 table-auto" {...props} />,
                                                thead: ({node, ...props}) => <thead className="text-xs text-gray-300 uppercase bg-gray-900/50" {...props} />,
                                                th: ({node, ...props}) => <th scope="col" className="px-4 py-3 font-medium" {...props} />,
                                                tbody: ({node, ...props}) => <tbody className="divide-y divide-gray-700" {...props} />,
                                                tr: ({node, ...props}) => <tr className="hover:bg-gray-800/50" {...props} />,
                                                td: ({node, ...props}) => <td className="px-4 py-3" {...props} />,
                                            }}
                                        >{result}</ReactMarkdown>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                        <div className="space-y-4">
                                            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <PieChartIcon className="h-6 w-6 text-cyan-400" />
                                                    <span className="font-semibold">Portfolio Size</span>
                                                </div>
                                                <span className="text-2xl font-bold text-cyan-300">{chartData.length}</span>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="h-6 w-6 text-green-400" />
                                                    <span className="font-semibold">Status</span>
                                                </div>
                                                <span className="text-lg font-bold text-green-400">Optimal</span>
                                            </div>
                                        </div>
                                        <div className="h-64 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={chartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        fill="#8884d8"
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {chartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none ring-0"/>
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend iconType="circle" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    {metrics && <PortfolioMetrics metrics={metrics} />}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <footer className="text-center mt-8 text-xs text-gray-600">
                    <p>Q-OptiFolio v1.0 | Quantum-Agentic Financial Engineering</p>
                </footer>
            </main>
            <style jsx global>{`
                .range-thumb-cyan::-webkit-slider-thumb {
                    -webkit-appearance: none; appearance: none;
                    width: 20px; height: 20px;
                    border-radius: 50%; background: #06b6d4;
                    cursor: pointer; border: 2px solid #111827;
                }
                .range-thumb-cyan::-moz-range-thumb {
                    width: 20px; height: 20px;
                    border-radius: 50%; background: #06b6d4;
                    cursor: pointer; border: 2px solid #111827;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #4b5563;
                    border-radius: 4px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #6b7280;
                }
            `}</style>
        </div>
    );
}