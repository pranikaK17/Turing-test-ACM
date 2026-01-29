import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
  doc,
  deleteDoc,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { 
  LogOut, Search, Database, AlertTriangle,
  Radio, Trash2, ShieldCheck, Lock, Unlock,
  ArrowLeft, CheckCircle2, XCircle, MinusCircle, Eye, Clock, Filter, Download, ArrowUpDown
} from 'lucide-react';

interface PlayerData {
  id: string; 
  name: string;
  email: string;
  score: number;
  timestamp?: any; 
  status: 'LOCKED' | 'LIVE';
  timeTaken?: number;
  rounds?: any[];
  role?: string;
}

interface ActiveSession {
  id: string;
  name: string;
  email: string;
  lastActive: any;
  currentScore?: number;
  progress?: number;
  rounds?: any[];
  role?: string;
  totalTimeSpent?: number;
}

export default function AdminDashboard({ onExit }: { onExit?: () => void }) {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<PlayerData | null>(null);
  
  // MODIFIED: Added score_only and time_only to the sort states
  const [filterDuplicates, setFilterDuplicates] = useState(false);
  const [sortBy, setSortBy] = useState<'performance' | 'score_only' | 'time_only' | 'recent'>('performance');

  // --- HANDLERS ---
  const handleDelete = async (docId: string, name: string) => {
    const confirmed = window.confirm(`CRITICAL_ACTION: Purge unique log [${docId}] for [${name}]?`);
    if (confirmed) {
      try {
        await deleteDoc(doc(db, "submissions", docId));
      } catch (error) {
        console.error("Delete error:", error);
        alert("ACCESS_DENIED: Check Firestore Rules or Admin Role.");
      }
    }
  };

  const handlePurgeAll = async () => {
    const confirmed = window.confirm("SYSTEM_WIDE_PURGE: Permanently delete ALL historical logs?");
    if (confirmed) {
      try {
        const querySnapshot = await getDocs(collection(db, "submissions"));
        const batch = writeBatch(db);
        querySnapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        alert("MAIN_FRAME_CLEARED: All locked entries purged.");
      } catch (error) {
        alert("ACCESS_DENIED: Batch deletion failed.");
      }
    }
  };

  useEffect(() => {
    let submissions: PlayerData[] = [];
    let actives: ActiveSession[] = [];

    const syncLeaderboard = () => {
      const finished = submissions.filter(p => p.role !== 'admin').map(p => ({
        ...p,
        status: 'LOCKED' as const
      }));

      const currentlyPlaying = actives.filter(u => u.role !== 'admin').map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        score: u.currentScore || 0,
        timestamp: u.lastActive,
        status: 'LIVE' as const,
        timeTaken: u.totalTimeSpent || 0,
        rounds: u.rounds || []
      }));

      setPlayers([...finished, ...currentlyPlaying]);
    };

    const unsubSubmissions = onSnapshot(collection(db, "submissions"), (snap) => {
      submissions = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as PlayerData))
        .filter(data => data.role !== 'admin');
      syncLeaderboard();
      setLoading(false);
    });

    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const qActive = query(
      collection(db, "active_sessions"), 
      where("lastActive", ">", Timestamp.fromDate(tenMinsAgo))
    );
    
    const unsubActive = onSnapshot(qActive, (snap) => {
      actives = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ActiveSession))
        .filter(data => data.role !== 'admin');
      
      setActiveUsers(actives);
      syncLeaderboard();
    });

    return () => { unsubSubmissions(); unsubActive(); };
  }, []);

  const duplicateEmails = useMemo(() => {
    const counts = new Map<string, number>();
    players.forEach(p => {
      if (p.status === 'LOCKED') {
        counts.set(p.email, (counts.get(p.email) || 0) + 1);
      }
    });
    return new Set(Array.from(counts.entries()).filter(([_, count]) => count > 1).map(([email]) => email));
  }, [players]);

  const formatSeconds = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogout = async () => {
    if (window.confirm("TERMINATE_ADMIN_SESSION?")) {
      await auth.signOut();
      if (onExit) onExit();
    }
  };

  // --- REFINED RANKING & FILTERING LOGIC ---
  const filteredPlayers = useMemo(() => {
    let list = players.filter(p => 
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sorting Logic Updated
    list.sort((a, b) => {
      if (sortBy === 'performance') {
        if (b.score !== a.score) return b.score - a.score;
        return (a.timeTaken || 0) - (b.timeTaken || 0);
      } else if (sortBy === 'score_only') {
        return b.score - a.score;
      } else if (sortBy === 'time_only') {
        // Handle 0 or undefined time by treating it as a very large number
        const timeA = a.timeTaken && a.timeTaken > 0 ? a.timeTaken : 999999;
        const timeB = b.timeTaken && b.timeTaken > 0 ? b.timeTaken : 999999;
        return timeA - timeB;
      } else {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      }
    });

    if (filterDuplicates) {
      const seen = new Set();
      list = list.filter(p => {
        if (seen.has(p.email)) return false;
        seen.add(p.email);
        return true;
      });
    }
    return list;
  }, [players, searchQuery, filterDuplicates, sortBy]);

  const exportToCSV = () => {
    const headers = ["Rank", "Name", "Email", "Score", "Time", "Status", "Date"];
    const csvContent = [
      headers.join(","), 
      ...filteredPlayers.map((p, i) => 
        `${i+1},"${p.name}","${p.email}",${p.score},${formatSeconds(p.timeTaken || 0)},${p.status},"${p.timestamp?.toDate().toLocaleString() || 'N/A'}"`
      )
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Audit_Uplink_Report_${Date.now()}.csv`;
    link.click();
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-[#00FF9D] font-mono">
      <Database className="animate-pulse mb-4" size={48} />
      <span className="uppercase tracking-[0.4em] text-xs font-bold">Initializing_Mainframe...</span>
    </div>
  );

  if (selectedAgent) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-mono animate-in fade-in duration-500">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => setSelectedAgent(null)} className="flex items-center gap-2 text-[#00FF9D] hover:underline mb-8 uppercase text-xs tracking-widest font-bold">
            <ArrowLeft size={16} /> Return_To_Terminal
          </button>
          <div className="bg-[#13111C] border-4 border-black p-6 shadow-[8px_8px_0px_#00FF9D] mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-4xl font-heading italic uppercase text-white tracking-tighter">{selectedAgent.name}</h2>
                <p className="text-[#FF00E6] text-xs mt-1 font-bold">
                  LOG_ID: {selectedAgent.id} // {selectedAgent.email} 
                  {duplicateEmails.has(selectedAgent.email) && " // [REDUNDANT_ENTRY_DETECTED]"}
                </p>
              </div>
              <div className="flex gap-8">
                <div className="text-right">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-widest">Efficiency</span>
                    <span className="text-2xl font-heading text-white">{formatSeconds(selectedAgent.timeTaken || 0)}</span>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-widest">Accuracy</span>
                    <span className="text-3xl font-heading text-[#00FF9D]">{selectedAgent.score}/6</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedAgent.rounds?.map((round, idx) => {
              const answered = round.userChoiceId !== null && round.userChoiceId !== undefined;
              const correct = round.isCorrect;
              return (
                <div key={idx} className={`bg-[#181524] border-2 p-4 flex flex-col gap-4 transition-all ${!answered ? 'border-gray-800 opacity-40' : correct ? 'border-[#00FF9D]/40' : 'border-[#FF00E6]/40'}`}>
                  <div className="flex items-center justify-between mb-1">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-black px-2 py-0.5 border border-gray-700 font-bold text-white">UNIT_{idx + 1}</span>
                          {answered ? (
                            correct ? <CheckCircle2 size={14} className="text-[#00FF9D]" /> : <XCircle size={14} className="text-[#FF00E6]" />
                          ) : <MinusCircle size={14} className="text-gray-600" />}
                       </div>
                       <span className="text-[9px] uppercase font-bold text-gray-500">{round.subject}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {round.images?.map((img: any) => (
                      <div key={img.id} className={`relative aspect-square border-2 transition-all ${round.userChoiceId === img.id ? 'border-white scale-[1.02] z-10' : 'border-transparent opacity-30 grayscale'}`}>
                        <img src={img.url} className="w-full h-full object-cover" alt="asset" />
                        {img.type === 'AI' && <div className="absolute top-0 left-0 bg-[#FF00E6] text-[8px] px-2 py-0.5 text-white uppercase font-black">AI_GEN</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-mono relative overflow-x-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `linear-gradient(#00FF9D 1px, transparent 1px), linear-gradient(90deg, #00FF9D 1px, transparent 1px)`, backgroundSize: '50px 50px' }} />
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b-2 border-[#00FF9D]/20 pb-8">
          <div>
            <div className="flex items-center gap-2 text-[#FF00E6] mb-2">
              <ShieldCheck size={16} />
              <span className="text-[10px] uppercase tracking-[0.3em] font-black">Central_Command_Authenticated</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-tighter italic text-white">System<span className="text-[#00FF9D]">_Uplink</span></h1>
          </div>
          <div className="flex items-center flex-wrap gap-3">
            <button onClick={handlePurgeAll} className="bg-black border-2 border-red-600 text-red-600 px-4 py-2 text-[10px] hover:bg-red-600 hover:text-white transition-all font-black uppercase">Purge_Data</button>
            <button onClick={exportToCSV} className="flex items-center gap-2 bg-black border-2 border-[#00FF9D] text-[#00FF9D] px-4 py-2 text-[10px] hover:bg-[#00FF9D] hover:text-black transition-all font-black uppercase">
              <Download size={14} /> Report
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-[#FF00E6] text-white px-5 py-2.5 border-2 border-black shadow-[4px_4px_0px_#000] hover:translate-x-1 hover:-translate-y-1 transition-all font-black uppercase text-xs">
              <LogOut size={16} /> Terminate
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-[#13111C] border-4 border-black p-5 shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#00FF9D] mb-4 flex items-center gap-2">
                <Radio size={14} className="animate-pulse" /> Live_Signals [{activeUsers.length}]
              </h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {activeUsers.length === 0 ? (
                  <p className="text-[10px] text-gray-600 uppercase italic py-4 font-bold tracking-widest">Scanning_Frequencies...</p>
                ) : (
                  activeUsers.map(u => (
                    <div key={u.id} className="border-l-2 border-[#00FF9D] pl-3 py-2 bg-white/5 flex justify-between items-center group cursor-pointer hover:bg-white/10 transition-all" onClick={() => setSelectedAgent(players.find(p => p.id === u.id) || null)}>
                      <div className="truncate pr-2">
                        <p className="text-xs font-black text-white uppercase truncate tracking-tight">{u.name}</p>
                        <p className="text-[9px] text-gray-500 font-mono">Realtime_Feed...</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-[#00FF9D] animate-ping" />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#13111C] border-4 border-black p-5">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">System_Metrics</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500 font-bold uppercase">Avg_Score:</span> 
                    <span className="text-[#00FF9D] font-black text-sm">{(players.reduce((a,b)=>a+b.score,0)/(players.length||1)).toFixed(1)}/6</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500 font-bold uppercase">Total_Logs:</span> 
                    <span className="text-white font-black text-sm">{players.length}</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-[#181524] border-4 border-black shadow-[10px_10px_0px_rgba(0,0,0,1)] overflow-hidden">
              
              <div className="bg-[#2D2440] border-b-4 border-black p-4 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#00FF9D] text-black font-black px-3 py-1 border-2 border-black transform -rotate-1 text-[10px] uppercase tracking-tight">Leaderboard</div>
                    <span className="uppercase font-black tracking-[0.2em] text-xs text-white">Log_History</span>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input type="text" placeholder="Search_ID_OR_NAME..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black border-2 border-gray-700 px-10 py-2 outline-none focus:border-[#00FF9D] text-[10px] font-black text-white uppercase" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/10">
                   <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Rank_Mode:</span>
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-black border border-gray-700 text-[#00FF9D] text-[10px] px-2 py-1 uppercase font-black outline-none focus:border-[#00FF9D]"
                      >
                        <option value="performance">Standard: Score + Time</option>
                        <option value="score_only">Sort: Highest Score</option>
                        <option value="time_only">Sort: Least Time</option>
                        <option value="recent">Sort: Most Recent</option>
                      </select>
                   </div>
                   <button 
                    onClick={() => setFilterDuplicates(!filterDuplicates)} 
                    className={`flex items-center gap-2 px-4 py-1 text-[10px] font-black uppercase transition-all border-2 ${filterDuplicates ? 'bg-[#00FF9D] text-black border-[#00FF9D]' : 'bg-black text-[#00FF9D] border-[#00FF9D]'}`}
                   >
                      <Filter size={12} /> {filterDuplicates ? 'Best_Effort_Mode' : 'Filter_Redundancy'}
                   </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#181524] z-20">
                    <tr className="border-b-4 border-black text-gray-400 uppercase text-[10px] font-black tracking-widest bg-[#181524]">
                      <th className="p-4">Rank</th>
                      <th className="p-4">Designation</th>
                      <th className="p-4 text-center">Score</th>
                      <th className="p-4 text-center">
                         <div className="flex items-center justify-center gap-1">Total_Time <ArrowUpDown size={12} /></div>
                      </th>
                      <th className="p-4 text-center">Timestamp</th>
                      <th className="p-4 text-center">Integrity</th>
                      <th className="p-4 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/30">
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-20 text-center text-gray-600 uppercase text-xs font-black tracking-[0.4em]">No_Agent_Detected</td>
                      </tr>
                    ) : (
                      filteredPlayers.map((p, index) => {
                        const isViolation = duplicateEmails.has(p.email);
                        return (
                          <tr key={p.id} className={`hover:bg-[#00FF9D]/5 transition-colors group ${isViolation && !filterDuplicates ? 'bg-red-500/10' : ''}`}>
                            <td className="p-4 font-mono text-[#FF00E6] font-black text-lg italic">#{index + 1}</td>
                            <td className="p-4 cursor-pointer" onClick={() => setSelectedAgent(p)}>
                               <p className="font-black text-[#00FF9D] text-sm uppercase italic flex items-center gap-2 group-hover:underline tracking-tight">
                                 {p.name} <Eye size={12} className="opacity-0 group-hover:opacity-100" />
                               </p>
                               <p className="text-[10px] text-gray-500 font-mono font-bold">{p.email}</p>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-4 py-1 font-heading text-xl border-2 tracking-tighter ${p.score >= 5 ? 'border-[#00FF9D] text-[#00FF9D] bg-[#00FF9D]/10' : 'border-gray-800 text-gray-500 bg-black/40'}`}>
                                {p.score}/6
                              </span>
                            </td>
                            <td className="p-4 text-center font-black">
                                <div className="flex items-center justify-center gap-2 text-[#00FF9D]">
                                  <Clock size={12} />
                                  <span className="text-sm font-mono tracking-tighter">{formatSeconds(p.timeTaken || 0)}</span>
                                </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {p.status === 'LIVE' ? (
                                  <span className="text-yellow-500 text-[10px] font-black uppercase flex items-center gap-1"><Unlock size={10} className="animate-pulse" /> Live</span>
                                ) : (
                                  <span className="text-gray-400 text-[10px] font-bold flex items-center gap-1"> {p.timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              {isViolation ? (
                                <div className={`inline-flex items-center gap-1 ${filterDuplicates ? 'text-blue-400 border border-blue-400' : 'bg-red-600 text-white px-2 py-1 animate-pulse'} text-[8px] font-black uppercase tracking-tighter`}>
                                  <AlertTriangle size={10} /> {filterDuplicates ? 'Validated_Best' : 'Redundant_Log'}
                                </div>
                              ) : (
                                <span className="text-gray-700 text-[9px] font-black uppercase tracking-widest opacity-40">Unique</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleDelete(p.id, p.name)} className="p-2 text-gray-600 hover:text-[#FF00E6] transition-all">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
