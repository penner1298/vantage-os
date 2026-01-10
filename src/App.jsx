import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
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
  Trash2,
  Eye,
  FileDown,
  File,
  FolderOpen,
  HardDrive,
  CheckSquare,
  Square,
  MessageSquare,
  FileType,
  Save,
  PlusCircle,
  RefreshCcw,
  SearchCode,
  BookOpen,
  Table,
  Play
} from 'lucide-react';

/* --- 0. CONFIGURATION & UTILITIES --- */

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_nACVi5RzeOjqGtbelPnrDmX9gE270omfN1zqsLZAVNOxaJ1VPdCF7DWgQbMQ4kngFw/exec"; 
const GOOGLE_SCRIPT_SECRET = "my-secret-password";
const GOOGLE_SHEET_ID = "1RNiCiYFUp8KLzxZY3DaEbLEH3afoYHUbHa-wCF4BEYE";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv`;

// PDF Text Extractor
const extractTextFromPDF = async (url) => {
  try {
    if (!window.pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      document.head.appendChild(script);
      await new Promise(resolve => script.onload = resolve);
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const loadingTask = window.pdfjsLib.getDocument(proxyUrl);
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    const maxPages = Math.min(pdf.numPages, 10); 
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n[Page ${i}]\n${pageText}`;
    }
    return fullText;
  } catch (error) {
    console.error("PDF Extraction Failed:", error);
    return null;
  }
};

// Robust Fetch
const fetchProxyContent = async (targetUrl) => {
  const tryAllOrigins = async () => {
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error(`AllOrigins status: ${response.status}`);
    const data = await response.json();
    return data.contents;
  };
  const tryCorsProxy = async () => {
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error(`CorsProxy status: ${response.status}`);
    return await response.text();
  };
  try { return await tryAllOrigins(); } 
  catch (e) { return await tryCorsProxy(); }
};

/* --- 1. CONFIGURATION --- */

let apiKey = "";
try {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  }
} catch (e) { console.warn("Env vars issue"); }

const callGemini = async (prompt, systemContext = "general", retries = 3) => {
  if (!apiKey) return null;
  const systemPrompts = {
    general: "You are Vantage, a legislative Chief of Staff. Be professional, strategic, and concise.",
    political: "You are a political strategist. Focus on public perception, polling impact, and media narrative.",
    policy: "You are a legislative analyst. Focus on statutory interpretation, fiscal impact, and legal nuance. Use provided document text to answer questions.",
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

let firebaseConfig = {};
try {
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
  } else if (typeof import.meta !== 'undefined' && import.meta.env) {
    firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  }
} catch (e) {}

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'vantage-os-production';
const appId = rawAppId.replace(/\//g, '_');

let app, auth, db;
try {
  if (firebaseConfig && firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch(e) { console.error("Firebase Init Failed", e); }

const FEED_CONFIG = [
  { url: "https://housedemocrats.wa.gov/feed/", name: "House Dems", category: "Official" },
  { url: "https://senatedemocrats.wa.gov/feed/", name: "Senate Dems", category: "Official" },
  { url: "https://houserepublicans.wa.gov/feed/", name: "House GOP", category: "Official" },
  { url: "https://src.wastateleg.org/feed/", name: "Senate GOP", category: "Official" },
  { url: "https://www.thestranger.com/feed", name: "The Stranger", category: "Partisan" }, 
  { url: "https://www.seattletimes.com/opinion/feed/", name: "Seattle Times Op", category: "Media" },
  { url: "https://www.spokesman.com/feeds/stories/", name: "Spokesman Main", category: "Media" }
];

/* --- 2. BILL WORKSPACE COMPONENT --- */

const BillWorkspace = ({ bill, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('summary'); 
  const [summaryText, setSummaryText] = useState(bill.summary || "No summary available. Check 'Documents' to load files from Drive.");
  const [documents, setDocuments] = useState(bill.documents || []);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  // Auto-save changes
  useEffect(() => {
    const timer = setTimeout(() => {
        if(summaryText !== bill.summary || documents.length !== (bill.documents?.length || 0)) {
            onSave({ ...bill, summary: summaryText, documents });
        }
    }, 1000);
    return () => clearTimeout(timer);
  }, [summaryText, documents]);

  const toggleDocSelect = (id) => {
      const newSet = new Set(selectedDocIds);
      if(newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedDocIds(newSet);
  };

  // CALL GOOGLE SCRIPT TO GET FILE LIST FROM DRIVE
  const fetchDriveFiles = async () => {
    setIsScanning(true);
    setStatusMsg("Connecting to Drive API...");
    
    try {
       // Using CorsProxy to hit your Web App
       const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(GOOGLE_SCRIPT_URL)}`;
       
       // Sending command to your script to look up files for this bill ID
       const res = await fetch(proxyUrl, {
           method: 'POST',
           body: JSON.stringify({ 
               action: "get_bill_files", 
               billId: bill.id.replace(/[^0-9]/g, ''), 
               secret: GOOGLE_SCRIPT_SECRET 
           })
       });
       
       const json = await res.json();
       
       if(json.status === "success" && json.files) {
           const newDocs = json.files.map(f => {
               // Convert drive viewer link to direct download link for processing
               const downloadUrl = `https://drive.google.com/uc?export=download&id=${f.id}`;
               
               return {
                   id: f.id,
                   title: f.name,
                   type: f.name.toLowerCase().includes("fiscal") ? "Fiscal Note" : "Document",
                   url: f.url, // Viewer link
                   downloadUrl: downloadUrl, 
                   content: "", // Will be filled if analyzed
                   date: new Date().toLocaleDateString()
               };
           });
           setDocuments(newDocs);
           onSave({ ...bill, documents: newDocs });
           setStatusMsg(`Synced ${newDocs.length} files from Drive.`);
       } else {
           setStatusMsg("No files returned. Check Drive folder name.");
       }
    } catch (e) {
        console.error(e);
        setStatusMsg("API Error. Please open Drive directly.");
    } finally {
        setIsScanning(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if(!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatLog(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsThinking(true);

    let context = `Active Bill: ${bill.id} - ${bill.title}\n`;
    context += `Current Summary: ${summaryText}\n\n`;
    
    const relevantDocs = documents.filter(d => selectedDocIds.has(d.id));
    
    let docsContext = "";
    if (relevantDocs.length > 0) {
        setStatusMsg("Reading selected docs...");
        for (const d of relevantDocs) {
             if (d.content) {
                 docsContext += `--- ${d.title} ---\n${d.content.substring(0, 3000)}...\n\n`;
             } else if (d.downloadUrl) {
                 // Try to read it now
                 try {
                    const text = await extractTextFromPDF(d.downloadUrl);
                    if (text) {
                        d.content = text; 
                        docsContext += `--- ${d.title} ---\n${text.substring(0, 3000)}...\n\n`;
                    } else {
                        docsContext += `--- ${d.title} ---\n(Could not auto-read PDF content. URL: ${d.url})\n\n`;
                    }
                 } catch(e) {
                     docsContext += `--- ${d.title} ---\n(Error reading PDF)\n\n`;
                 }
             }
        }
        setStatusMsg("Ready.");
    }

    if (docsContext) {
        context += `SELECTED DOCUMENTS CONTENT:\n${docsContext}`;
    } else {
        context += `(No specific documents selected. Using general context.)`;
    }

    const prompt = `Context:\n${context}\n\nUser Question: ${userMsg}`;
    const response = await callGemini(prompt, 'policy');
    
    setChatLog(prev => [...prev, { role: 'model', text: response }]);
    setIsThinking(false);
  };

  const openDriveFolder = () => {
      // Smart search for folder by name using bill ID
      const searchUrl = `https://drive.google.com/drive/u/0/search?q=type:folder%20${bill.id}`;
      window.open(searchUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
           <div>
              <div className="flex items-center gap-2">
                 <span className="bg-blue-600 text-xs font-bold px-2 py-0.5 rounded">{bill.year}</span>
                 <h2 className="text-xl font-bold tracking-wide">{bill.id}</h2>
              </div>
              <p className="text-sm text-slate-300 truncate max-w-xl">{bill.title}</p>
           </div>
           <button onClick={onClose}><X className="hover:text-red-400"/></button>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 flex gap-1">
            {['summary', 'docs', 'chat'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    {tab === 'summary' && <span className="flex items-center gap-2"><FileText size={16}/> Summary</span>}
                    {tab === 'docs' && <span className="flex items-center gap-2"><FolderOpen size={16}/> Documents ({documents.length})</span>}
                    {tab === 'chat' && <span className="flex items-center gap-2"><Sparkles size={16}/> AI Analysis</span>}
                </button>
            ))}
            <div className="ml-auto flex items-center">
                 <button onClick={openDriveFolder} className="text-xs flex items-center gap-1 text-slate-500 hover:text-green-600 font-bold px-3 py-1">
                     <HardDrive size={14}/> Open Folder
                 </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-50 relative">
            
            {/* SUMMARY TAB */}
            {activeTab === 'summary' && (
                <div className="h-full p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Brief Breaker / Summary</label>
                        <span className="text-xs text-green-600 font-medium animate-pulse">{statusMsg}</span>
                    </div>
                    <textarea 
                        className="flex-1 w-full border border-slate-200 rounded-lg p-6 text-sm font-serif leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={summaryText}
                        onChange={(e) => setSummaryText(e.target.value)}
                        placeholder="Start typing your summary here..."
                    />
                </div>
            )}

            {/* DOCUMENTS TAB */}
            {activeTab === 'docs' && (
                <div className="h-full p-6 flex flex-col">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800">Documents in Google Drive</h3>
                        <button onClick={fetchDriveFiles} disabled={isScanning} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                            {isScanning ? <Loader size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                            {isScanning ? "Scanning..." : "Scan Folder"}
                        </button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto space-y-2">
                        {documents.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                                <FolderOpen size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>No files tracked yet.</p>
                                <p className="text-xs">Click 'Scan Folder' to pull file list from Google Drive.</p>
                            </div>
                        ) : (
                            documents.map((doc, i) => (
                                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => toggleDocSelect(doc.id)} className="text-slate-400 hover:text-blue-600">
                                            {selectedDocIds.has(doc.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20}/>}
                                        </button>
                                        <div className={`p-2 rounded bg-slate-100 text-slate-500`}>
                                            <FileText size={20}/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{doc.title}</div>
                                            <div className="text-xs text-slate-500 flex gap-2">
                                                <span>{doc.type}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Open in Google Drive">
                                            <ExternalLink size={18}/>
                                        </a>
                                    </div>
                                </div>
                            ))
                        )}
                     </div>
                </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
                <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {chatLog.length === 0 && (
                            <div className="text-center text-slate-400 py-10">
                                <Sparkles size={32} className="mx-auto mb-2 text-yellow-400"/>
                                <p>Ready to discuss {bill.id}.</p>
                                <p className="text-xs">Select documents in the 'Documents' tab. I'll attempt to read them for context.</p>
                            </div>
                        )}
                        {chatLog.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-xl text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isThinking && <div className="flex items-center gap-2 text-slate-400 text-xs p-4"><Loader size={14} className="animate-spin"/> Thinking...</div>}
                    </div>
                    <div className="p-4 bg-white border-t border-slate-200">
                        <form onSubmit={handleChat} className="relative">
                            <input 
                                className="w-full pl-4 pr-12 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                placeholder="Ask about this bill..." 
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                            />
                            <button type="submit" disabled={isThinking} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"><Send size={16}/></button>
                        </form>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};


/* --- 3. MAIN APP --- */

export default function App() {
  const [activeTab, setActiveTab] = useState('legislation'); // Default to Legislation
  const [bills, setBills] = useState([]);
  const [intelItems, setIntelItems] = useState([]);
  const [user, setUser] = useState(null);
  const [workspaceBill, setWorkspaceBill] = useState(null);
  const [warRoomItem, setWarRoomItem] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [docInput, setDocInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [sortKey, setSortKey] = useState('id');

  // Auth & Sync
  useEffect(() => {
    if(!auth) return;
    signInAnonymously(auth);
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    // 1. Initial Load from Sheet
    fetchSheetData();

    // 2. Setup Firebase Sync for User Overrides
    if (!user || !db) return;
    const billsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'bills');
    const unsubscribe = onSnapshot(billsRef, (snapshot) => {
        const userBills = snapshot.docs.map(doc => doc.data());
        // Merge: Update the sheet data with local overrides if IDs match
        setBills(prev => {
            const merged = [...prev];
            userBills.forEach(ub => {
                const idx = merged.findIndex(p => p.id === ub.id);
                if(idx >= 0) merged[idx] = ub;
                else merged.push(ub);
            });
            return merged;
        });
    });
    return () => unsubscribe();
  }, [user]);

  const fetchSheetData = async () => {
      setIsScanning(true);
      try {
          const response = await fetch(SHEET_CSV_URL);
          const text = await response.text();
          const rows = text.split('\n').slice(1); // Skip header
          const parsedBills = rows.map(row => {
              // CSV Parse
              const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
              const clean = (s) => s ? s.replace(/^"|"$/g, '').trim() : '';
              
              if(cols.length < 5) return null;

              return {
                  id: clean(cols[0]),
                  title: clean(cols[1]),
                  sponsor: clean(cols[2]),
                  committee: clean(cols[3]),
                  year: clean(cols[4]),
                  status: clean(cols[5]),
                  summary: clean(cols[1]), // Default summary to title
                  role: clean(cols[2]).includes('Penner') ? 'Sponsor' : 'Watching',
                  documents: []
              };
          }).filter(b => b && b.id);
          
          if(parsedBills.length > 0) setBills(parsedBills);
      } catch (e) {
          console.error("Sheet Load Error", e);
      }
      setIsScanning(false);
  };

  // Actions
  const handleSaveBill = async (bill) => {
      // Update local state immediately
      setBills(prev => prev.map(b => b.id === bill.id ? bill : b));
      
      // Persist specific bill data (docs, chat) to Cloud
      if(!user || !db) return;
      try {
          const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'bills', bill.id);
          // Only save specific fields to avoid overwriting sheet data on reload if structure differs
          await setDoc(ref, { 
              id: bill.id,
              documents: bill.documents || [],
              summary: bill.summary
          }, { merge: true });
      } catch(e) { console.error("Save failed", e); }
  };

  const handleRunDriveTool = async () => {
      if(!GOOGLE_SCRIPT_URL) return;
      setIsScanning(true);
      try {
          // Trigger Google Apps Script via blind POST (no-cors)
          // We can't use proxy for this as it might timeout. Fire and forget.
          await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: "run_all", secret: GOOGLE_SCRIPT_SECRET })
          });
          alert("Drive Maintenance Tool triggered. Updates should appear in your Sheet shortly.");
          // Wait a bit then refresh sheet
          setTimeout(fetchSheetData, 5000);
      } catch(e) {
          alert("Trigger failed.");
      }
      setIsScanning(false);
  };

  const getFilteredBills = () => {
      let filtered = bills;
      if (filterRole !== 'All') {
          if (filterRole === 'My Bills') filtered = bills.filter(b => b.sponsor.includes('Penner'));
      }
      return filtered.sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
  };

  const handleCommitteeAnalysis = async () => {
       if (!docInput.trim()) return;
       const prompt = `Analyze this legislative document content: "${docInput.substring(0, 5000)}"
       1. Executive Summary (2 sentences).
       2. Fiscal Risks for WA State.
       3. 3 Strategic Questions for the Committee Hearing.`;
       const response = await callGemini(prompt, 'policy');
       setAnalysisResult(response);
  };

  const fetchFeeds = async () => {
      setIsScanning(true);
      try {
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=https://www.thestranger.com/feed&api_key=`);
          const data = await res.json();
          if(data.items) {
             setIntelItems(data.items.map(i => ({
                 id: i.guid, title: i.title, source: 'The Stranger', date: i.pubDate, summary: i.description
             })));
          }
      } catch(e) {}
      setIsScanning(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {workspaceBill && (
          <BillWorkspace 
            bill={workspaceBill} 
            onClose={() => setWorkspaceBill(null)} 
            onSave={handleSaveBill} 
          />
      )}
      {warRoomItem && <WarRoomModal item={warRoomItem} onClose={() => setWarRoomItem(null)} />}

      {/* Sidebar */}
      <aside className="w-20 md:w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-800 font-bold text-white tracking-widest text-lg">VANTAGE</div>
        <nav className="flex-1 py-6 space-y-1">
            <button onClick={() => setActiveTab('legislation')} className={`w-full flex items-center gap-4 px-6 py-3 ${activeTab === 'legislation' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}>
                <FileText size={20}/> <span className="hidden md:block">Legislation</span>
            </button>
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-6 py-3 ${activeTab === 'dashboard' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}>
                <LayoutDashboard size={20}/> <span className="hidden md:block">Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('committees')} className={`w-full flex items-center gap-4 px-6 py-3 ${activeTab === 'committees' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}>
                <Users size={20}/> <span className="hidden md:block">Committees</span>
            </button>
            <button onClick={() => setActiveTab('intelligence')} className={`w-full flex items-center gap-4 px-6 py-3 ${activeTab === 'intelligence' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}>
                <Globe size={20}/> <span className="hidden md:block">Intelligence</span>
            </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
            <h2 className="text-lg font-bold text-slate-800 capitalize">{activeTab}</h2>
            <div className="flex items-center gap-4">
               {/* Global Search placeholder */}
               <div className="relative hidden md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input className="pl-9 pr-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all" placeholder="Search database..." /></div>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
            {/* LEGISLATION TAB */}
            {activeTab === 'legislation' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                             <button onClick={() => setFilterRole('All')} className={`px-3 py-1 text-xs rounded-full border ${filterRole === 'All' ? 'bg-slate-800 text-white' : 'bg-white'}`}>All Bills</button>
                             <button onClick={() => setFilterRole('My Bills')} className={`px-3 py-1 text-xs rounded-full border ${filterRole === 'My Bills' ? 'bg-slate-800 text-white' : 'bg-white'}`}>My Sponsorships</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={fetchSheetData} disabled={isScanning} className="text-blue-600 text-xs font-bold flex items-center gap-1">
                                <RefreshCcw size={12} className={isScanning ? "animate-spin" : ""}/> Refresh Sheet
                            </button>
                            <button onClick={handleRunDriveTool} className="text-green-600 text-xs font-bold flex items-center gap-1 border border-green-200 px-2 py-1 rounded hover:bg-green-50">
                                <Play size={12}/> Run Drive Tool
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer" onClick={() => setSortKey('id')}>Bill</th>
                                    <th className="px-6 py-4 cursor-pointer" onClick={() => setSortKey('title')}>Title</th>
                                    <th className="px-6 py-4 cursor-pointer" onClick={() => setSortKey('sponsor')}>Sponsor</th>
                                    <th className="px-6 py-4 cursor-pointer" onClick={() => setSortKey('committee')}>Committee</th>
                                    <th className="px-6 py-4 cursor-pointer" onClick={() => setSortKey('status')}>Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {getFilteredBills().length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading Bills from Sheet...</td></tr>
                                ) : (
                                    getFilteredBills().map(bill => (
                                        <tr key={bill.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setWorkspaceBill(bill)}>
                                            <td className="px-6 py-4 font-mono font-bold text-blue-600">{bill.id}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900 truncate max-w-xs" title={bill.title}>{bill.title}</td>
                                            <td className="px-6 py-4 text-slate-600">{bill.sponsor}</td>
                                            <td className="px-6 py-4 text-slate-500">{bill.committee}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${bill.status.includes('Passed') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {bill.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Total Bills</h3>
                        <div className="text-3xl font-bold text-slate-900">{bills.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">My Sponsorships</h3>
                        <div className="text-3xl font-bold text-slate-900">{bills.filter(b => b.sponsor.includes("Penner")).length}</div>
                    </div>
                </div>
            )}

            {/* COMMITTEES TAB (Restored) */}
            {activeTab === 'committees' && (
                <div className="flex gap-6 h-full">
                    <div className="w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
                        <h3 className="font-bold mb-2">Document Input</h3>
                        <textarea className="flex-1 w-full border rounded p-2 text-xs mb-2" placeholder="Paste document text here..." value={docInput} onChange={e => setDocInput(e.target.value)} />
                        <button onClick={handleCommitteeAnalysis} className="bg-blue-600 text-white py-2 rounded text-sm font-bold">Analyze</button>
                    </div>
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto">
                        <h3 className="font-bold mb-4">Analysis Result</h3>
                        <div className="whitespace-pre-wrap text-sm text-slate-700">{analysisResult || "Ready to analyze."}</div>
                    </div>
                </div>
            )}

            {/* INTELLIGENCE TAB (Restored) */}
            {activeTab === 'intelligence' && (
                 <div className="space-y-4">
                     <button onClick={fetchFeeds} className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 w-fit">
                        {isScanning ? <Loader size={16} className="animate-spin"/> : <RefreshCw size={16}/>} Refresh Feeds
                     </button>
                     <div className="grid grid-cols-1 gap-4">
                        {intelItems.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-xl border shadow-sm cursor-pointer hover:shadow-md" onClick={() => setWarRoomItem(item)}>
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">{item.source}</div>
                                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                                <p className="text-sm text-slate-600 line-clamp-2">{item.summary}</p>
                            </div>
                        ))}
                     </div>
                 </div>
            )}
        </div>
      </main>
    </div>
  );
}
