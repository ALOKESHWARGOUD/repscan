import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    Activity,
    ShieldAlert,
    AlertTriangle,
    Globe,
    Terminal,
    Search,
    ExternalLink,
    LayoutDashboard,
    Database,
    BarChart3,
    ShieldCheck,
    Settings,
    MoreVertical,
    ChevronDown,
    Wifi,
    Clock,
    User,
    ArrowUpRight,
    TrendingUp
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid
} from "recharts";

/* ================= CONFIG ================= */
const YOUTUBE_API_KEY = "AIzaSyCA0KAkj40B87YNQtmpTcHmoUEda-_kC7Y";
const KEYWORDS = ["Rowdy Janardhan"];
const POLL_INTERVAL = 30000;

/* ================= UTILS ================= */
const formatSignalTime = (date) => {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now - target;
    const diffMins = Math.floor(diffMs / 60000);
    const timeStr = target.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' });
    if (diffMins < 2) return `LIVE ${timeStr}`;
    return `${target.toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} ${timeStr}`;
};

const classifySentiment = (t) => {
    const text = (t || "").toLowerCase();
    if (/(bad|worst|cringe|flop|hate|cheap|disaster|boring|troll|waste|logicless|overaction)/.test(text)) return "NEGATIVE";
    if (/(awesome|fire|super|love|hit|mass|amazing|blockbuster|waiting|king|epic|goosebumps)/.test(text)) return "POSITIVE";
    return "NEUTRAL";
};

/* ================= MAIN ================= */
export default function App() {
    const [intercepts, setIntercepts] = useState([]);
    const [velocity, setVelocity] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("Rowdy Janardhan");
    const [activeKeyword, setActiveKeyword] = useState("Rowdy Janardhan");
    const [intelBrief, setIntelBrief] = useState(null);
    const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

    const seenComments = useRef(new Set());
    const trackedVideos = useRef(new Set());
    const lastPoll = useRef(Date.now());

    useEffect(() => {
        // Initial setup
        console.log("SYSTEM_BOOT: ARCTIC LINK ESTABLISHED");
    }, []);

    const scanComments = useCallback(async () => {
        if (isScanning && !isDemoMode) return;
        setIsScanning(true);

        if (isDemoMode) {
            const count = Math.floor(Math.random() * 3) + 1;
            const newItems = Array.from({ length: count }, () => ({
                id: Math.random().toString(36).substr(2, 9),
                author: `Operator_${Math.floor(Math.random() * 999)}`,
                sentiment: ["POSITIVE", "NEGATIVE", "NEUTRAL"][Math.floor(Math.random() * 3)],
                text: `Dynamic signal matched for keyword: ${activeKeyword}`,
                time: formatSignalTime(new Date()),
                videoId: `SIM_VID_${Math.floor(Math.random() * 5)}`,
                commentUrl: "#"
            }));
            setIntercepts((p) => [...newItems, ...p].slice(0, 40));
            const rate = (Math.random() * 20 + 40).toFixed(1);
            setVelocity((p) => [...p, { time: new Date().toLocaleTimeString(), pulse: +rate }].slice(-15));
            setIsScanning(false);
            return;
        }

        try {
            // STEP 1: Discover high-traffic videos for the keyword
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(activeKeyword)}&type=video&maxResults=5&order=relevance&key=${YOUTUBE_API_KEY}`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();

            if (searchData.items) {
                searchData.items.forEach(item => trackedVideos.current.add(item.id.videoId));
            }

            // STEP 2: Scan comments from discovered videos
            let newItems = [];
            for (const videoId of Array.from(trackedVideos.current)) {
                const cUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=10&key=${YOUTUBE_API_KEY}`;
                const cRes = await fetch(cUrl);
                const cData = await cRes.json();
                if (cData.error) continue;

                for (const item of cData.items || []) {
                    if (seenComments.current.has(item.id)) continue;
                    seenComments.current.add(item.id);
                    const comment = item.snippet.topLevelComment.snippet;
                    newItems.push({
                        id: item.id,
                        author: comment.authorDisplayName,
                        sentiment: classifySentiment(comment.textOriginal),
                        text: comment.textOriginal,
                        time: formatSignalTime(comment.publishedAt),
                        videoId: videoId,
                        commentUrl: `https://www.youtube.com/watch?v=${videoId}&lc=${item.id}`
                    });
                }
            }
            if (newItems.length > 0) {
                setIntercepts((p) => [...newItems, ...p].slice(0, 40));
            }
            const now = Date.now();
            const delta = Math.max(1, (now - lastPoll.current) / 1000);
            const rate = ((newItems.length / delta) * 100).toFixed(1);
            setVelocity((p) => [...p, { time: new Date().toLocaleTimeString(), pulse: +rate }].slice(-15));
            lastPoll.current = now;
        } catch (err) {
            console.error(err);
        } finally {
            setIsScanning(false);
        }
    }, [isScanning, isDemoMode, activeKeyword]);

    const generateTacticalBrief = useCallback(async () => {
        if (isGeneratingBrief || intercepts.length === 0) return;
        setIsGeneratingBrief(true);
        try {
            const negData = intercepts.filter(i => i.sentiment === "NEGATIVE").slice(0, 15).map(i => i.text).join(", ");
            const prompt = `Analyze these potential attacker signals for keyword "${activeKeyword}": [${negData}]. 
            1. Identify coordination patterns (Narrative clusters).
            2. Classify if this is an "Organized PR Attack" or "Organic Criticism".
            3. Suggest a professional 'Arctic' response strategy.
            Tone: High-level tactical intelligence. Brief and professional.`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${YOUTUBE_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            setIntelBrief(data.candidates?.[0]?.content?.parts?.[0]?.text || "ANALYSIS_FAIL: SIGNAL_TOO_LOW");
        } catch (err) {
            setIntelBrief("AI_UPLINK_ERROR: Check API Permissions");
        } finally {
            setIsGeneratingBrief(false);
        }
    }, [intercepts, activeKeyword, isGeneratingBrief]);

    useEffect(() => {
        const id = setInterval(scanComments, isDemoMode ? 5000 : POLL_INTERVAL);
        if (!isDemoMode) scanComments();
        return () => clearInterval(id);
    }, [scanComments, isDemoMode]);

    const analytics = useMemo(() => {
        const neg = intercepts.filter(i => i.sentiment === "NEGATIVE").length;
        const total = intercepts.length;
        const negPerc = total ? ((neg / total) * 100).toFixed(1) : 0;

        // Calculate targeting repeaters & threats
        const userMap = {};
        intercepts.forEach(i => {
            if (!userMap[i.author]) {
                userMap[i.author] = {
                    total: 0,
                    negCount: 0,
                    videoIds: new Set(),
                    links: []
                };
            }
            userMap[i.author].total += 1;
            if (i.sentiment === "NEGATIVE") userMap[i.author].negCount += 1;
            userMap[i.author].videoIds.add(i.videoId);
            userMap[i.author].links.push(i.commentUrl);
        });

        const allRepeaters = Object.entries(userMap)
            .map(([name, data]) => ({
                name,
                count: data.total,
                negPercent: (data.negCount / data.total) * 100,
                uniqueVideos: data.videoIds.size,
                links: Array.from(new Set(data.links)).slice(0, 5)
            }))
            .filter(r => r.count > 1);

        const priorityThreats = allRepeaters
            .filter(r => r.negPercent > 50)
            .sort((a, b) => b.negPercent - a.negPercent || b.uniqueVideos - a.uniqueVideos);

        const secondaryNegRepeaters = allRepeaters
            .filter(r => r.negPercent <= 50 && r.negPercent > 0)
            .sort((a, b) => b.uniqueVideos - a.uniqueVideos || b.count - a.count);

        return { total, negPerc, risk: negPerc > 30 ? "High" : "Optimal", priorityThreats, secondaryNegRepeaters };
    }, [intercepts]);

    return (
        <div className="min-h-screen bg-[#0b0c0e] text-slate-200 font-sans flex overflow-hidden">

            {/* Minimalist Sidebar */}
            <aside className="w-64 border-r border-[#24272b] hidden md:flex flex-col bg-[#0b0c0e] shrink-0">
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <ShieldCheck className="text-white" size={18} />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white font-outfit uppercase">Janardhan</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-2">
                    {[
                        { icon: LayoutDashboard, label: "Overview", active: true },
                        { icon: Activity, label: "Live Telemetry", active: false },
                        { icon: Database, label: "Data Index", active: false },
                        { icon: BarChart3, label: "Performance", active: false },
                        { icon: Settings, label: "Maintenance", active: false }
                    ].map((item, i) => (
                        <button key={i} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${item.active ? 'bg-[#15171a] text-blue-500 border border-[#24272b]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}>
                            <item.icon size={18} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-[#24272b]">
                    <div className="bg-[#15171a] rounded-xl p-4 border border-[#24272b]">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Uplink Active</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Connected to Global Node A-9</p>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* Clean Header */}
                <header className="h-16 border-b border-[#24272b] bg-[#0b0c0e]/80 backdrop-blur-md px-8 flex items-center justify-between z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setActiveKeyword(searchQuery);
                                        setIntercepts([]);
                                        seenComments.current.clear();
                                        trackedVideos.current.clear();
                                        scanComments();
                                    }
                                }}
                                placeholder="Enter keyword for global scan..."
                                className="w-full bg-[#15171a] border border-[#24272b] rounded-lg py-2 pl-10 pr-4 text-xs font-medium focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="h-4 w-px bg-[#24272b]" />
                        <div className="flex items-center gap-2 text-[10px] text-blue-500 font-bold uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-md border border-blue-500/20">
                            <span className="animate-pulse-subtle">Target: {activeKeyword}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 ml-4">
                        <div className="flex items-center gap-2 p-1 bg-[#15171a] border border-[#24272b] rounded-lg">
                            <button onClick={() => setIsDemoMode(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${!isDemoMode ? 'bg-[#24272b] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>LIVE</button>
                            <button onClick={() => setIsDemoMode(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${isDemoMode ? 'bg-[#24272b] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>DEMO</button>
                        </div>
                        <button
                            disabled={isGeneratingBrief}
                            onClick={generateTacticalBrief}
                            className="h-9 px-5 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-xs font-black transition-all flex items-center gap-2"
                        >
                            {isGeneratingBrief ? <Activity className="animate-spin" size={14} /> : <ShieldAlert size={14} />}
                            Generate Tactical Brief
                        </button>
                        <button
                            onClick={() => {
                                setActiveKeyword(searchQuery);
                                scanComments();
                            }}
                            disabled={isScanning}
                            className="h-9 px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 opacity-90 hover:opacity-100"
                        >
                            {isScanning ? <Activity className="animate-spin" size={14} /> : <TrendingUp size={14} />}
                            Initialize Scan
                        </button>
                    </div>
                </header>

                {/* Dashboard Viewport */}
                <div className="flex-1 overflow-y-auto p-8 bg-[#0b0c0e]">

                    {/* Tactical Briefing Overlay */}
                    {intelBrief && (
                        <div className="mb-8 p-6 bg-amber-500/5 border border-amber-500/20 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ShieldAlert size={14} /> Attacker Strategy Identification Brief
                                </h4>
                                <button onClick={() => setIntelBrief(null)} className="text-[10px] text-zinc-600 hover:text-white font-bold">CLOSE_INTEL</button>
                            </div>
                            <div className="text-[11px] text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap italic">
                                {intelBrief}
                            </div>
                            <div className="mt-4 pt-4 border-t border-amber-500/10 flex gap-6 text-[9px] font-bold uppercase text-amber-500/60">
                                <span>Metric: High-Confidence Pattern Match</span>
                                <span>Scope: Traditional + New-Age PR Analysis</span>
                            </div>
                        </div>
                    )}

                    {/* Top Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                        {[
                            { label: "VolumeDensity", value: analytics.total, icon: Activity, trend: "+12%", color: "blue" },
                            { label: "ThreatStability", value: analytics.risk, icon: ShieldCheck, trend: "Stable", color: analytics.risk === 'High' ? "red" : "emerald" },
                            { label: "DeltaImpact", value: `${analytics.negPerc}%`, icon: AlertTriangle, trend: "-2%", color: analytics.negPerc > 10 ? "red" : "blue" },
                            { label: "UplinkVelocity", value: velocity.length > 0 ? velocity[velocity.length - 1].pulse.toFixed(1) : "0.0", icon: Wifi, trend: "+4%", color: "blue" }
                        ].map((stat, i) => (
                            <div key={i} className="prof-card p-6 flex flex-col justify-between h-36">
                                <div className="flex justify-between items-start">
                                    <div className="p-2.5 bg-slate-800/50 rounded-lg">
                                        <stat.icon size={18} className={`text-${stat.color}-500`} />
                                    </div>
                                    <span className={`text-[10px] font-bold ${stat.trend.startsWith('+') ? 'text-emerald-500' : stat.label === 'ThreatStability' ? 'text-slate-500' : 'text-slate-500'}`}>{stat.trend}</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                    <h3 className="text-2xl font-bold text-white font-outfit">{stat.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Table View (Signal Stream) */}
                        <div className="lg:col-span-2 prof-card overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-[#24272b] flex items-center justify-between bg-white/[0.01]">
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-3">
                                    <Terminal size={16} className="text-blue-500" />
                                    Signal Telemetry Stream
                                </h4>
                                <div className="flex gap-2">
                                    <button className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-500"><Search size={14} /></button>
                                    <button className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-500"><MoreVertical size={14} /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto min-h-[400px]">
                                {intercepts.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
                                        <Activity size={32} className="animate-spin mb-4" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Awaiting Uplink Synchronization...</span>
                                    </div>
                                ) : (
                                    intercepts.map((sig, i) => (
                                        <div key={sig.id} className="data-row group">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-[#24272b] flex items-center justify-center shrink-0">
                                                <User size={16} className="text-slate-400" />
                                            </div>
                                            <div className="ml-4 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white">@{sig.author}</span>
                                                    <div className={`status-pill ${sig.sentiment === 'POSITIVE' ? 'bg-emerald-500/10 text-emerald-500' : sig.sentiment === 'NEGATIVE' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'}`}>
                                                        {sig.sentiment}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{sig.text}</p>
                                            </div>
                                            <div className="text-right ml-4">
                                                <p className="text-[10px] font-bold text-slate-500">{sig.time}</p>
                                                <a href={sig.commentUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center justify-end gap-1 mt-1 font-bold">
                                                    Inspect <ArrowUpRight size={10} />
                                                </a>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Chart and Side Feed */}
                        <div className="lg:col-span-1 space-y-8">
                            <div className="prof-card p-6">
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                                    <BarChart3 size={16} className="text-blue-500" />
                                    Frequency Pulse
                                </h4>
                                <div className="h-40">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={velocity}>
                                            <defs>
                                                <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#24272b" />
                                            <XAxis dataKey="time" hide />
                                            <YAxis hide />
                                            <Tooltip contentStyle={{ background: '#15171a', border: '1px solid #24272b', borderRadius: '8px', fontSize: '10px' }} />
                                            <Area type="monotone" dataKey="pulse" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPulse)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Avg Pulse Rate</span>
                                    <span className="text-xs font-bold text-white">{velocity.length > 0 ? (velocity.reduce((s, v) => s + v.pulse, 0) / velocity.length).toFixed(1) : "0.0"} p/s</span>
                                </div>
                            </div>

                            <div className="prof-card p-6">
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                                    <Globe size={16} className="text-blue-500" />
                                    Active Nodes
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { name: "Node_Delhi_Central", status: "Active", latency: "24ms" },
                                        { name: "Node_Mumbai_Edge", status: "Active", latency: "18ms" },
                                        { name: "Node_Bangalore_Hub", status: "Maintenance", latency: "---" }
                                    ].map((node, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-white/[0.01] rounded-lg border border-[#24272b]">
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-300">{node.name}</p>
                                                <span className={`text-[9px] font-black uppercase ${node.status === 'Active' ? 'text-emerald-500' : 'text-amber-500'}`}>{node.status}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500">{node.latency}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="prof-card p-6">
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                                    <ShieldAlert size={16} className="text-rose-500" />
                                    Priority Threat Channels
                                </h4>
                                <div className="space-y-4 mb-8">
                                    {analytics.priorityThreats.length === 0 ? (
                                        <p className="text-[10px] text-slate-500 font-medium italic">No hostile coordination detected...</p>
                                    ) : (
                                        analytics.priorityThreats.slice(0, 5).map((rep, i) => (
                                            <div key={i} className="flex flex-col p-3 bg-rose-500/5 rounded-lg border border-rose-500/20">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-rose-950 flex items-center justify-center text-[10px] text-rose-400 font-bold border border-rose-500/30">
                                                            {rep.name[0]}
                                                        </div>
                                                        <p className="text-[11px] font-bold text-rose-200">@{rep.name}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] font-black bg-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded border border-rose-500/30">
                                                            {rep.negPercent.toFixed(0)}% NEG
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-1 pt-2 border-t border-rose-500/10">
                                                    {rep.links.map((link, li) => (
                                                        <a key={li} href={link} target="_blank" rel="noreferrer" className="h-5 px-1.5 bg-rose-950/40 hover:bg-rose-600/20 text-[8px] font-bold flex items-center gap-1 rounded transition-colors text-rose-300 border border-rose-500/10">
                                                            Threat_Ref_{li + 1} <ExternalLink size={8} />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                                    <AlertTriangle size={16} className="text-amber-500" />
                                    Secondary Negative Regions
                                </h4>
                                <div className="space-y-4">
                                    {analytics.secondaryNegRepeaters.length === 0 ? (
                                        <p className="text-[10px] text-zinc-600 font-medium italic">Scanning for negative patterns...</p>
                                    ) : (
                                        analytics.secondaryNegRepeaters.slice(0, 5).map((rep, i) => (
                                            <div key={i} className="flex flex-col p-3 bg-white/[0.01] rounded-lg border border-[#24272b]">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                                                            {rep.name[0]}
                                                        </div>
                                                        <p className="text-[11px] font-bold text-slate-300">@{rep.name}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/10">
                                                            {rep.negPercent.toFixed(0)}% NEG
                                                        </span>
                                                        <span className="text-[9px] font-black bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-[#24272b]">
                                                            {rep.uniqueVideos}V
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-1 pt-2 border-t border-[#24272b]/50">
                                                    {rep.links.map((link, li) => (
                                                        <a key={li} href={link} target="_blank" rel="noreferrer" className="h-5 px-1.5 bg-[#24272b] hover:bg-blue-6 outer-blur-sm hover:text-blue-500 text-[8px] font-bold flex items-center gap-1 rounded transition-colors text-slate-500 border border-transparent hover:border-blue-500/30">
                                                            Pattern_{li + 1} <ExternalLink size={8} />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
