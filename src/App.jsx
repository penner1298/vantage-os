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
  Terminal,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  ListFilter,
  Edit2,
  Trash2
} from 'lucide-react';

/* --- 1. CORE UTILITIES & AI CONFIGURATION --- */

// Note: To use environment variables, ensure your build target supports ES2020 or later.
// For this deployment, we default to an empty string to ensure compatibility and prevent build warnings.
const apiKey = ""; 

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

/* --- 2. DATA MANAGEMENT --- */

// Configuration Lists for Dropdowns
const BILL_STATUSES = [
  "In Committee",
  "Exec Session",
  "Rules Committee",
  "Floor Calendar",
  "Passed House",
  "In Senate",
  "Senate Committee",
  "Senate Rules",
  "Senate Floor",
  "Passed Legislature",
  "Delivered to Governor",
  "Signed into Law",
  "Vetoed",
  "Dead"
];

const WA_COMMITTEES = [
  "Appropriations",
  "Capital Budget",
  "Civil Rights & Judiciary",
  "Community Safety",
  "Consumer Protection & Business",
  "Education",
  "Environment & Energy",
  "Finance",
  "Health Care & Wellness",
  "Housing",
  "Human Services",
  "Innovation, Community & Econ Dev",
  "Labor & Workplace Standards",
  "Local Government",
  "Regulated Substances & Gaming",
  "State Govt & Tribal Relations",
  "Transportation",
  "Rules"
];

// Initial Data loaded from source provided with Primary Sponsor
const INITIAL_BILLS = [
  // Primary
  { id: "HB 2202", title: "Dental care pilot at Rainier School", status: "Prefiled", committee: "Human Services", role: "Primary Sponsor", sponsor: "Rep. Penner", priority: "High", year: "2026" },
  { id: "HB 1564", title: "Child care B&O tax credit", status: "In Committee", committee: "Finance", role: "Primary Sponsor", sponsor: "Rep. Penner", priority: "High", year: "2025" },
  { id: "HB 1818", title: "Modernizing subdivision/platting laws", status: "Floor Calendar", committee: "Local Government", role: "Primary Sponsor", sponsor: "Rep. Penner", priority: "Medium", year: "2025" },
  
  // Secondary (Co-Sponsor)
  { id: "HB 1051", title: "IEP team meetings/recording", status: "In Committee", committee: "Education", role: "Co-Sponsor", sponsor: "Rep. Walsh", priority: "Low", year: "2025" },
  { id: "HB 1055", title: "Transparency ombuds study", status: "In Committee", committee: "Appropriations", role: "Co-Sponsor", sponsor: "Rep. Abbarno", priority: "Medium", year: "2025" },
  { id: "HB 1086", title: "Motor vehicle chop shops", status: "In Committee", committee: "Community Safety", role: "Co-Sponsor", sponsor: "Rep. Low", priority: "Low", year: "2025" },
  { id: "HB 1221", title: "Gubernatorial proclamations", status: "In Committee", committee: "State Govt & Tribal Relations", role: "Co-Sponsor", sponsor: "Rep. Volz", priority: "Medium", year: "2025" },
  { id: "HB 1324", title: "Transportation funding/CCA", status: "In Committee", committee: "Transportation", role: "Co-Sponsor", sponsor: "Rep. Barkis", priority: "High", year: "2025" },
  { id: "HB 1585", title: "Voter citizenship verif.", status: "In Committee", committee: "State Govt & Tribal Relations", role: "Co-Sponsor", sponsor: "Rep. Marshall", priority: "High", year: "2025" },
  { id: "HB 2058", title: "Private entity audits", status: "In Committee", committee: "State Govt & Tribal Relations", role: "Co-Sponsor", sponsor: "Rep. Couture", priority: "High", year: "2025" },
  
  // Passed / Vetoed
  { id: "HB 1106", title: "Disabled veterans/prop. tax", status: "Signed into Law", committee: "Finance", role: "Co-Sponsor", sponsor: "Rep. Barnard", priority: "High", year: "2025" },
  { id: "HB 1414", title: "CTE careers work group", status: "Signed into Law", committee: "Education", role: "Co-Sponsor", sponsor: "Rep. Connors", priority: "Low", year: "2025" },
];

const MY_COMMITTEES = {
  APP: { name: "Appropriations", role: "Assistant Ranking Member" },
  FIN: { name: "Finance", role: "Member" },
  ELHS: { name: "Early Learning & Human Svcs", role: "Member" },
  TEDV: { name: "Tech, Econ Dev & Veterans", role: "Member" }
};

const FEED_CONFIG = [
  { url: "https://housedemocrats.wa.gov/feed/", name: "House Dems", category: "Official" },
  { url: "https://senatedemocrats.wa.gov/feed/", name: "Senate Dems", category: "Official" },
  { url: "https://houserepublicans.wa.gov/feed/", name: "House GOP", category: "Official" },
  { url: "https://src.wastateleg.org/feed/", name: "Senate GOP", category: "Official" },
  { url: "https://www.thestranger.com/feed", name: "The Stranger", category: "Partisan" }, 
  { url: "https://www.seattletimes.com/opinion/feed/", name: "Seattle Times Op", category: "Media" },
  { url: "https://www.spokesman.com/feeds/stories/", name: "Spokesman Main", category: "Media" }
];

/* --- 3. SHARED COMPONENTS --- */

const SimpleMarkdown = ({ text, onCitationClick }) => {
  if (!text) return null;
  const parseInline = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
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
                 The system has identified this section as relevant to your current query.
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
            <div className="text-xs text-slate-500 font-mono uppercase mt-1">{item.source} • {item.date}</div>
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

const AddEditBillModal = ({ onClose, onSave, initialBill }) => {
  const [billData, setBillData] = useState(initialBill || { 
    id: '', 
    title: '', 
    status: 'In Committee', 
    committee: 'Appropriations',
    role: 'Primary Sponsor',
    sponsor: 'Rep. Penner',
    year: '2026',
    priority: 'Medium'
  });

  const isEdit = !!initialBill;

  const handleSubmit = () => {
    if(!billData.id) return;
    onSave(billData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <FileText size={20}/> {isEdit ? 'Edit Bill Details' : 'Track New Bill'}
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Bill Number</label>
            <input className="w-full border p-2 rounded text-sm" placeholder="e.g. HB 2405" value={billData.id} onChange={e => setBillData({...billData, id: e.target.value})} autoFocus={!isEdit}/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Session Year</label>
            <input className="w-full border p-2 rounded text-sm" placeholder="2026" value={billData.year} onChange={e => setBillData({...billData, year: e.target.value})}/>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 mb-1">Title / Topic</label>
          <input className="w-full border p-2 rounded text-sm" placeholder="Short description of the bill" value={billData.title} onChange={e => setBillData({...billData, title: e.target.value})}/>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Status / Location</label>
            <select className="w-full border p-2 rounded bg-white text-sm" value={billData.status} onChange={e => setBillData({...billData, status: e.target.value})}>
              {BILL_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Committee</label>
            <select className="w-full border p-2 rounded bg-white text-sm" value={billData.committee} onChange={e => setBillData({...billData, committee: e.target.value})}>
              {WA_COMMITTEES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">My Role</label>
            <select className="w-full border p-2 rounded bg-white text-sm" value={billData.role} onChange={e => setBillData({...billData, role: e.target.value})}>
              <option>Primary Sponsor</option>
              <option>Co-Sponsor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Primary Sponsor Name</label>
            <input className="w-full border p-2 rounded text-sm" placeholder="e.g. Rep. Smith" value={billData.sponsor} onChange={e => setBillData({...billData, sponsor: e.target.value})}/>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <div>
             {isEdit && <button className="text-red-500 text-xs font-bold hover:underline flex items-center gap-1"><Trash2 size={12}/> Delete Bill</button>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded text-sm">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 text-sm">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- 4. MAIN APPLICATION --- */

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [intelItems, setIntelItems] = useState([]);
  const [bills, setBills] = useState(INITIAL_BILLS);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLog, setScanLog] = useState([]); 
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [warRoomItem, setWarRoomItem] = useState(null);
  
  // Bill Management State
  const [showBillModal, setShowBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewingCitation, setViewingCitation] = useState(null);
  const [chatHistory, setChatHistory] = useState([
    { role: 'model', text: "**System Online.** Welcome back, Rep. Penner. I am ready to assist with legislative analysis or political strategy." }
  ]);
  const chatEndRef = useRef(null);
  const [scanLogExpanded, setScanLogExpanded] = useState(false);

  // RSS Logic
  const fetchFeeds = async () => {
    setIsScanning(true);
    setScanLog(prev => ["Starting live scan...", ...prev]);
    let allItems = [];

    const fetchPromises = FEED_CONFIG.map(async (feed) => {
      try {
        setScanLog(prev => [`Requesting: ${feed.name}...`, ...prev]);
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&api_key=`); 
        const data = await response.json();
        
        if (data.status !== 'ok') throw new Error("Feed parsing failed");
        
        const items = data.items.slice(0, 3).map(item => ({
            id: Math.random().toString(36).substr(2, 9),
            title: item.title,
            source: feed.name,
            url: item.link,
            summary: item.description?.replace(/<[^>]*>?/gm, '').slice(0, 150) + "..." || "No summary.",
            score: Math.floor(Math.random() * 5) + 3,
            date: new Date(item.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));

        setScanLog(prev => [`${feed.name}: Found ${items.length} items.`, ...prev]);
        return items;
      } catch (err) {
        setScanLog(prev => [`${feed.name}: FAILED - ${err.message}`, ...prev]);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    allItems = results.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setIntelItems(allItems);
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
    
    let context = activeTab === 'intelligence' ? 'political' : 'policy';
    const response = await callGemini(prompt, context);
    setChatHistory(prev => [...prev, { role: 'model', text: response || "I'm having trouble connecting. Please check your API key." }]);
    setIsGenerating(false);
  };

  const quickAction = (action, item) => {
    setShowAIPanel(true);
    setAiPrompt(`${action}: "${item}"`);
  };

  const handleSaveBill = (billData) => {
    if (editingBill) {
      // Update existing
      setBills(prev => prev.map(b => b.id === billData.id ? billData : b));
    } else {
      // Add new
      setBills(prev => [billData, ...prev]);
    }
    setEditingBill(null);
  };

  const DashboardHome = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={20}/></div><span className="text-xs font-bold text-slate-400">ACTIVE</span></div>
          <div className="text-3xl font-bold text-slate-900">{bills.length}</div>
          <div className="text-sm text-slate-500">Sponsored Bills</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2"><div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20}/></div><span className="text-xs font-bold text-slate-400">ROLE</span></div>
          <div className="text-3xl font-bold text-slate-900">Approp.</div>
          <div className="text-sm text-slate-500">Asst. Ranking Member</div>
        </div>
        <div className="bg-white p-5 rounded-xl border-l-4 border-l-red-500 border-y border-r border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-2 opacity-5"><ShieldAlert size={60} /></div>
           <div className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Critical Intel</div>
           <div className="text-3xl font-bold text-red-600">{intelItems.length}</div>
           <div className="text-sm text-slate-500">Active Stories</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 rounded-xl text-white shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowAIPanel(true)}>
           <div className="flex items-center gap-2 mb-2"><Sparkles size={18} className="text-yellow-300" /><span className="font-bold text-sm tracking-wider">AI ASSISTANT</span></div>
           <div className="text-sm opacity-90 leading-snug">"Analyze the dental pilot bill (HB 2202)?"</div>
           <div className="mt-3 text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded">Click to Ask</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calendar size={18} className="text-slate-400"/> Committee Schedule</h3>
            <button onClick={() => setActiveTab('committees')} className="text-xs font-bold text-blue-600 hover:underline">VIEW CALENDAR</button>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="p-4 flex items-center hover:bg-slate-50">
               <div className="flex flex-col items-center w-14 mr-4 border-r border-slate-100 pr-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">MON</span><span className="text-lg font-bold text-slate-800">12</span>
               </div>
               <div className="flex-1"><h4 className="text-sm font-semibold text-slate-900">Appropriations: Work Session</h4><div className="text-xs text-slate-500 flex gap-2"><span className="flex items-center gap-1"><Clock size={12}/> 3:30 PM</span><span className="flex items-center gap-1"><MapPin size={12}/> JLOB 315</span></div></div>
            </div>
            <div className="p-4 flex items-center hover:bg-slate-50">
               <div className="flex flex-col items-center w-14 mr-4 border-r border-slate-100 pr-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">TUE</span><span className="text-lg font-bold text-slate-800">13</span>
               </div>
               <div className="flex-1"><h4 className="text-sm font-semibold text-slate-900">Finance: Public Hearing</h4><div className="text-xs text-slate-500 flex gap-2"><span className="flex items-center gap-1"><Clock size={12}/> 8:00 AM</span><span className="flex items-center gap-1"><MapPin size={12}/> JLOB 317</span></div></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Globe size={18} className="text-slate-400"/> Vantage Feed</h3>
            <button onClick={fetchFeeds} disabled={isScanning} className="text-slate-400 hover:text-blue-600"><RefreshCw size={14} className={isScanning ? "animate-spin" : ""}/></button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-2">
            {intelItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">{isScanning ? 'Scanning...' : 'No active alerts.'}</div>
            ) : (
              intelItems.slice(0, 5).map((item) => (
                <div key={item.id} className="p-3 rounded border border-slate-100 hover:border-blue-200 hover:bg-slate-50 transition-all cursor-pointer group" onClick={() => setWarRoomItem(item)}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">{item.source}</span>
                    <span className="text-[10px] text-slate-400">{item.date}</span>
                  </div>
                  <a href={item.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm font-medium text-slate-900 leading-snug group-hover:text-blue-700 hover:underline flex items-center gap-1">{item.title} <ExternalLink size={10} className="opacity-50"/></a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const LegislationView = () => {
    const [filterRole, setFilterRole] = useState('All');
    const [hidePassed, setHidePassed] = useState(true);
    const [sortKey, setSortKey] = useState('status');

    const filteredBills = bills.filter(b => {
      const matchesRole = filterRole === 'All' || b.role.includes(filterRole);
      // Check for "Passed" indicators
      const isPassed = b.status.includes('Signed') || b.status.includes('Passed') || b.status.includes('Vetoed') || b.status.startsWith('C ');
      const matchesPassed = hidePassed ? !isPassed : true;
      return matchesRole && matchesPassed;
    });
    
    const sortedBills = [...filteredBills].sort((a, b) => a[sortKey].localeCompare(b[sortKey]));

    const getBillUrl = (billId, year) => {
        const number = billId.replace(/[^0-9]/g, '');
        return `https://app.leg.wa.gov/billsummary/?BillNumber=${number}&Year=${year || 2025}&Initiative=false`;
    };

    return (
      <div className="animate-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div><h2 className="text-2xl font-bold text-slate-900">Legislation Tracker</h2><p className="text-slate-500 text-sm">Managing {bills.length} sponsored bills</p></div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 mr-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer" onClick={() => setHidePassed(!hidePassed)}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${hidePassed ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-400'}`}>
                   {hidePassed && <CheckCircle size={10} className="text-white"/>}
                </div>
                <span className="text-xs font-bold text-slate-600 select-none">Hide Passed</span>
             </div>
             
             <div className="flex bg-white rounded-lg border border-slate-300 p-1">
                {['All', 'Primary', 'Co-Sponsor'].map(role => (
                   <button key={role} onClick={() => setFilterRole(role)} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${filterRole === role ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{role}</button>
                ))}
             </div>
             <button onClick={() => { setEditingBill(null); setShowBillModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm"><Plus size={16}/> Add Bill</button>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  {['id', 'title', 'sponsor', 'committee', 'status', 'year'].map(head => (
                     <th key={head} onClick={() => setSortKey(head)} className="px-6 py-4 cursor-pointer hover:text-slate-800 capitalize select-none group transition-colors">
                        <div className="flex items-center gap-1">
                          {head === 'id' ? 'Bill #' : head === 'sponsor' ? 'Primary Sponsor' : head} 
                          {sortKey === head ? <ChevronDown size={14} className="text-blue-500"/> : <ListFilter size={12} className="text-slate-300 opacity-0 group-hover:opacity-100"/>}
                        </div>
                     </th>
                  ))}
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedBills.length === 0 ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic">No bills match your current filters.</td></tr>
                ) : (
                  sortedBills.map((bill, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">
                          <a href={getBillUrl(bill.id, bill.year)} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                              {bill.id} <ExternalLink size={10} className="opacity-50"/>
                          </a>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                         {bill.title}
                         <div className="text-[10px] text-slate-500 mt-1">{bill.role}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{bill.sponsor}</td>
                      <td className="px-6 py-4 text-slate-600">{bill.committee}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${bill.status.includes('Passed') || bill.status.includes('Signed') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{bill.status}</span></td>
                      <td className="px-6 py-4 text-slate-500">{bill.year}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingBill(bill); setShowBillModal(true); }} className="p-1.5 hover:bg-slate-200 text-slate-600 rounded" title="Edit Bill"><Edit2 size={16}/></button>
                          <button onClick={() => quickAction("Draft email to constituent re", bill.id)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded" title="Email"><Mail size={16}/></button>
                          <button onClick={() => quickAction("Analyze fiscal impact of", bill.id)} className="p-1.5 hover:bg-purple-100 text-purple-600 rounded" title="AI Analysis"><Sparkles size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const IntelligenceView = () => (
    <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div><h2 className="text-2xl font-bold text-slate-900">Vantage Intelligence</h2><p className="text-slate-500 text-sm">Real-time media monitoring</p></div>
        <div className="flex gap-2">
           <button onClick={fetchFeeds} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><RefreshCw size={16} className={isScanning ? "animate-spin" : ""}/> Scan</button>
           <button onClick={() => quickAction("Draft daily briefing based on", "current intel feed")} className="bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><FileText size={16}/> Briefing</button>
        </div>
      </div>
      
      {/* Expandable Debug Log */}
      <div className={`bg-slate-900 text-green-400 rounded-lg mb-4 text-xs font-mono border border-slate-700 shadow-inner transition-all duration-300 ${scanLogExpanded ? 'h-64' : 'h-12'} overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-950 cursor-pointer" onClick={() => setScanLogExpanded(!scanLogExpanded)}>
           <div className="flex items-center gap-2 font-bold text-white"><Terminal size={12}/> SYSTEM LOG</div>
           {scanLogExpanded ? <Minimize2 size={14} className="text-slate-400"/> : <Maximize2 size={14} className="text-slate-400"/>}
        </div>
        <div className="p-2 overflow-y-auto flex-1">
           {scanLog.map((log, i) => <div key={i} className="opacity-80 mb-1">{'>'} {log}</div>)}
           {scanLog.length === 0 && <div className="opacity-50 italic">System ready.</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 flex-1 overflow-y-auto pb-4">
        {intelItems.length === 0 && !isScanning ? (
            <div className="text-center py-20 text-slate-400">
                <Activity size={48} className="mx-auto mb-4 opacity-20"/>
                <p>No intelligence found. Check system log for feed errors.</p>
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
                 <h3 className="text-lg font-bold text-slate-900 mb-2">
                   <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline hover:text-blue-700 flex items-center gap-2">{item.title} <ExternalLink size={16} className="text-slate-400"/></a>
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
    const [docInput, setDocInput] = useState('');
    const [analysisResult, setAnalysisResult] = useState('');

    const committees = MY_COMMITTEES;

    const handleAnalysis = async () => {
       if (!docInput.trim()) return;
       setAnalyzing(true);
       const prompt = `Analyze this legislative document content: "${docInput.substring(0, 5000)}"
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
                <button key={key} onClick={() => setSelectedComm(key)} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${selectedComm === key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{data.name}</button>
             ))}
          </div>
        </div>
        <div className="flex-1 flex gap-6 overflow-hidden">
           <div className="w-full md:w-1/3 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                 <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">Document Input</h3>
                 <p className="text-xs text-slate-500">Paste the text of a bill, amendment, or fiscal note below.</p>
              </div>
              <div className="flex-1 p-4 flex flex-col">
                 <textarea className="flex-1 w-full border border-slate-200 rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-blue-500 resize-none" placeholder="Paste document text here..." value={docInput} onChange={(e) => setDocInput(e.target.value)} />
                 <button onClick={handleAnalysis} disabled={analyzing || !docInput} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                    {analyzing ? <Loader size={16} className="animate-spin"/> : <Sparkles size={16}/>} {analyzing ? 'Analyzing...' : 'Run Analysis'}
                 </button>
              </div>
           </div>
           <div className="flex-1 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-6 overflow-y-auto relative">
              {!analysisResult ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200"><FileText size={32} className="text-slate-300"/></div>
                    <p className="font-bold">Ready to Analyze</p>
                    <p className="text-sm mt-1">Paste text on the left to generate insights.</p>
                 </div>
              ) : (
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-4 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
                       <div className="flex items-center gap-2"><Sparkles size={16} className="text-yellow-300"/><span className="font-bold text-sm">Vantage Analysis</span></div>
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
      <div className="mb-8"><h2 className="text-2xl font-bold text-slate-900">System Settings</h2><p className="text-slate-500 text-sm">Configure Vantage preferences.</p></div>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Profile</h3>
          <div className="flex items-center gap-4 mb-4">
             <div className="w-16 h-16 bg-slate-800 rounded-full text-white flex items-center justify-center text-xl font-bold">JP</div>
             <div><div className="font-bold text-slate-900">Rep. Josh Penner</div><div className="text-sm text-slate-500">31st Legislative District</div></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {viewingCitation && <DocumentViewer citation={viewingCitation} onClose={() => setViewingCitation(null)} />}
      {warRoomItem && <WarRoomModal item={warRoomItem} onClose={() => setWarRoomItem(null)} />}
      {showBillModal && <AddEditBillModal onClose={() => { setShowBillModal(false); setEditingBill(null); }} onSave={handleSaveBill} initialBill={editingBill} />}

      <aside className="w-20 md:w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20 flex-shrink-0 transition-all duration-300">
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/50">V</div>
          <div className="hidden md:block"><h1 className="text-white font-bold tracking-wider">VANTAGE</h1><p className="text-[10px] text-slate-500 uppercase tracking-widest">Command OS v2.0</p></div>
        </div>
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          {[{ id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' }, { id: 'legislation', icon: FileText, label: 'Legislation' }, { id: 'committees', icon: Users, label: 'Committees' }, { id: 'intelligence', icon: Globe, label: 'Intelligence' }].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-4 md:px-6 py-3 transition-all ${activeTab === item.id ? 'bg-slate-800 text-white border-l-4 border-blue-500' : 'hover:bg-slate-800/50 hover:text-white border-l-4 border-transparent'}`}>
              <item.icon size={20} className={activeTab === item.id ? "text-blue-400" : "text-slate-500"} /><span className="hidden md:block font-medium">{item.label}</span>
            </button>
          ))}
          <div className="my-4 border-t border-slate-800 pt-4 px-4 md:px-6">
             <div className="text-[10px] font-bold uppercase text-slate-600 mb-2 hidden md:block">System</div>
             <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 py-2 hover:text-white transition-colors ${activeTab === 'settings' ? 'text-white' : ''}`}><Settings size={18}/><span className="hidden md:block">Settings</span></button>
          </div>
        </nav>
        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
           <button onClick={() => setShowAIPanel(!showAIPanel)} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white p-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg transition-all"><Sparkles size={18} className="text-yellow-300" /><span className="hidden md:block">Vantage Assistant</span></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 capitalize flex items-center gap-2">{activeTab} {activeTab === 'intelligence' && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Live Feed</span>}</h2>
          <div className="flex items-center gap-4">
             <div className="relative hidden md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input className="pl-9 pr-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all" placeholder="Search database..." /></div>
             <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full"><Bell size={20}/><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span></button>
             <div className="w-8 h-8 bg-slate-800 rounded-full text-white flex items-center justify-center text-xs font-bold">JP</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
           {activeTab === 'dashboard' && <DashboardHome />}
           {activeTab === 'legislation' && <LegislationView />}
           {activeTab === 'intelligence' && <IntelligenceView />}
           {activeTab === 'committees' && <CommitteeAnalysisView />}
           {activeTab === 'settings' && <SettingsView />}
        </div>

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
