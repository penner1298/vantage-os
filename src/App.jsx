import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Calendar, 
  Globe, 
  Zap, 
  Settings, 
  Bell, 
  Search, 
  Menu, 
  X, 
  Sparkles, 
  Loader, 
  Send, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  FileBarChart, 
  ShieldAlert, 
  Activity, 
  PenTool, 
  CheckCircle, 
  Download, 
  RefreshCw,
  Database,
  Mail,
  Printer,
  User,
  Phone,
  Info,
  Plus,
  Filter,
  ArrowRight,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  LogOut,
  Terminal
} from 'lucide-react';

/* --- 1. CORE UTILITIES & AI CONFIGURATION --- */

// Note: To use environment variables, ensure your build target supports ES2020 or later.
// For this deployment, we default to an empty string to ensure compatibility and prevent build warnings.
const apiKey = ""; 

// Robust Gemini Call combining retry logic from VANTAGE with Context from TRACKER
const callGemini = async (prompt, systemContext = "general", retries = 3) => {
  if (!apiKey) return null;

  const systemPrompts = {
    general: "You are Vantage, a highly capable legislative Chief of Staff for Rep. Josh Penner. Your tone is professional, strategic, and concise.",
    political: "You are a political strategist. Focus on public perception, polling impact, and media narrative. Be persuasive and sharp.",
    policy: "You are a legislative analyst. Focus on statutory interpretation, fiscal impact, and legal nuance. Be objective and thorough.",
    writer: "You are a communications director. Write engaging, clear, and voice-specific content for the Representative."
  };

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemPrompts[systemContext] || systemPrompts.general }] }
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
      if (i === retries - 1) return null;
      await delay(Math.pow(2, i) * 1000);
    }
  }
};

/* --- 2. SHARED COMPONENTS --- */

// Markdown Renderer
const SimpleMarkdown = ({ text, onCitationClick }) => {
  if (!text) return null;
  const parseInline = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('[') && part.endsWith(']')) {
         const content = part.slice(1, -1);
         if (content.includes(',') || content.includes('p.') || ['Fiscal Note', 'Bill Analysis'].some(t => content.includes(t))) {
           return (
             <button key={i} onClick={() => onCitationClick && onCitationClick(content)} className="text-blue-600 hover:text-blue-800 bg-blue-50 px-1 rounded text-xs font-semibold inline-flex items-center gap-1 border border-blue-100 mx-0.5">
               <FileText size={10} /> {content}
             </button>
           );
         }
      }
      return part;
    });
  };

  return (
    <div className="space-y-2 text-sm">
      {text.split('\n').map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />; 
        if (trimmed.startsWith('### ')) return <h4 key={idx} className="font-bold text-slate-800 mt-2">{parseInline(trimmed.slice(4))}</h4>;
        if (trimmed.startsWith('- ')) return <div key={idx} className="flex gap-2 pl-1"><span className="text-slate-400">•</span><span>{parseInline(trimmed.slice(2))}</span></div>;
        return <p key={idx} className="leading-relaxed text-slate-700">{parseInline(line)}</p>;
      })}
    </div>
  );
};

// --- MODALS ---

const DocumentViewer = ({ citation, onClose }) => {
  if (!citation) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-slate-200">
        <div className="h-14 bg-slate-800 text-white px-4 flex justify-between items-center shrink-0 rounded-t-xl">
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-white/10 rounded"><FileText size={18} /></div>
             <h3 className="font-semibold text-sm">{citation}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-red-500/80 p-2 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 bg-slate-100 overflow-y-auto p-8 flex justify-center">
           <div className="bg-white shadow-lg w-full max-w-2xl min-h-[800px] p-12 relative">
             <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center">
               <div className="uppercase tracking-widest text-slate-500 text-xs font-bold mb-2">Official Record</div>
               <h1 className="text-xl font-serif font-bold text-slate-900">{citation.split(',')[0]}</h1>
             </div>
             <div className="space-y-4 font-serif text-slate-800">
               <p>This is a simulated view of the requested document.</p>
               <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-sm">
                 <strong className="block text-yellow-900 mb-1">AI Relevance Highlight</strong>
                 The system has identified this section as relevant to your current query regarding fiscal impact.
               </div>
               <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
               <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
               {[1,2,3].map(i => <div key={i} className="h-3 bg-slate-100 rounded w-full" />)}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const WarRoomModal = ({ item, onClose }) => {
  const [tone, setTone] = useState('Statesman');
  const [draft, setDraft] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  const generateDraft = async (type) => {
    setIsDrafting(true);
    setDraft('Initializing Vantage Uplink...');
    const prompt = `Write a draft ${type} about: "${item.title}". Context: ${item.summary}. Tone: ${tone}. Max 150 words.`;
    const result = await callGemini(prompt, 'writer');
    setDraft(result || "Simulation: Draft content would appear here based on the selected parameters.");
    setIsDrafting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 p-4 flex justify-between items-center text-white rounded-t-xl">
          <div className="flex items-center gap-2"><Zap size={18} className="text-yellow-400" /><h2 className="font-bold tracking-wider">WAR ROOM</h2></div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
            <div className="text-xs text-slate-500 font-mono uppercase mt-1">{item.source} • Score: {item.score}/10</div>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
            {['Firebrand', 'Statesman', 'Wonk'].map((t) => (
              <button key={t} onClick={() => setTone(t)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${tone === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{t}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button onClick={() => generateDraft('Tweet')} disabled={isDrafting} className="p-3 border rounded hover:bg-slate-50 text-sm font-semibold flex items-center gap-2 justify-center"><Send size={14}/> Social Post</button>
            <button onClick={() => generateDraft('Statement')} disabled={isDrafting} className="p-3 border rounded hover:bg-slate-50 text-sm font-semibold flex items-center gap-2 justify-center"><FileText size={14}/> Press Release</button>
          </div>
          <div className="bg-slate-50 rounded-lg border p-4 min-h-[150px]">
            <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex justify-between"><span>Draft Output</span>{isDrafting && <Sparkles size={12} className="text-blue-500 animate-pulse"/>}</div>
            <textarea className="w-full bg-transparent resize-none text-sm leading-relaxed focus:outline-none" value={draft} readOnly rows={6} placeholder="Select an action above..." />
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- 3. DATA MANAGEMENT --- */

// Configuration: Real Feeds
const FEED_CONFIG = [
  { url: "https://housedemocrats.wa.gov/feed/", name: "House Dems", category: "Official" },
  { url: "https://senatedemocrats.wa.gov/feed/", name: "Senate Dems", category: "Official" },
  { url: "https://houserepublicans.wa.gov/feed/", name: "House GOP", category: "Official" },
  { url: "https://src.wastateleg.org/feed/", name: "Senate GOP", category: "Official" },
  { url: "https://www.thestranger.com/feed", name: "The Stranger", category: "Partisan" },
  { url: "https://www.seattletimes.com/opinion/feed/", name: "Seattle Times Op", category: "Media" },
  { url: "https://www.spokesman.com/feeds/stories/", name: "Spokesman Main", category: "Media" }
];

const upcomingSchedule = [
  { day: "Mon", date: "Jan 12", time: "1:30 PM", event: "Republican Caucus Meeting", type: "Caucus", location: "Caucus Room" },
  { day: "Tue", date: "Jan 13", time: "3:30 PM", event: "Appropriations: Budget Work Session", type: "Committee", location: "JLOB 315" },
  { day: "Wed", date: "Jan 14", time: "8:00 AM", event: "ELHS: Child Care Hearing", type: "Committee", location: "JLOB 317" },
];

const myBills = [
  { id: "HB 1564", title: "Child care assist./B&O tax", status: "In Committee", committee: "Finance", role: "Primary Sponsor", priority: "High" },
  { id: "HB 1818", title: "Administration of plats", status: "Floor Calendar", committee: "Local Govt", role: "Primary Sponsor", priority: "Medium" },
  { id: "HB 2058", title: "Private entity audits", status: "Prefiled", committee: "State Govt", role: "Co-Sponsor", priority: "Medium" },
];

/* --- 4. MAIN APPLICATION --- */

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [intelItems, setIntelItems] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLog, setScanLog] = useState([]); // Debug log
  
  // UI State
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [warRoomItem, setWarRoomItem] = useState(null);
  const [viewingCitation, setViewingCitation] = useState(null);
  const [draftingBill, setDraftingBill] = useState(false);

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'model', text: "**System Online.** Welcome back, Rep. Penner. I am ready to assist with legislative analysis or political strategy." }
  ]);
  const chatEndRef = useRef(null);

  // --- RSS FETCHING LOGIC ---
  const fetchFeeds = async () => {
    setIsScanning(true);
    setScanLog(prev => ["Starting scan...", ...prev]);
    let allItems = [];

    const fetchPromises = FEED_CONFIG.map(async (feed) => {
      try {
        setScanLog(prev => [`Requesting: ${feed.name}...`, ...prev]);
        // Use allorigins.win as a CORS proxy to fetch RSS XML
        const cacheBuster = `&_cb=${new Date().getTime()}`;
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}${cacheBuster}`);
        const data = await response.json();
        
        if (!data.contents) throw new Error("No content received from proxy");

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.contents, "text/xml");
        
        // Support both RSS <item> and Atom <entry>
        let items = Array.from(xmlDoc.querySelectorAll("item"));
        if (items.length === 0) {
            items = Array.from(xmlDoc.querySelectorAll("entry"));
        }

        if (items.length === 0) {
            setScanLog(prev => [`${feed.name}: Connected, but 0 items found.`, ...prev]);
            return [];
        }
        
        setScanLog(prev => [`${feed.name}: Found ${items.length} items.`, ...prev]);

        // Convert XML items to our app's format (limit 3 per feed)
        const parsedItems = items.slice(0, 3).map(item => {
          const title = item.querySelector("title")?.textContent || "Untitled";
          
          let link = item.querySelector("link")?.textContent;
          if (!link) link = item.querySelector("link")?.getAttribute("href");
          
          let desc = item.querySelector("description")?.textContent;
          if (!desc) desc = item.querySelector("summary")?.textContent;
          desc = desc?.replace(/<[^>]*>?/gm, '').slice(0, 150) + "..." || "No summary available.";
          
          let pubDate = item.querySelector("pubDate")?.textContent;
          if (!pubDate) pubDate = item.querySelector("updated")?.textContent;
          pubDate = pubDate ? new Date(pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Recent";

          return {
            id: Math.random().toString(36).substr(2, 9),
            title: title,
            source: feed.name,
            url: link || feed.url,
            summary: desc,
            score: Math.floor(Math.random() * 5) + 3,
            date: pubDate
          };
        });
        return parsedItems;
      } catch (err) {
        setScanLog(prev => [`${feed.name}: FAILED - ${err.message}`, ...prev]);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    allItems = results.flat().sort((a, b) => 0.5 - Math.random()); 
    
    // Safety check: ensure we never set empty array
    if (allItems.length > 0) {
        setIntelItems(allItems);
    }
    // removed simulated backup so only real feed items show
    
    setIsScanning(false);
    setScanLog(prev => [`Scan complete. Total items: ${allItems.length}`, ...prev]);
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, showAIPanel]);

  const handleAIChat = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    
    const prompt = aiPrompt;
    setAiPrompt('');
    setChatHistory(prev => [...prev, { role: 'user', text: prompt }]);
    setIsGenerating(true);
    
    let context = 'general';
    if (activeTab === 'intelligence') context = 'political';
    if (activeTab === 'legislation') context = 'policy';
    if (activeTab === 'committees') context = 'policy';

    const response = await callGemini(prompt, context);
    setChatHistory(prev => [...prev, { role: 'model', text: response || "I'm having trouble connecting to the Vantage network. Please try again." }]);
    setIsGenerating(false);
  };

  const quickAction = (action, item) => {
    setShowAIPanel(true);
    setAiPrompt(`${action}: "${item}"`);
  };

  const DashboardHome = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={20}/></div><span className="text-xs font-bold text-slate-400">ACTIVE</span></div>
          <div className="text-3xl font-bold text-slate-900">{myBills.length}</div>
          <div className="text-sm text-slate-500">Sponsored Bills</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2"><div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20}/></div><span className="text-xs font-bold text-slate-400">TODAY</span></div>
          <div className="text-3xl font-bold text-slate-900">3</div>
          <div className="text-sm text-slate-500">Meetings Scheduled</div>
        </div>
        <div className="bg-white p-5 rounded-xl border-l-4 border-l-red-500 border-y border-r border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-2 opacity-5"><ShieldAlert size={60} /></div>
           <div className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Critical Intel</div>
           <div className="text-3xl font-bold text-red-600">{intelItems.filter(i => i.score > 7).length}</div>
           <div className="text-sm text-slate-500">High Impact Alerts</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 rounded-xl text-white shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowAIPanel(true)}>
           <div className="flex items-center gap-2 mb-2"><Sparkles size={18} className="text-yellow-300" /><span className="font-bold text-sm tracking-wider">AI ASSISTANT</span></div>
           <div className="text-sm opacity-90 leading-snug">"Review the fiscal note for HB 1564?"</div>
           <div className="mt-3 text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded">Click to Ask</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calendar size={18} className="text-slate-400"/> Legislative Schedule</h3>
            <button onClick={() => setActiveTab('committees')} className="text-xs font-bold text-blue-600 hover:underline">VIEW CALENDAR</button>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingSchedule.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center hover:bg-slate-50 transition-colors">
                <div className="flex flex-col items-center w-14 mr-4 border-r border-slate-100 pr-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">{item.day}</span>
                  <span className="text-lg font-bold text-slate-800">{item.date.split(' ')[1]}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-900">{item.event}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={12}/> {item.time}</span>
                    <span className="flex items-center gap-1"><MapPin size={12}/> {item.location}</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${item.type === 'Committee' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{item.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Globe size={18} className="text-slate-400"/> Vantage Feed</h3>
            <button onClick={fetchFeeds} disabled={isScanning} className="text-slate-400 hover:text-blue-600"><RefreshCw size={14} className={isScanning ? "animate-spin" : ""}/></button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-2">
            {isScanning ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader size={24} className="animate-spin text-blue-500"/>
                <span className="text-xs">Scanning {FEED_CONFIG.length} sources...</span>
              </div>
            ) : (
              intelItems.slice(0, 10).map((item) => (
                <div key={item.id} className="p-3 rounded border border-slate-100 hover:border-blue-200 hover:bg-slate-50 transition-all cursor-pointer group" onClick={() => setWarRoomItem(item)}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">{item.source}</span>
                    {item.score > 7 && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-1"><ShieldAlert size={10}/> PRIORITY</span>}
                  </div>
                  {/* Clickable Title in Mini Feed */}
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={(e) => e.stopPropagation()} 
                    className="text-sm font-medium text-slate-900 leading-snug group-hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    {item.title} <ExternalLink size={10} className="opacity-50"/>
                  </a>
                  <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded font-bold flex items-center gap-1"><PenTool size={10}/> WAR ROOM</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t border-slate-100 text-center">
             <button onClick={() => setActiveTab('intelligence')} className="text-xs font-bold text-blue-600 hover:text-blue-700">VIEW ALL INTEL</button>
          </div>
        </div>
      </div>
    </div>
  );

  const LegislationView = () => (
    <div className="animate-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-2xl font-bold text-slate-900">Legislation Tracker</h2><p className="text-slate-500 text-sm">Managing {myBills.length} sponsored bills</p></div>
        <button onClick={() => setDraftingBill(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm"><Plus size={16}/> New Draft</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Bill #</th>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Committee</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {myBills.map((bill, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-mono font-bold text-blue-600">{bill.id}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{bill.title}</td>
                <td className="px-6 py-4 text-slate-600">{bill.committee}</td>
                <td className="px-6 py-4"><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">{bill.status}</span></td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => quickAction("Draft email to constituent re", bill.id)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded" title="Email"><Mail size={16}/></button>
                    <button onClick={() => quickAction("Analyze fiscal impact of", bill.id)} className="p-1.5 hover:bg-purple-100 text-purple-600 rounded" title="AI Analysis"><Sparkles size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const IntelligenceView = () => (
    <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div><h2 className="text-2xl font-bold text-slate-900">Vantage Intelligence</h2><p className="text-slate-500 text-sm">Real-time media monitoring</p></div>
        <div className="flex gap-2">
           <button onClick={fetchFeeds} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><RefreshCw size={16} className={isScanning ? "animate-spin" : ""}/> Scan</button>
           <button onClick={() => quickAction("Draft daily briefing based on", "current intel feed")} className="bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><FileText size={16}/> Briefing</button>
        </div>
      </div>
      
      {/* Scan Log / Debug Area */}
      <div className="bg-slate-900 text-green-400 p-3 rounded-lg mb-4 text-xs font-mono h-32 overflow-y-auto border border-slate-700 shadow-inner">
        <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-1 text-white font-bold"><Terminal size={12}/> SYSTEM LOG</div>
        {scanLog.map((log, i) => (
            <div key={i} className="opacity-80">{'>'} {log}</div>
        ))}
        {scanLog.length === 0 && <div className="opacity-50 italic">Ready to scan.</div>}
      </div>

      <div className="grid grid-cols-1 gap-4 flex-1 overflow-y-auto">
        {intelItems.length === 0 && !isScanning ? (
            <div className="text-center py-20 text-slate-400">
                <Activity size={48} className="mx-auto mb-4 opacity-20"/>
                <p>No intelligence found. Click "Scan" to fetch live data.</p>
            </div>
        ) : (
          intelItems.map((item) => (
            <div key={item.id} className={`bg-white p-5 rounded-xl border shadow-sm transition-all hover:shadow-md flex flex-col md:flex-row gap-4 ${item.score > 7 ? 'border-l-4 border-l-red-500 border-y-slate-200 border-r-slate-200' : 'border-slate-200'}`}>
               <div className="flex-1">
                 <div className="flex items-center gap-3 mb-2">
                   <span className="text-[10px] font-bold uppercase bg-slate-100 px-2 py-1 rounded text-slate-600">{item.source}</span>
                   <span className="text-[10px] text-slate-400">{item.date}</span>
                   {item.score > 7 && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-1"><ShieldAlert size={10}/> PRIORITY</span>}
                 </div>
                 
                 {/* Clickable Title */}
                 <h3 className="text-lg font-bold text-slate-900 mb-2">
                   <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline hover:text-blue-700 flex items-center gap-2">
                      {item.title} <ExternalLink size={16} className="text-slate-400"/>
                   </a>
                 </h3>
                 
                 <p className="text-sm text-slate-600">{item.summary}</p>
               </div>
               <div className="flex flex-row md:flex-col gap-2 justify-center md:border-l border-slate-100 md:pl-4 min-w-[140px]">
                  <button onClick={() => setWarRoomItem(item)} className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-2 hover:bg-slate-800"><PenTool size={14}/> WAR ROOM</button>
                  <button onClick={() => quickAction("Analyze sentiment of", item.title)} className="flex-1 bg-white border border-slate-300 text-slate-600 text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-2 hover:bg-slate-50"><Sparkles size={14}/> ANALYZE</button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const CommitteeAnalysisView = () => {
    const [selectedComm, setSelectedComm] = useState('APP');
    const [analyzing, setAnalyzing] = useState(false);
    const [inputMode, setInputMode] = useState('text'); // 'text' or 'url'
    const [docInput, setDocInput] = useState('');
    const [analysisResult, setAnalysisResult] = useState('');

    const committees = {
      APP: { name: "Appropriations" },
      FIN: { name: "Finance" },
      ELHS: { name: "Early Learning & Human Svcs" },
      TEDV: { name: "Tech & Econ Dev" }
    };

    const handleAnalysis = async () => {
       if (!docInput.trim()) return;
       setAnalyzing(true);
       
       const prompt = `Analyze this legislative document content:
       
       "${docInput.substring(0, 5000)}"
       
       1. Executive Summary (2 sentences).
       2. Fiscal Risks for WA State.
       3. 3 Strategic Questions for the Committee Hearing.`;
       
       const response = await callGemini(prompt, 'policy');
       setAnalysisResult(response || "Analysis failed. Please verify API key.");
       setAnalyzing(false);
    };

    return (
      <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div><h2 className="text-2xl font-bold text-slate-900">Committee Analysis Tool</h2><p className="text-slate-500 text-sm">Deep dive analysis on bills and reports</p></div>
          <div className="flex bg-white rounded-lg border border-slate-300 p-1">
             {Object.entries(committees).map(([key, data]) => (
                <button 
                  key={key} 
                  onClick={() => setSelectedComm(key)}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${selectedComm === key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {key}
                </button>
             ))}
          </div>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
           {/* Left: Input Area */}
           <div className="w-full md:w-1/3 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                 <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">Document Input</h3>
                 <p className="text-xs text-slate-500">Paste the text of a bill, amendment, or fiscal note below.</p>
              </div>
              <div className="flex-1 p-4 flex flex-col">
                 <textarea 
                    className="flex-1 w-full border border-slate-200 rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Paste document text here..."
                    value={docInput}
                    onChange={(e) => setDocInput(e.target.value)}
                 />
                 <button 
                    onClick={handleAnalysis}
                    disabled={analyzing || !docInput}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                 >
                    {analyzing ? <Loader size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                    {analyzing ? 'Analyzing...' : 'Run Analysis'}
                 </button>
              </div>
           </div>

           {/* Right: Analysis Results */}
           <div className="flex-1 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-6 overflow-y-auto relative">
              {!analysisResult ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
                       <FileText size={32} className="text-slate-300"/>
                    </div>
                    <p className="font-bold">Ready to Analyze</p>
                    <p className="text-sm mt-1">Paste text on the left to generate insights.</p>
                 </div>
              ) : (
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-4 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
                       <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-yellow-300"/>
                          <span className="font-bold text-sm">Vantage Analysis</span>
                       </div>
                       <button onClick={() => setAnalysisResult('')} className="text-slate-400 hover:text-white"><X size={16}/></button>
                    </div>
                    <div className="p-6">
                       <SimpleMarkdown text={analysisResult} />
                       <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
                          <button className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1"><CheckCircle size={14}/> Save to Briefing</button>
                          <button className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1"><Printer size={14}/> Print Report</button>
                       </div>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>
    );
  };

  const SettingsView = () => (
    <div className="animate-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
        <p className="text-slate-500 text-sm">Configure Vantage preferences and integrations.</p>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Profile & Identity</h3>
          <div className="flex items-center gap-4 mb-4">
             <div className="w-16 h-16 bg-slate-800 rounded-full text-white flex items-center justify-center text-xl font-bold">JP</div>
             <div>
                <div className="font-bold text-slate-900">Rep. Josh Penner</div>
                <div className="text-sm text-slate-500">31st Legislative District</div>
             </div>
             <button className="ml-auto text-sm text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50">Edit</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Notifications</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div>
                   <div className="text-sm font-semibold text-slate-800">Critical Intel Alerts</div>
                   <div className="text-xs text-slate-500">Notify when Vantage score exceeds 8/10</div>
                </div>
                <ToggleRight className="text-green-600 w-10 h-10 cursor-pointer"/>
             </div>
             <div className="flex items-center justify-between">
                <div>
                   <div className="text-sm font-semibold text-slate-800">Committee Agenda Changes</div>
                   <div className="text-xs text-slate-500">Notify of last-minute additions</div>
                </div>
                <ToggleRight className="text-green-600 w-10 h-10 cursor-pointer"/>
             </div>
             <div className="flex items-center justify-between">
                <div>
                   <div className="text-sm font-semibold text-slate-800">Daily Briefing Email</div>
                   <div className="text-xs text-slate-500">Send summary at 7:00 AM</div>
                </div>
                <ToggleLeft className="text-slate-300 w-10 h-10 cursor-pointer"/>
             </div>
          </div>
        </div>

        <button className="w-full py-3 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 flex items-center justify-center gap-2">
           <LogOut size={16}/> Sign Out of Vantage
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* --- MODALS --- */}
      {viewingCitation && <DocumentViewer citation={viewingCitation} onClose={() => setViewingCitation(null)} />}
      {warRoomItem && <WarRoomModal item={warRoomItem} onClose={() => setWarRoomItem(null)} />}
      {draftingBill && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded-xl max-w-md w-full shadow-2xl">
             <h3 className="text-lg font-bold mb-4">Draft New Legislation</h3>
             <input className="w-full border p-2 rounded mb-4" placeholder="Bill Title/Topic" autoFocus />
             <div className="flex justify-end gap-2">
               <button onClick={() => setDraftingBill(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded">Cancel</button>
               <button onClick={() => { setDraftingBill(false); alert("Draft initialized in Vantage."); }} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Create Draft</button>
             </div>
           </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <aside className="w-20 md:w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20 flex-shrink-0 transition-all duration-300">
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/50">V</div>
          <div className="hidden md:block">
            <h1 className="text-white font-bold tracking-wider">VANTAGE</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Command OS v2.0</p>
          </div>
        </div>
        
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'legislation', icon: FileText, label: 'Legislation' },
            { id: 'committees', icon: Users, label: 'Committees' },
            { id: 'intelligence', icon: Globe, label: 'Intelligence' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-4 md:px-6 py-3 transition-all ${activeTab === item.id ? 'bg-slate-800 text-white border-l-4 border-blue-500' : 'hover:bg-slate-800/50 hover:text-white border-l-4 border-transparent'}`}>
              <item.icon size={20} className={activeTab === item.id ? "text-blue-400" : "text-slate-500"} />
              <span className="hidden md:block font-medium">{item.label}</span>
            </button>
          ))}
          <div className="my-4 border-t border-slate-800 pt-4 px-4 md:px-6">
             <div className="text-[10px] font-bold uppercase text-slate-600 mb-2 hidden md:block">System</div>
             <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 py-2 hover:text-white transition-colors ${activeTab === 'settings' ? 'text-white' : ''}`}>
               <Settings size={18}/>
               <span className="hidden md:block">Settings</span>
             </button>
          </div>
        </nav>

        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
           <button onClick={() => setShowAIPanel(!showAIPanel)} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white p-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg transition-all">
             <Sparkles size={18} className="text-yellow-300" />
             <span className="hidden md:block">Vantage Assistant</span>
           </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 capitalize flex items-center gap-2">
            {activeTab} 
            {activeTab === 'intelligence' && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Live Feed</span>}
          </h2>
          <div className="flex items-center gap-4">
             <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input className="pl-9 pr-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all" placeholder="Search database..." />
             </div>
             <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full"><Bell size={20}/><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span></button>
             <div className="w-8 h-8 bg-slate-800 rounded-full text-white flex items-center justify-center text-xs font-bold">JP</div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
           {activeTab === 'dashboard' && <DashboardHome />}
           {activeTab === 'legislation' && <LegislationView />}
           {activeTab === 'intelligence' && <IntelligenceView />}
           {activeTab === 'committees' && <CommitteeAnalysisView />}
           {activeTab === 'settings' && <SettingsView />}
        </div>

        {/* --- AI ASSISTANT PANEL --- */}
        <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 z-50 flex flex-col border-l border-slate-200 ${showAIPanel ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2 font-bold"><Sparkles size={18} className="text-yellow-400" /> Vantage Assistant</div>
            <button onClick={() => setShowAIPanel(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
             {chatHistory.map((msg, i) => (
               <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                   {msg.role === 'model' ? <SimpleMarkdown text={msg.text} onCitationClick={setViewingCitation} /> : msg.text}
                 </div>
               </div>
             ))}
             {isGenerating && <div className="flex items-center gap-2 text-slate-500 text-xs font-bold p-2"><Loader size={14} className="animate-spin"/> PROCESSING REQUEST...</div>}
             <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-200">
             <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
               {['Summarize today\'s intel', 'Draft tweet re: HB 1564', 'Find fiscal risks'].map(p => (
                 <button key={p} onClick={() => setAiPrompt(p)} className="whitespace-nowrap px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-full font-medium transition-colors">{p}</button>
               ))}
             </div>
             <form onSubmit={handleAIChat} className="relative">
               <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ask Vantage..." className="w-full pl-4 pr-12 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"/>
               <button type="submit" disabled={!aiPrompt.trim() || isGenerating} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"><Send size={16}/></button>
             </form>
          </div>
        </div>
      </main>
    </div>
  );
}
