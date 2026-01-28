import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateGameRounds } from './services/gameService';
import { saveScore, savePartialProgress } from './services/storageService'; 
import { GameState } from '../types';
import { LoadingScreen } from './components/LoadingScreen';
import { RoundCard } from './components/RoundCard';
import LoginPage from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import RulesPage from './components/RulesPage';
import {
  onAuthStateChanged,
  User,
  signOut,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ArrowRight, RotateCcw, Zap, LogOut, CheckCircle, Timer, AlertTriangle } from 'lucide-react';

// FORMAT HELPER FOR TIMER (MM:SS)
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastRoundIndexRef = useRef<number>(-1);
  
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  
  // NEW: Global Timer State (300s = 5 mins)
  const [timeLeft, setTimeLeft] = useState(300);
  // NEW: Per-Round Timer State (5s per image pair)
  const ROUND_TIME_LIMIT = 5;
  const [roundTimeLeft, setRoundTimeLeft] = useState(ROUND_TIME_LIMIT);

  const [gameState, setGameState] = useState<GameState>({
    status: 'LOGIN',
    rounds: [],
    loadingProgress: 0,
    score: 0,
    teamName: 'Guest Agent'
  });
  const [loginError, setLoginError] = useState<string | undefined>(undefined);

  // --- GAME FINISH LOGIC (Moved up so Timer can use it) ---
  const finishGame = useCallback(async () => {
    await saveScore(gameState.teamName, gameState.score);
    if (user) await deleteDoc(doc(db, "active_sessions", user.uid)).catch(() => {});
    setGameState(prev => ({ ...prev, status: 'FINISHED' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [gameState.teamName, gameState.score, user]);

  // --- GLOBAL TIMER LOGIC ---
  useEffect(() => {
    let timerId: any;

    if (gameState.status === 'PLAYING' && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (gameState.status === 'PLAYING' && timeLeft === 0) {
      // AUTO-SUBMIT WHEN TIME IS UP
      finishGame();
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [gameState.status, timeLeft, finishGame]);

  // --- PER-ROUND TIMER LOGIC (5s per image pair) ---
  useEffect(() => {
    // Only reset per-round timer when the ACTIVE ROUND changes (not when the round object updates, e.g. selecting a photo)
    if (gameState.status !== 'PLAYING') return;
    if (!gameState.rounds[currentRoundIndex]) return;

    if (lastRoundIndexRef.current !== currentRoundIndex) {
      lastRoundIndexRef.current = currentRoundIndex;
      setRoundTimeLeft(ROUND_TIME_LIMIT);
    }
  }, [gameState.status, currentRoundIndex, gameState.rounds.length]);

  useEffect(() => {
    if (gameState.status !== 'PLAYING') return;
    if (!gameState.rounds[currentRoundIndex]) return;

    // When countdown hits zero, auto-advance to the next round (or finish)
    if (roundTimeLeft <= 0) {
      if (currentRoundIndex < gameState.rounds.length - 1) {
        setCurrentRoundIndex((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Last round: finish game automatically
        finishGame();
      }
      return;
    }

    const intervalId = setInterval(() => {
      setRoundTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameState.status, currentRoundIndex, gameState.rounds, roundTimeLeft, finishGame]);


  // --- HEARTBEAT SYSTEM ---
  useEffect(() => {
    let heartbeatInterval: any;

    const updateHeartbeat = async () => {
      if (user && gameState.status === 'PLAYING') {
        try {
          const sessionRef = doc(db, "active_sessions", user.uid);
          await setDoc(sessionRef, {
            name: gameState.teamName,
            email: user.email,
            lastActive: serverTimestamp(),
            currentScore: gameState.score,
            progress: gameState.rounds.filter(r => r.userChoiceId !== null).length,
            rounds: gameState.rounds,
            timeLeft: timeLeft // Optional: Save time to persist on reload if needed later
          }, { merge: true });
        } catch (err) {
          console.error("Heartbeat sync failed:", err);
        }
      }
    };

    if (gameState.status === 'PLAYING' && user) {
      updateHeartbeat();
      heartbeatInterval = setInterval(updateHeartbeat, 30000); 
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (user && gameState.status === 'FINISHED') {
        deleteDoc(doc(db, "active_sessions", user.uid)).catch(() => {});
      }
    };
  }, [gameState.status, user, gameState.teamName, gameState.score, gameState.rounds, timeLeft]);


  // --- AUTH & PERSISTENCE ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          const roleIsAdmin = userSnap.exists() && userSnap.data().role === 'admin';
          
          setIsAdmin(roleIsAdmin);
          setUser(currentUser);
          const nameFromEmail = currentUser.email?.split('@')[0] || 'Agent';

          const sessionRef = doc(db, "active_sessions", currentUser.uid);
          const sessionSnap = await getDoc(sessionRef);

          if (!roleIsAdmin && sessionSnap.exists()) {
            const savedData = sessionSnap.data();
            const savedRounds = savedData.rounds || [];
            const answeredCount = savedRounds.filter((r: any) => r.userChoiceId !== null && r.userChoiceId !== undefined).length;
            const restoreIndex = answeredCount < savedRounds.length ? answeredCount : savedRounds.length - 1;
            
            setCurrentRoundIndex(restoreIndex >= 0 ? restoreIndex : 0);
            
            // Restore Time if available, else default
            // setTimeLeft(savedData.timeLeft || 300);

            setGameState({
              status: 'IDLE', 
              teamName: nameFromEmail,
              rounds: savedRounds,
              score: savedData.currentScore || 0,
              loadingProgress: 100
            });
          } else {
            setGameState(prev => ({
              ...prev,
              teamName: nameFromEmail,
              status: roleIsAdmin ? 'ADMIN' : 'IDLE' 
            }));
          }
        } catch (err) {
          console.error("Initialization failed:", err);
          setGameState(prev => ({ ...prev, status: 'IDLE' }));
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setGameState(prev => ({ ...prev, status: 'LOGIN', rounds: [], score: 0 }));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- TRIGGER GAME GENERATION ---
  useEffect(() => {
    if (gameState.status === 'GENERATING' && gameState.rounds.length === 0) {
      const loadGame = async () => {
        try {
          const generatedRounds = await generateGameRounds((progress) => {
            setGameState(prev => ({ ...prev, loadingProgress: progress }));
          });
          
          setGameState(prev => ({
            ...prev,
            status: 'PLAYING',
            rounds: generatedRounds,
            loadingProgress: 100
          }));
          setCurrentRoundIndex(0);
          setTimeLeft(300); // RESET TIMER ON NEW GAME
        } catch (err) {
          console.error("Game gen failed:", err);
          setGameState(prev => ({ ...prev, status: 'IDLE' }));
        }
      };
      loadGame();
    }
    else if (gameState.status === 'GENERATING' && gameState.rounds.length > 0) {
       setGameState(prev => ({ ...prev, status: 'PLAYING' }));
       setTimeLeft(300); // Reset timer if restarting existing stack
    }
  }, [gameState.status, gameState.rounds.length]);

  // --- HANDLERS ---
  const handleLogin = async (usernameInput: string, passwordInput: string) => {
    setLoginError(undefined); 
    const email = `${usernameInput.trim()}@acm.com`;
    
    try {
      await signInWithEmailAndPassword(auth, email, passwordInput);
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError("INVALID_CREDENTIALS"); 
    }
  };

  const handleLogout = useCallback(async () => {
    if (window.confirm("Terminate session and return to terminal?")) {
      try {
        if (user && !isAdmin) await deleteDoc(doc(db, "active_sessions", user.uid));
        await signOut(auth);
        setGameState({
          status: 'LOGIN',
          rounds: [],
          loadingProgress: 0,
          score: 0,
          teamName: 'Guest Agent'
        });
        setCurrentRoundIndex(0); 
        setTimeLeft(300);
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }
  }, [user, isAdmin]);

  const startGame = useCallback(() => {
    if (user) {
      setGameState(prev => ({ ...prev, status: isAdmin ? 'ADMIN' : 'RULES' }));
    } else {
      setGameState(prev => ({ ...prev, status: 'LOGIN' }));
    }
  }, [user, isAdmin]);

  const handleSelection = useCallback((roundId: number, imageId: string) => {
    setGameState(prev => {
      const newRounds = prev.rounds.map(round => {
        if (round.id !== roundId) return round;
        const selectedImage = round.images.find(img => img.id === imageId);
        const isCorrect = selectedImage?.type === 'AI';
        return { ...round, userChoiceId: imageId, isCorrect: isCorrect };
      });
      
      const currentScore = newRounds.filter(r => r.isCorrect).length;
      savePartialProgress(newRounds, currentScore, prev.teamName);
      return { ...prev, rounds: newRounds, score: currentScore };
    });
  }, []);

  const handleNextRound = () => {
    if (currentRoundIndex < gameState.rounds.length - 1) {
      setCurrentRoundIndex(prev => prev + 1);
      setRoundTimeLeft(ROUND_TIME_LIMIT);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: 'IDLE',
      rounds: [],
      score: 0
    }));
    setCurrentRoundIndex(0); 
    setTimeLeft(300);
    setRoundTimeLeft(ROUND_TIME_LIMIT);
  }, []);

  // Helper variables for UI
  const currentRound = gameState.rounds[currentRoundIndex];
  const isCurrentRoundAnswered = currentRound?.userChoiceId !== null && currentRound?.userChoiceId !== undefined;
  const isLastRound = currentRoundIndex === gameState.rounds.length - 1;
  const completedRounds = gameState.rounds.filter(r => r.userChoiceId !== null).length;

  // --- VIEW ROUTING ---
  if (loading) return <LoadingScreen progress={0} />;
  
  if (gameState.status === 'LOGIN') {
    return (
      <LoginPage 
        onSubmit={handleLogin} 
        error={loginError}
      />
    );
  }
  
  if (gameState.status === 'ADMIN') {
    return (
      <AdminDashboard 
        onExit={() => setGameState({
          status: 'IDLE',
          rounds: [],
          loadingProgress: 0,
          score: 0,
          teamName: 'Guest Agent'
        })} 
      />
    );
  }

  if (gameState.status === 'RULES') {
    return (
      <RulesPage 
        onStart={() => setGameState(prev => ({ ...prev, status: 'GENERATING' }))} 
      />
    );
  }

  if (gameState.status === 'GENERATING') return <LoadingScreen progress={gameState.loadingProgress} />;

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

  // IDLE PAGE (HOME)
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

  // --- PLAYING VIEW ---
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
             {/* PER-ROUND TIMER DISPLAY (5s) */}
             <div className="flex items-center gap-2 border border-[#00FF9D]/40 bg-black/40 px-3 py-1.5 rounded">
                <Timer size={14} className="text-[#00FF9D]" />
                <span className="font-mono text-sm font-bold tracking-widest text-[#00FF9D]">
                  {Math.max(roundTimeLeft, 0)}s
                </span>
             </div>

             {/* GLOBAL TIMER DISPLAY */}
             <div className="flex items-center gap-2 border border-[#FF00E6]/30 bg-black/40 px-3 py-1.5 rounded">
                {timeLeft < 60 ? (
                  <AlertTriangle size={16} className="text-red-500 animate-pulse" />
                ) : (
                  <Timer size={16} className="text-[#FF00E6]" />
                )}
                <span className={`font-mono text-lg font-bold tracking-widest ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {formatTime(timeLeft)}
                </span>
             </div>

             <div className="flex flex-col items-end w-32">
                <span className="text-[10px] uppercase text-gray-400 font-mono tracking-widest">Progress</span>
                <div className="w-full h-3 bg-gray-800 border border-gray-600 mt-1">
                   <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" 
                        style={{ width: `${(completedRounds / gameState.rounds.length) * 100}%` }}></div>
                </div>
                <span className="text-[9px] mt-1 text-gray-500 font-mono">ROUND {currentRoundIndex + 1} / {gameState.rounds.length}</span>
             </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
           <div className="inline-block border-2 border-[#00FF9D] text-[#00FF9D] px-4 py-1 font-mono text-xs uppercase mb-2 bg-[#00FF9D]/10">Current Objective</div>
           <h2 className="text-3xl md:text-4xl font-heading text-white uppercase retro-text-shadow">Locate the AI Image</h2>
        </div>
        
        <div className="max-w-4xl mx-auto w-full mb-24">
          {currentRound && (
             <div className="animate-in fade-in slide-in-from-right-8 duration-500" key={currentRound.id}>
                <RoundCard 
                   round={currentRound} 
                   onSelect={handleSelection} 
                />
             </div>
          )}
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#13111C] via-[#13111C]/95 to-transparent z-40 border-t border-white/5 backdrop-blur-sm">
        <div className="container mx-auto flex justify-center">
          {!isLastRound ? (
            <button 
              onClick={handleNextRound} 
              disabled={!isCurrentRoundAnswered} 
              className={`group pointer-events-auto game-btn px-12 py-5 font-heading text-xl uppercase tracking-widest transition-all duration-300 flex items-center gap-4
                ${isCurrentRoundAnswered 
                  ? 'bg-white text-black hover:bg-[#00FF9D] shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'}`}
            >
              <span>Next Sequence</span>
              <ArrowRight className={`w-6 h-6 transition-transform ${isCurrentRoundAnswered ? 'group-hover:translate-x-2' : ''}`} />
            </button>
          ) : (
            <button 
              onClick={finishGame} 
              disabled={!isCurrentRoundAnswered} 
              className={`group pointer-events-auto game-btn px-16 py-5 font-heading text-2xl uppercase tracking-widest transition-all duration-500 transform 
                ${isCurrentRoundAnswered 
                  ? 'bg-[#00FF9D] text-black hover:scale-105 shadow-[0_0_30px_rgba(0,255,157,0.4)]' 
                  : 'bg-gray-800 text-gray-500 opacity-50 cursor-not-allowed'}`}
            >
              <div className="flex items-center gap-3">
                 <CheckCircle size={24} />
                 <span>Submit Results</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}