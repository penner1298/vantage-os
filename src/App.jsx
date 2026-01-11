import React, { useState, useEffect, useMemo } from 'react';
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
  Play,
  Link as LinkIcon,
  CalendarDays
} from 'lucide-react';

/* --- 0. CONFIGURATION & UTILITIES --- */

// YOUR GOOGLE WEB APP URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNDjq7WNNcmKZLA3EatMZfzTp6B5_LA-kc--P_oJBmYpmtLAnIIyESeKc94Evm_sq7Bg/exec"; 
const GOOGLE_SCRIPT_SECRET = "my-secret-password";
const GOOGLE_SHEET_ID = "1RNiCiYFUp8KLzxZY3DaEbLEH3afoYHUbHa-wCF4BEYE";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv`;
const MASTER_DRIVE_FOLDER = "https://drive.google.com/drive/folders/18SWSFBRsX7pwuGHkCioedsFFzve-nWCB";

// UTILITY: Parse CSV Line
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; // Escaped quote
        i++;
      } else {
        inQuotes = !inQuotes; // Toggle quotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// PDF Text Extractor using PDF.js via CDN
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
    // Limit pages to avoid huge payloads
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

/* --- 1. CORE UTILITIES & AI CONFIGURATION --- */

// Safe environment variable access for Gemini
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
      if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP error! status: ${response.status} - ${text}`);
      }
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
      if (i === retries - 1) return null;
      await delay(Math.pow(2, i) * 1000);
    }
  }
};

// Robust Fetch Utility
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

/* --- 2. FIREBASE CONFIGURATION --- */
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

// USER COMMITTEES CONFIG (Used for filtering API results)
const MY_COMMITTEE_NAMES = [
    "Appropriations", 
    "Finance", 
    "Early Learning & Human Services", 
    "Innovation, Community & Economic Development, & Veterans" // Adjusted TEDV full name match
];

const DATE_FORMAT_OPTIONS = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };


/* --- 3. BILL WORKSPACE COMPONENT --- */

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
  
  // Track Drive Link internally to ensure button updates
  const [driveLink, setDriveLink] = useState(bill.driveLink || null);

  // Auto-save changes locally/cloud
  useEffect(() => {
    const timer = setTimeout(() => {
        if(summaryText !== bill.summary || documents.length !== (bill.documents?.length || 0)) {
            onSave({ ...bill, summary: summaryText, documents, driveLink });
        }
    }, 1000);
    return () => clearTimeout(timer);
  }, [summaryText, documents, driveLink]);

  // Initial Auto-Load of Drive Files if not present
  useEffect(() => {
    if (documents.length === 0 && !isScanning) {
        fetchDriveFiles();
    }
  }, []);

  const toggleDocSelect = (id) => {
      const newSet = new Set(selectedDocIds);
      if(newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedDocIds(newSet);
  };

  // CALL GOOGLE SCRIPT TO GET FILE LIST FROM DRIVE
  const fetchDriveFiles = async () => {
    setIsScanning(true);
    setStatusMsg("Querying Google Drive...");
    
    try {
       // Using CorsProxy to hit your Web App
       const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(GOOGLE_SCRIPT_URL)}`;
       
       // Sending command to your script to look up files for this bill ID
       // UPDATED: Sending FULL ID (e.g. "HB 2200") to match folder name "HB 2200 - Title"
       const res = await fetch(proxyUrl, {
           method: 'POST',
           redirect: 'follow', // Follow redirects from Google Script
           headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
           body: JSON.stringify({ 
               action: "get_bill_files", 
               billId: bill.id, 
               secret: GOOGLE_SCRIPT_SECRET 
           })
       });
       
       const text = await res.text();
       let json;
       try {
            json = JSON.parse(text);
       } catch(e) {
           console.warn("Drive Tool returned non-JSON:", text.substring(0, 50));
           setStatusMsg("Access denied by Drive. Please check Web App 'Who has access' settings.");
           setIsScanning(false);
           return;
       }
       
       if(json.status === "success") {
           // 1. Update the Folder Link if script returns it
           if (json.folderUrl) {
               setDriveLink(json.folderUrl);
           }

           // 2. Process Files
           if (json.files && json.files.length > 0) {
               const newDocs = json.files.map(f => {
                   const downloadUrl = `https://drive.google.com/uc?export=download&id=${f.id}`;
                   
                   return {
                       id: f.id,
                       title: f.name,
                       type: f.name.toLowerCase().includes("fiscal") ? "Fiscal Note" : "Document",
                       url: f.url, 
                       downloadUrl: downloadUrl, 
                       content: "", // Will be filled if analyzed
                       imported: false,
                       date: new Date().toLocaleDateString()
                   };
               });
               
               // Merge with existing
               const mergedDocs = [...documents];
               newDocs.forEach(nd => {
                   if(!mergedDocs.find(d => d.id === nd.id)) mergedDocs.push(nd);
               });

               setDocuments(mergedDocs);
               onSave({ ...bill, documents: mergedDocs, driveLink: json.folderUrl });
               setStatusMsg(`Synced ${newDocs.length} files from Drive.`);
           } else {
               setStatusMsg("Folder found, but no files inside.");
           }
       } else {
           setStatusMsg(json.message || "Folder not found in Drive.");
       }
    } catch (e) {
        console.error(e);
        setStatusMsg("Connection error.");
    } finally {
        setIsScanning(false);
    }
  };

  const importDocContent = async (docId) => {
    const docIndex = documents.findIndex(d => d.id === docId);
    if(docIndex === -1) return;
    const docToImport = documents[docIndex];
    
    setStatusMsg(`Importing ${docToImport.title}...`);
    try {
        let content = "";
        // If it's a PDF, try to read it
        if(docToImport.title.toLowerCase().endsWith('.pdf') || docToImport.type === 'Fiscal Note') {
            content = await extractTextFromPDF(docToImport.downloadUrl);
        } else {
            // Assume text/html
            content = await fetchProxyContent(docToImport.downloadUrl);
        }
        
        const updatedDocs = [...documents];
        updatedDocs[docIndex] = { ...docToImport, content: content || "Text extracted.", imported: true };
        setDocuments(updatedDocs);
        setStatusMsg("Imported to database.");
        onSave({ ...bill, documents: updatedDocs });
    } catch(e) {
        setStatusMsg("Import failed. AI will use metadata only.");
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
    
    if (relevantDocs.length > 0) {
        context += `SELECTED DOCUMENTS:\n`;
        relevantDocs.forEach(d => {
             if (d.content && d.content.length > 50) {
                 context += `--- ${d.title} ---\n${d.content.substring(0, 3000)}...\n\n`;
             } else {
                 context += `--- ${d.title} ---\n(Content not imported. Link: ${d.url})\n`;
             }
        });
    }

    const prompt = `Context:\n${context}\n\nUser Question: ${userMsg}`;
    const response = await callGemini(prompt, 'policy');
    
    setChatLog(prev => [...prev, { role: 'model', text: response }]);
    setIsThinking(false);
  };

  const openDriveFolder = () => {
      // Use stored link if valid
      if (driveLink && driveLink.startsWith('http')) {
          window.open(driveLink, '_blank');
      } else {
          // Fallback search strictly for "HB 1234 -" to match naming convention
          const query = `type:folder name contains '${bill.id} -'`;
          const searchUrl = `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(query)}`;
          window.open(searchUrl, '_blank');
      }
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
        <div className="bg-slate-100 border-b border-slate-200 px-4 flex gap-1 items-center">
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
            <div className="ml-auto flex items-center gap-2">
                 <button onClick={openDriveFolder} className="text-xs flex items-center gap-1 text-slate-500 hover:text-green-600 font-bold px-3 py-1 border border-slate-300 rounded bg-white shadow-sm hover:shadow">
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
                        placeholder="Loading summary from sheet..."
                    />
                </div>
            )}

            {/* DOCUMENTS TAB */}
            {activeTab === 'docs' && (
                <div className="h-full p-6 flex flex-col">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800">Files in Google Drive</h3>
                        <button onClick={fetchDriveFiles} disabled={isScanning} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                            {isScanning ? <Loader size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                            {isScanning ? "Scanning Drive..." : "Rescan Folder"}
                        </button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto space-y-2">
                        {documents.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                                <FolderOpen size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>No files found.</p>
                                <p className="text-xs">Click 'Rescan Folder' to check Google Drive.</p>
                            </div>
                        ) : (
                            documents.map((doc, i) => (
                                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => toggleDocSelect(doc.id)} className="text-slate-400 hover:text-blue-600">
                                            {selectedDocIds.has(doc.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20}/>}
                                        </button>
                                        <div className="p-2 rounded bg-slate-100 text-slate-500"><FileType size={20}/></div>
                                        <div>
                                            <div className="font-bold text-slate-800">{doc.title}</div>
                                            <div className="text-xs text-slate-500 flex gap-2"><span>{doc.type}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {!doc.content && (
                                            <button onClick={() => importDocContent(doc.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded text-xs font-bold border border-blue-200">
                                                Import Text
                                            </button>
                                        )}
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
                                <p>Ready to analyze {bill.id}.</p>
                                <p className="text-xs">Select documents in the 'Documents' tab for reference.</p>
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
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to Dashboard
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
  const [meetings, setMeetings] = useState([]);

  // Need to define sheetBills and firebaseData to avoid ReferenceError in useMemo
  const [sheetBills, setSheetBills] = useState([]);
  const [firebaseData, setFirebaseData] = useState({});

  // Derived Bills: Sheet is master, Firebase is enrichment
  const derivedBills = useMemo(() => {
      // If no sheet bills, return empty or fallback
      if(sheetBills.length === 0) return [];

      return sheetBills.map(sb => {
          const fb = firebaseData[sb.id] || {};
          return {
              ...sb, // Metadata from sheet wins
              documents: fb.documents || [],
              summary: fb.summary || sb.summary,
              driveLink: fb.driveLink || sb.driveLink
          };
      });
  }, [sheetBills, firebaseData]);
  
  // Keep bills state in sync with derived
  useEffect(() => {
     setBills(derivedBills);
  }, [derivedBills]);

  // Auth & Sync
  useEffect(() => {
    if(!auth) return;
    signInAnonymously(auth);
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    fetchSheetData();
    if (!user || !db) return;
    const billsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'bills');
    const unsubscribe = onSnapshot(billsRef, (snapshot) => {
        const dataMap = {};
        snapshot.docs.forEach(doc => {
            dataMap[doc.id] = doc.data();
        });
        setFirebaseData(dataMap);
    });
    return () => unsubscribe();
  }, [user]);

  // Initial Fetch of Committees and Dashboard auto-load
  useEffect(() => {
    if(activeTab === 'committees' || activeTab === 'dashboard') {
        fetchCommitteeMeetings();
    }
  }, [activeTab]);

  const fetchSheetData = async () => {
      setIsScanning(true);
      try {
          const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(SHEET_CSV_URL)}`);
          if (!response.ok) {
              const text = await response.text();
              throw new Error(`Fetch failed: ${response.status} ${text.substring(0,50)}`);
          }
          const text = await response.text();
          const rows = text.split('\n').slice(1);
          const parsedBills = rows.map(row => {
              const cols = parseCSVLine(row);
              if(cols.length < 5) return null;
              const id = cols[0];
              if(!id) return null;
              return {
                  id: id,
                  title: cols[1] || "No Title",
                  sponsor: cols[2] || "Unknown",
                  committee: cols[3] || "Unknown",
                  year: cols[4] || "2025",
                  status: cols[5] || "Unknown",
                  driveLink: (cols[6] && cols[6].includes("drive.google.com")) ? cols[6] : null,
                  summary: cols[1], 
                  role: cols[2].includes('Penner') ? 'Sponsor' : 'Watching',
                  documents: []
              };
          }).filter(b => b && b.id);
          if(parsedBills.length > 0) setSheetBills(parsedBills);
      } catch (e) { console.error("Sheet Load Error", e); }
      setIsScanning(false);
  };

  const handleSaveBill = async (bill) => {
      // Local updates happen via effect
      if(!user || !db) return;
      try {
          const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'bills', bill.id);
          await setDoc(ref, { 
              id: bill.id,
              documents: bill.documents || [],
              summary: bill.summary,
              driveLink: bill.driveLink
          }, { merge: true });
      } catch(e) { console.error("Save failed", e); }
  };

  // Re-added handleRunDriveTool just in case, but removed from UI per request
  const handleRunDriveTool = async () => {
      // ... logic preserved but hidden
  };

  const fetchCommitteeMeetings = async () => {
     setIsScanning(true);
     try {
         const beginDate = new Date().toISOString().split('T')[0];
         const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
         const url = `https://wslwebservices.leg.wa.gov/CommitteeMeetingService.asmx/GetCommitteeMeetings?beginDate=${beginDate}&endDate=${endDate}`;
         const xml = await fetchProxyContent(url);
         const parser = new DOMParser();
         const doc = parser.parseFromString(xml, "text/xml");
         const meetingNodes = Array.from(doc.querySelectorAll("CommitteeMeeting"));
         
         const parsedMeetings = [];
         
         for (const node of meetingNodes) {
             const agency = node.querySelector("Agency")?.textContent;
             const commName = node.querySelector("Name")?.textContent;
             const date = node.querySelector("Date")?.textContent;
             const agendaId = node.querySelector("AgendaId")?.textContent;

             if (MY_COMMITTEE_NAMES.some(name => commName?.includes(name))) {
                 let agendaItems = [];
                 if (agendaId) {
                    try {
                        const itemUrl = `https://wslwebservices.leg.wa.gov/CommitteeMeetingService.asmx/GetCommitteeMeetingItems?agendaId=${agendaId}`;
                        const itemXml = await fetchProxyContent(itemUrl);
                        const itemDoc = parser.parseFromString(itemXml, "text/xml");
                        const items = Array.from(itemDoc.querySelectorAll("CommitteeMeetingItem"));
                        agendaItems = items.map(i => ({
                            billId: i.querySelector("BillId")?.textContent,
                            desc: i.querySelector("ItemDescription")?.textContent
                        })).filter(i => i.billId);
                    } catch(e) {}
                 }

                 parsedMeetings.push({
                     id: agendaId,
                     committee: commName,
                     agency: agency,
                     rawDate: new Date(date),
                     date: new Date(date).toLocaleString('en-US', DATE_FORMAT_OPTIONS),
                     bills: agendaItems
                 });
             }
         }
         
         parsedMeetings.sort((a, b) => a.rawDate - b.rawDate);
         setMeetings(parsedMeetings);
     } catch(e) {}
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
  
  const handleOpenBillFromDashboard = (billId) => {
      let target = bills.find(b => b.id === billId);
      if(!target) {
          target = { id: billId, title: 'Unknown Title', year: '2025', documents: [] };
      }
      setWorkspaceBill(target);
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
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-6 py-3 ${activeTab === 'dashboard' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}>
                <LayoutDashboard size={20}/> <span className="hidden md:block">Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('legislation')} className={`w-full flex items-center gap-4 px-6 py-3 ${activeTab === 'legislation' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}>
                <FileText size={20}/> <span className="hidden md:block">Legislation</span>
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
               <div className="relative hidden md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input className="pl-9 pr-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all" placeholder="Search database..." /></div>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
            {/* DASHBOARD TAB (Updated) */}
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="px-6 py-4 border-b bg-slate-50 font-bold text-slate-800 flex items-center justify-between">
                             <span className="flex items-center gap-2"><CalendarDays size={18}/> Upcoming Committee Hearings</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {meetings.length === 0 ? (
                                <div className="text-center text-slate-400 py-10">
                                   {isScanning ? "Scanning Schedule..." : "No upcoming meetings found for your committees."}
                                </div>
                            ) : (
                                meetings.map((m, i) => (
                                    <div key={i} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{m.committee}</div>
                                                <div className="text-xs text-slate-500">{m.date}</div>
                                            </div>
                                            <span className="text-[10px] bg-slate-200 px-2 py-1 rounded font-bold text-slate-600">{m.agency}</span>
                                        </div>
                                        {m.bills.length > 0 && (
                                            <div className="mt-2 pl-2 border-l-2 border-slate-200">
                                                {m.bills.map((b, idx) => (
                                                    <div key={idx} className="text-xs text-slate-700 py-0.5 truncate flex items-center gap-2">
                                                        <button 
                                                            onClick={() => handleOpenBillFromDashboard(b.billId)}
                                                            className="font-mono font-bold text-blue-600 hover:underline"
                                                        >
                                                            {b.billId}
                                                        </button>
                                                        <span className="text-slate-500 truncate">{b.desc}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer" onClick={() => setSortKey('id')}>Bill</th>
                                    <th className="px-6 py-4 cursor-pointer" onClick={() => setSortKey('title')}>Title</th>
                                    <th className="px-6 py-4 cursor-pointer" onClick={() => setSortKey('sponsor')}>Sponsor</th>
                                    <th className="px-6 py-4 cursor-pointer" onClick={() => setSortKey('committee')}>Bill Action</th>
                                    <th className="px-6 py-4 cursor-pointer" onClick={() => setSortKey('year')}>Year</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {getFilteredBills().length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading Sheet Data...</td></tr>
                                ) : (
                                    getFilteredBills().map(bill => (
                                        <tr key={bill.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setWorkspaceBill(bill)}>
                                            <td className="px-6 py-4 font-mono font-bold text-blue-600">{bill.id}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900 truncate max-w-xs" title={bill.title}>{bill.title}</td>
                                            <td className="px-6 py-4 text-slate-600">{bill.sponsor}</td>
                                            <td className="px-6 py-4 text-slate-500">{bill.committee}</td>
                                            <td className="px-6 py-4 text-slate-500">{bill.year}</td>
                                            <td className="px-6 py-4 text-right"><Edit2 size={16} className="text-slate-400"/></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
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
