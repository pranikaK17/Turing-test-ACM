import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
} from "firebase/firestore";
import { LogOut, Search, Database, Mail } from 'lucide-react';

interface PlayerData {
  id: string;
  name: string;
  email: string;
  score: number;
  timestamp?: any;
}

interface AdminDashboardProps {
  onExit?: () => void;
} 

export default function AdminDashboard({ onExit }: AdminDashboardProps) {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // 1. DATA FETCHING LOGIC
    const q = query(collection(db, "submissions"));
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PlayerData[];

        // Sort in memory (Highest score first, then newest timestamp)
        data.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const timeA = a.timestamp?.toMillis() || 0;
          const timeB = b.timestamp?.toMillis() || 0;
          return timeB - timeA;
        });

        setPlayers(data);
        setLoading(false);
      },
      (error) => {
        console.error("AdminDashboard: Snapshot error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // --- THE FIX: LOGOUT HANDLER ---
  const handleLogout = async () => {
    // We match the style of your App.tsx handleLogout but contained here
    if (window.confirm("Terminate admin session?")) {
      try {
        await auth.signOut();
        // Since App.tsx does not automatically reset gameState.status when auth changes 
        // for Admins, we MUST call onExit() to force the parent back to IDLE.
        if (onExit) {
          onExit();
        }
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }
  };

  const filteredPlayers = players.filter(p => 
    p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-[#00FF9D] font-mono">
        <Database className="animate-pulse mb-4" size={40} />
        <span className="uppercase tracking-[0.3em] text-xs font-bold">Initializing Admin Link...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono relative overflow-hidden">
      {/* Background Grid - Inline to keep index.css untouched */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <header className="max-w-6xl mx-auto mb-10 flex justify-between items-center relative z-10">
        <div>
          <h1 className="text-4xl font-heading uppercase tracking-tighter">
            Admin<span className="text-[#00FF9D]">_Dashboard</span>
          </h1>
          <div className="flex items-center gap-2 text-[#00FF9D] mt-1 text-sm">
            <Database size={14} /> // SYSTEM_LOG
          </div>
        </div>

        {/* LOGOUT BUTTON */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 bg-[#7C3AED] text-white px-6 py-2 border-4 border-black shadow-[4px_4px_0px_#000] hover:translate-x-1 hover:-translate-y-1 active:translate-x-0 active:translate-y-0 transition-all font-bold uppercase cursor-pointer"
        >
          <LogOut size={18} /> Exit Terminal
        </button>
      </header>

      <main className="max-w-6xl mx-auto relative z-10">
        <div className="bg-[#181524] border-4 border-black shadow-[10px_10px_0px_rgba(0,0,0,1)]">
          <div className="bg-[#2D2440] border-b-4 border-black p-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#00FF9D] text-black font-bold px-3 py-1 border-2 border-black transform -rotate-1 text-sm">
                LIVE_DATA
              </div>
              <span className="uppercase font-bold tracking-widest text-sm">Player Database</span>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border-2 border-gray-700 px-10 py-2 outline-none focus:border-[#00FF9D] text-sm transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-4 border-black bg-black/20 text-gray-400 uppercase text-xs">
                  <th className="p-4 font-bold tracking-widest">Player Email</th>
                  <th className="p-4 font-bold tracking-widest">Team Name</th>
                  <th className="p-4 font-bold tracking-widest text-center">Score</th>
                  <th className="p-4 font-bold tracking-widest text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/30">
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-gray-500 uppercase text-xs tracking-[0.2em]">
                      {searchQuery ? 'No results found' : 'Awaiting Uplinks...'}
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-[#00FF9D]" />
                          <span className="text-sm">{p.email}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-[#00FF9D]">{p.name}</td>
                      <td className="p-4 text-center">
                        <span className="bg-black/40 border border-gray-700 px-3 py-1 rounded font-heading text-lg">
                          {p.score}/6
                        </span>
                      </td>
                      <td className="p-4 text-right text-xs text-gray-500 font-mono">
                        {p.timestamp?.toDate().toLocaleString() || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
