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
} from "firebase/firestore";
import { 
  LogOut, Search, Database, Activity, 
  Radio, Zap, Trash2, ShieldCheck, Clock, Lock, Unlock, Timer 
} from 'lucide-react';

// Player data structure
interface PlayerData {
  id: string;
  name: string;
  email: string;
  score: number;
  timestamp?: any;
  status: 'LOCKED' | 'LIVE';
  timeTaken?: string;
}

// Active session data structure
interface ActiveSession {
  id: string;
  name: string;
  email: string;
  lastActive: any;
  currentScore?: number;
  progress?: number;
}

export default function AdminDashboard({ onExit }: { onExit?: () => void }) {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');


// // --- HANDLERS ---
  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`CRITICAL_ACTION: Purge records for [${name}]?`);
    if (confirmed) {
      try {
        await deleteDoc(doc(db, "submissions", id));
      } catch (error) {
        alert("ACCESS_DENIED: Delete failed.");
      }
    }
  };

  useEffect(() => {
    let submissions: PlayerData[] = [];
    let actives: ActiveSession[] = [];

    const syncLeaderboard = () => {
      const masterMap = new Map<string, PlayerData>();

      actives.forEach(u => {
        masterMap.set(u.email, {
          id: u.id,
          name: u.name,
          email: u.email,
          score: u.currentScore || 0,
          timestamp: u.lastActive,
          status: 'LIVE',
          timeTaken: '00:00' 
        });
      });


      submissions.forEach(p => {
        masterMap.set(p.email, {
          ...p,
          status: 'LOCKED',
          timeTaken: '00:00'
        });
      });

      const merged = Array.from(masterMap.values());
      
      // Sort by Score and time
      merged.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0);
      });

      setPlayers(merged);
    };


    const unsubSubmissions = onSnapshot(collection(db, "submissions"), (snap) => {
      submissions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PlayerData[];
      syncLeaderboard();
      setLoading(false);
    });

    // Listen to Active Sessions
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const qActive = query(collection(db, "active_sessions"), where("lastActive", ">", Timestamp.fromDate(tenMinsAgo)));
    
    const unsubActive = onSnapshot(qActive, (snap) => {
      actives = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ActiveSession[];
      setActiveUsers(actives);
      syncLeaderboard();
    });

    return () => {
      unsubSubmissions();
      unsubActive();
    };
  }, []);

  const handleLogout = async () => {
    if (window.confirm("TERMINATE_ADMIN_SESSION?")) {
      await auth.signOut();
      if (onExit) onExit();
    }
  };

  const filteredPlayers = useMemo(() => {
    return players.filter(p => 
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [players, searchQuery]);

  const exportToCSV = () => {
    const headers = ["Rank", "Name", "Email", "Score", "Status"];
    const csvContent = [headers.join(","), ...filteredPlayers.map((p, i) => `${i+1},${p.name},${p.email},${p.score},${p.status}`)].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Leaderboard_Export_${Date.now()}.csv`;
    link.click();
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-[#00FF9D] font-mono">
      <Database className="animate-pulse mb-4" size={48} />
      <span className="uppercase tracking-[0.4em] text-xs">Accessing_Central_Mainframe...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-mono relative overflow-x-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `linear-gradient(#00FF9D 1px, transparent 1px), linear-gradient(90deg, #00FF9D 1px, transparent 1px)`, backgroundSize: '50px 50px' }} />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b-2 border-[#00FF9D]/20 pb-8">
          <div>
            <div className="flex items-center gap-2 text-[#FF00E6] mb-2">
              <ShieldCheck size={16} />
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Encrypted_Admin_Link</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-tighter italic">
              Terminal<span className="text-[#00FF9D]">_Control</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={exportToCSV} className="bg-black border-2 border-[#00FF9D] text-[#00FF9D] px-4 py-2 text-xs hover:bg-[#00FF9D] hover:text-black transition-all font-bold uppercase shadow-[4px_4px_0px_#00FF9D]">
              Export_CSV
            </button>
            <button onClick={handleLogout} className="group flex items-center gap-3 bg-[#FF00E6] text-white px-6 py-3 border-4 border-black shadow-[4px_4px_0px_#000] hover:translate-x-1 hover:-translate-y-1 transition-all font-bold uppercase text-sm">
              <LogOut size={18} /> Terminate_Session
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* SIDEBAR */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-[#13111C] border-4 border-black p-5 shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#00FF9D] mb-4 flex items-center gap-2">
                <Radio size={14} className="animate-pulse" /> Live_Uplinks [{activeUsers.length}]
              </h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {activeUsers.length === 0 ? (
                  <p className="text-[10px] text-gray-600 uppercase italic py-4">Scanning for signals...</p>
                ) : (
                  activeUsers.map(u => (
                    <div key={u.id} className="border-l-2 border-[#00FF9D] pl-3 py-1 bg-white/5 flex justify-between items-center group">
                      <div className="truncate pr-2">
                        <p className="text-xs font-bold text-white uppercase truncate">{u.name}</p>
                        <p className="text-[9px] text-gray-500 truncate">{u.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-[#00FF9D] font-bold text-xs bg-black px-2 py-1 border border-[#00FF9D]/30 shadow-[2px_2px_0px_rgba(0,255,157,0.2)]">
                          {u.currentScore || 0}/6
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[8px] text-yellow-500 font-bold mt-1">
                          <Timer size={8} /> 00:00
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#13111C] border-4 border-black p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Mainframe_Stats</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]"><span className="text-gray-500">AVG_SCORE:</span> <span className="text-[#00FF9D] font-bold">{(players.reduce((a,b)=>a+b.score,0)/(players.length||1)).toFixed(1)}/6</span></div>
                <div className="flex justify-between text-[11px]"><span className="text-gray-500">AVG_TIME_TAKEN:</span> <span className="text-[#FF00E6] font-bold">00:00</span></div>
                <div className="flex justify-between text-[11px]"><span className="text-gray-500">TOTAL_SUBMISSIONS:</span> <span className="text-white font-bold">{players.filter(p => p.status === 'LOCKED').length}</span></div>
              </div>
            </div>
          </aside>

          {/* MAIN TABLE AREA */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-[#181524] border-4 border-black shadow-[10px_10px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="bg-[#2D2440] border-b-4 border-black p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-[#00FF9D] text-black font-bold px-3 py-1 border-2 border-black transform -rotate-1 text-xs">UNIFIED_LEADERBOARD</div>
                  <span className="uppercase font-bold tracking-widest text-sm">Real_Time_Logs</span>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="Filter_by_Agent..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black border-2 border-gray-700 px-10 py-2 outline-none focus:border-[#00FF9D] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#181524] z-20">
                    <tr className="border-b-4 border-black text-gray-400 uppercase text-[10px] tracking-widest">
                      <th className="p-4">Rank</th>
                      <th className="p-4">Agent_Designation</th>
                      <th className="p-4 text-center">Score</th>
                      <th className="p-4 text-center">Time_Taken</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/30">
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-20 text-center text-gray-600 uppercase text-xs tracking-[0.3em]">No_Data_Streams_Available</td>
                      </tr>
                    ) : (
                      filteredPlayers.map((p, index) => (
                        <tr key={p.id} className={`hover:bg-[#00FF9D]/5 transition-colors group ${p.status === 'LIVE' ? 'bg-yellow-500/5' : ''}`}>
                          <td className="p-4 font-mono text-[#FF00E6] font-bold">
                            #{index + 1}
                          </td>
                          <td className="p-4">
                             <p className="font-bold text-[#00FF9D] text-sm uppercase italic">{p.name}</p>
                             <p className="text-[10px] text-gray-500 font-mono">{p.email}</p>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 font-heading text-lg border-2 ${p.score >= 5 ? 'border-[#00FF9D] text-[#00FF9D] bg-[#00FF9D]/10' : 'border-gray-800 text-gray-500 bg-black/40'}`}>
                              {p.score}/6
                            </span>
                          </td>
                          <td className="p-4 text-center">
                             <div className="flex flex-col items-center">
                                <span className="text-xs font-mono text-white">00:00</span>
                                <span className="text-[8px] text-gray-500 uppercase tracking-tighter">min:sec</span>
                             </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className={`flex items-center justify-center gap-2 text-[10px] font-bold uppercase ${p.status === 'LIVE' ? 'text-yellow-500' : 'text-[#00FF9D]'}`}>
                              {p.status === 'LIVE' ? <Unlock size={12} className="animate-pulse" /> : <Lock size={12} />}
                              {p.status}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => handleDelete(p.id, p.name)}
                              className="p-2 text-gray-600 hover:text-[#FF00E6] transition-all hover:bg-[#FF00E6]/10 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
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
