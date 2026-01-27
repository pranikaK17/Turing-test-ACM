import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateGameRounds } from './services/gameService';
import { saveScore } from './services/storageService';
import { GameState } from '../types';
import { LoadingScreen } from './components/LoadingScreen';
import { RoundCard } from './components/RoundCard';
import { signInWithPopup, onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth, googleProvider, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute'; 
import { Trophy, ArrowRight, RotateCcw, Zap, LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    status: 'IDLE',
    rounds: [],
    loadingProgress: 0,
    score: 0,
    teamName: 'Guest Agent'
  });

  const roundsEndRef = useRef<HTMLDivElement>(null);

  // --- AUTH & ADMIN CHECK ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const adminSnap = await getDoc(doc(db, "admins", currentUser.uid));
        setIsAdmin(adminSnap.exists());
        setGameState(prev => ({ 
          ...prev, 
          teamName: currentUser.displayName || 'Agent' 
        }));
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- LOGOUT HANDLER ---
  const handleLogout = useCallback(async () => {
    if (window.confirm("Terminate session and return to terminal?")) {
      try {
        await signOut(auth);
        setGameState({
          status: 'IDLE',
          rounds: [],
          loadingProgress: 0,
          score: 0,
          teamName: 'Guest Agent'
        });
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }
  }, []);

  // --- START GAME ---
  const startGame = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      const adminSnap = await getDoc(doc(db, "admins", result.user.uid));
      if (adminSnap.exists()) {
        setIsAdmin(true);
        setGameState(prev => ({ ...prev, status: 'ADMIN' }));
        return;
      }

      setGameState(prev => ({ 
        ...prev, 
        status: 'GENERATING', 
        loadingProgress: 0, 
        score: 0,
        rounds: [] 
      }));
      
      const generatedRounds = await generateGameRounds((progress) => {
        setGameState(prev => ({ ...prev, loadingProgress: progress }));
      });
      
      setGameState(prev => ({
        ...prev,
        status: 'PLAYING',
        rounds: generatedRounds,
        loadingProgress: 100
      }));

    } catch (error) {
      console.error("Failed to start session:", error);
      setGameState(prev => ({ ...prev, status: 'IDLE' }));
    }
  }, []);

  // --- SELECTION LOGIC ---
  const handleSelection = useCallback((roundId: number, imageId: string) => {
    setGameState(prev => {
      const newRounds = prev.rounds.map(round => {
        if (round.id !== roundId) return round;
        const selectedImage = round.images.find(img => img.id === imageId);
        const isCorrect = selectedImage?.type === 'AI'; 
        return { ...round, userChoiceId: imageId, isCorrect: isCorrect };
      });
      const currentScore = newRounds.filter(r => r.isCorrect).length;
      return { ...prev, rounds: newRounds, score: currentScore };
    });
  }, []);

  // --- FINISH & SUBMIT ---
  const finishGame = useCallback(() => {
    // 1. Save score to Firestore/Storage
    saveScore(gameState.teamName, gameState.score);
    
    // 2. Change status to trigger the results view
    setGameState(prev => ({ ...prev, status: 'FINISHED' }));
    
    // 3. Scroll to top so they see the score immediately
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [gameState.teamName, gameState.score]);

  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: 'IDLE',
      rounds: [],
      score: 0
    }));
  }, []);

  // Logic to enable the submit button
  const completedRounds = gameState.rounds.filter(r => r.userChoiceId !== null).length;
  const isAllAnswered = gameState.rounds.length > 0 && completedRounds === gameState.rounds.length;

  // --- VIEW ROUTING ---

  if (gameState.status === 'ADMIN') {
    return <AdminDashboard />;
  }

  if (gameState.status === 'GENERATING') {
    return <LoadingScreen progress={gameState.loadingProgress} />;
  }

  // RESULTS SCREEN
  if (gameState.status === 'FINISHED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#13111C]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF00E6] rounded-full mix-blend-multiply filter blur-[150px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00FF9D] rounded-full mix-blend-multiply filter blur-[150px] opacity-10 animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="relative z-10 flex flex-col items-center w-full max-w-4xl animate-in zoom-in duration-300">
           <div className="mb-10 transform -rotate-1">
             <div className="bg-[#00FF9D] text-black border-2 border-[#00FF9D] px-6 py-2 font-mono text-sm font-bold uppercase tracking-widest shadow-[6px_6px_0px_rgba(0,0,0,1)]">
                // SYSTEM DIAGNOSTIC COMPLETE
             </div>
           </div>

           <div className="text-center mb-6">
              <h1 className="text-[120px] md:text-[180px] font-heading leading-none text-white retro-text-shadow select-none">
                {gameState.score}<span className="text-[#FF00E6] text-[0.8em]">/</span>{gameState.rounds.length}
              </h1>
           </div>
           
           <div className="mb-16 text-center">
              <p className={`text-2xl md:text-3xl font-heading uppercase tracking-[0.2em] 
                ${gameState.score >= 4 ? 'text-[#00FF9D]' : gameState.score >= 3 ? 'text-yellow-400' : 'text-[#FF00E6]'}`}>
                {gameState.score === 6 ? ">> GODLIKE ACCURACY <<" :
                 gameState.score >= 4 ? ">> HIGHLY PROFICIENT <<" :
                 gameState.score >= 2 ? ">> ACCEPTABLE MARGIN <<" :
                 ">> SYSTEM COMPROMISED <<"}
              </p>
           </div>

           <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-16">
             {gameState.rounds.map((round, idx) => (
                <div key={round.id} className="flex flex-col items-center gap-3 group">
                  <div className={`
                    w-12 h-12 md:w-16 md:h-16 flex items-center justify-center border-4 
                    transition-all duration-300 transform group-hover:scale-110 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
                    ${round.isCorrect ? 'bg-[#00FF9D] border-black text-black' : 'bg-[#1F1B2E] border-[#FF00E6] text-[#FF00E6]'}
                  `}>
                    {round.isCorrect ? <Zap size={32} strokeWidth={2.5} className="fill-current" /> : <span className="font-mono text-3xl font-bold">X</span>}
                  </div>
                  <span className="text-[10px] md:text-xs text-gray-500 font-mono uppercase tracking-widest">R0{idx + 1}</span>
                </div>
             ))}
           </div>

           <button onClick={resetGame} className="group relative inline-flex items-center gap-4 px-12 py-6 bg-[#FF00E6] text-white font-heading text-2xl uppercase tracking-widest hover:bg-[#d900c4] hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(255,46,230,0.3)]">
             <RotateCcw className="w-8 h-8 group-hover:-rotate-180 transition-transform duration-700" />
             <span>Reboot System</span>
             <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
           </button>
        </div>
      </div>
    );
  }

  // IDLE SCREEN
  if (gameState.status === 'IDLE') {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF00E6] rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00FF9D] rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
        <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 text-center relative">
          <div className="mb-8 transform -rotate-2">
            <span className="bg-black text-[#00FF9D] border-2 border-[#00FF9D] px-4 py-2 font-mono text-sm uppercase tracking-widest shadow-[4px_4px_0px_#00FF9D]">v 1.1.0 // ACM SigAI Chapter</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-heading mb-6 leading-none retro-text-shadow">REAL<br/><span className="text-[#FF00E6]">VS</span><br/>ARTIFICIAL</h1>
          <div className="max-w-xl mx-auto mb-12 bg-black/50 p-6 border-l-4 border-[#00FF9D] backdrop-blur-sm">
            <p className="text-lg md:text-xl text-gray-200 leading-relaxed font-mono">Identify the <span className="text-[#00FF9D] font-bold">AI IMPOSTOR</span>.<br/>Distinguish hallucinations from <span className="text-[#FF00E6] font-bold">HUMAN SOUL</span>.</p>
          </div>
          <button onClick={startGame} className="group game-btn relative inline-flex items-center gap-4 px-12 py-6 bg-[#FF00E6] text-white font-heading text-2xl uppercase tracking-widest hover:bg-[#d900c4]">
            <Zap className="w-8 h-8 fill-current" /> Initialize <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
          </button>
        </main>
      </div>
    );
  }

  // PLAYING STATE
  return (
    <div className="min-h-screen text-white custom-scrollbar flex flex-col">
      <header className="sticky top-0 z-50 bg-[#13111C]/95 border-b-4 border-black px-4 py-3 shadow-[0px_4px_20px_rgba(0,0,0,0.5)]">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div onClick={resetGame} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
               <div className="bg-[#FF00E6] w-8 h-8 flex items-center justify-center border-2 border-black font-bold text-sm shadow-[2px_2px_0px_#000]">R</div>
               <div className="hidden sm:block"><span className="font-heading text-xl tracking-tighter">REAL<span className="text-[#00FF9D]">VS</span>AI</span></div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-[#1F1B2E] hover:bg-[#FF2E2E] text-gray-400 hover:text-white px-3 py-1.5 rounded border border-gray-700 hover:border-black transition-all group active:scale-95"
            >
              <LogOut size={14} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-tighter">Logout</span>
            </button>
          </div>

          <div className="flex items-center gap-4 sm:gap-8">
             <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase text-gray-400 font-mono tracking-widest">Score</span>
                <span className="font-heading text-2xl text-[#00FF9D] leading-none retro-text-shadow">{gameState.score}</span>
             </div>
             <div className="flex flex-col items-end w-32">
                <span className="text-[10px] uppercase text-gray-400 font-mono tracking-widest">Progress</span>
                <div className="w-full h-3 bg-gray-800 border border-gray-600 mt-1">
                   <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" 
                        style={{ width: `${(completedRounds / gameState.rounds.length) * 100}%` }}></div>
                </div>
             </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="text-center mb-12">
           <div className="inline-block border-2 border-[#00FF9D] text-[#00FF9D] px-4 py-1 font-mono text-xs uppercase mb-2 bg-[#00FF9D]/10">Current Objective</div>
           <h2 className="text-3xl md:text-4xl font-heading text-white uppercase retro-text-shadow">Locate the AI Image</h2>
        </div>
        <div className="space-y-4">
          {gameState.rounds.map((round) => (
            <RoundCard key={round.id} round={round} onSelect={handleSelection} />
          ))}
        </div>
      </div>

      {/* SUBMIT BUTTON - Locked until all 6 rounds are done */}
      <div className="fixed bottom-0 left-0 w-full p-6 pointer-events-none flex justify-center z-40 bg-gradient-to-t from-[#13111C] via-[#13111C]/90 to-transparent">
        <button 
          onClick={finishGame} 
          disabled={!isAllAnswered} 
          className={`pointer-events-auto game-btn px-16 py-5 font-heading text-2xl uppercase tracking-widest transition-all duration-500 transform 
            ${isAllAnswered 
              ? 'bg-[#00FF9D] text-black opacity-100 translate-y-0 hover:scale-105 shadow-[0_0_30px_rgba(0,255,157,0.4)]' 
              : 'bg-gray-800 text-gray-500 translate-y-20 opacity-0'}`}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
