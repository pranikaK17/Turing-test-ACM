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
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection,
  addDoc,
  serverTimestamp 
} from "firebase/firestore";
import { ArrowRight, RotateCcw, Zap, LogOut, CheckCircle, Timer } from 'lucide-react';

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
  
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [roundTimeLeft, setRoundTimeLeft] = useState(5);
  const totalElapsedSeconds = useRef(0);

  const [gameState, setGameState] = useState<GameState>({
    status: 'LOGIN',
    rounds: [],
    loadingProgress: 0,
    score: 0,
    teamName: 'Guest Agent'
  });
  const [loginError, setLoginError] = useState<string | undefined>(undefined);

  // --- GAME FINISH LOGIC (Uplink to History) ---
  const finishGame = useCallback(async (finalRounds?: any[], finalScore?: number) => {
    if (!user) return;
    
    // Set status to FINISHED immediately to clear the game UI and show success screen
    setGameState(prev => ({ ...prev, status: 'FINISHED' }));

    try {
      // 1. Save to unique document in 'submissions' for history tracking
      // FIX: Ensure first argument is the collection reference
      await addDoc(collection(db, "submissions"), {
        uid: user.uid,
        name: gameState.teamName,
        email: user.email,
        score: finalScore ?? gameState.score,
        timeTaken: totalElapsedSeconds.current,
        rounds: finalRounds ?? gameState.rounds,
        timestamp: serverTimestamp(),
        status: 'LOCKED',
        role: 'player'
      });

      // 2. Clear the active session (Heartbeat cleanup)
      // FIX: Clean reference to the session document
      const sessionDocRef = doc(db, "active_sessions", user.uid);
      await deleteDoc(sessionDocRef);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("Critical submission failure:", err);
    }
  }, [gameState.teamName, gameState.score, gameState.rounds, user]);

  // --- NAVIGATION LOGIC ---
  const handleNextRound = useCallback((updatedRounds?: any[], updatedScore?: number) => {
    const roundsRef = updatedRounds || gameState.rounds;
    const isAtLastRound = currentRoundIndex >= roundsRef.length - 1;
    
    if (!isAtLastRound) {
      setCurrentRoundIndex(prev => prev + 1);
      setRoundTimeLeft(5); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      finishGame(updatedRounds, updatedScore);
    }
  }, [currentRoundIndex, gameState.rounds, finishGame]);

  // --- TIMER LOGIC (Per Round + Final Transition Fix) ---
  useEffect(() => {
    let timerId: any;

    if (gameState.status === 'PLAYING') {
      timerId = setInterval(() => {
        totalElapsedSeconds.current += 1;

        setRoundTimeLeft((prev) => {
          if (prev <= 1) {
            const currentRound = gameState.rounds[currentRoundIndex];
            const isAtLastRound = currentRoundIndex >= gameState.rounds.length - 1;
            
            // Scenario A: Round has NOT been answered yet (Time Ran Out)
            if (currentRound && (currentRound.userChoiceId === undefined || currentRound.userChoiceId === null)) {
              const newRounds = [...gameState.rounds];
              newRounds[currentRoundIndex] = { 
                ...currentRound, 
                userChoiceId: null, 
                isCorrect: false 
              };
              
              const newScore = newRounds.filter(r => r.isCorrect).length;
              savePartialProgress(newRounds, newScore, gameState.teamName);

              if (isAtLastRound) {
                finishGame(newRounds, newScore);
                return 0; 
              } else {
                setGameState(prevGS => ({ ...prevGS, rounds: newRounds, score: newScore }));
                setCurrentRoundIndex(idx => idx + 1);
                return 5; 
              }
            }
            
            // Scenario B: Round was already answered, timer just hit zero
            if (isAtLastRound) {
              finishGame();
              return 0;
            } else {
              handleNextRound();
              return 5;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [gameState.status, currentRoundIndex, gameState.rounds, handleNextRound, finishGame, gameState.teamName]);


  // --- HEARTBEAT SYSTEM (Live Uplink) ---
  useEffect(() => {
    let heartbeatInterval: any;

    const updateHeartbeat = async () => {
      if (user && !isAdmin && gameState.status === 'PLAYING') {
        try {
          const sessionRef = doc(db, "active_sessions", user.uid);
          const progressCount = gameState.rounds.filter(r => r.userChoiceId !== undefined).length;

          await setDoc(sessionRef, {
            name: gameState.teamName,
            email: user.email,
            lastActive: serverTimestamp(),
            currentScore: gameState.score,
            progress: progressCount,
            rounds: gameState.rounds,
            totalTimeSpent: totalElapsedSeconds.current,
            status: 'LIVE',
            role: 'player'
          }, { merge: true });
        } catch (err) {
          console.error("Heartbeat sync failed:", err);
        }
      }
    };

    if (gameState.status === 'PLAYING' && user && !isAdmin) {
      updateHeartbeat(); 
      heartbeatInterval = setInterval(updateHeartbeat, 5000); 
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [gameState.status, user, isAdmin, gameState.teamName, gameState.score, gameState.rounds]);


  // --- AUTH & PERSISTENCE ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          const roleIsAdmin = userSnap.exists() && userSnap.data().role === 'admin';
          
          setIsAdmin(roleIsAdmin);
          setUser(currentUser);
          const nameFromEmail = currentUser.email?.split('@')[0] || 'Agent';

          if (roleIsAdmin) {
            setGameState(prev => ({ ...prev, teamName: nameFromEmail, status: 'ADMIN' }));
          } else {
            const sessionRef = doc(db, "active_sessions", currentUser.uid);
            const sessionSnap = await getDoc(sessionRef);

            if (sessionSnap.exists()) {
              const savedData = sessionSnap.data();
              const savedRounds = savedData.rounds || [];
              const answeredCount = savedRounds.filter((r: any) => r.userChoiceId !== undefined).length;
              
              totalElapsedSeconds.current = savedData.totalTimeSpent || 0;
              setCurrentRoundIndex(answeredCount < savedRounds.length ? answeredCount : 0);
              setRoundTimeLeft(5);

              setGameState({
                status: 'IDLE', 
                teamName: nameFromEmail,
                rounds: savedRounds,
                score: savedData.currentScore || 0,
                loadingProgress: 100
              });
            } else {
              setGameState(prev => ({ ...prev, teamName: nameFromEmail, status: 'IDLE' }));
            }
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
    return () => unsubscribeAuth();
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
          setRoundTimeLeft(5);
          totalElapsedSeconds.current = 0;
        } catch (err) {
          console.error("Game gen failed:", err);
          setGameState(prev => ({ ...prev, status: 'IDLE' }));
        }
      };
      loadGame();
    }
    else if (gameState.status === 'GENERATING' && gameState.rounds.length > 0) {
       setGameState(prev => ({ ...prev, status: 'PLAYING' }));
    }
  }, [gameState.status, gameState.rounds.length]);

  // --- HANDLERS ---
  const handleLogin = async (usernameInput: string, passwordInput: string) => {
    setLoginError(undefined); 
    const email = `${usernameInput.trim()}@acm.com`;
    try {
      await signInWithEmailAndPassword(auth, email, passwordInput);
    } catch (error) {
      setLoginError("INVALID_CREDENTIALS"); 
    }
  };

  const handleLogout = useCallback(async () => {
    if (window.confirm("Logout of terminal? Current progress will be saved in the dashboard.")) {
      try {
        await signOut(auth);
        setGameState({
          status: 'LOGIN',
          rounds: [],
          loadingProgress: 0,
          score: 0,
          teamName: 'Guest Agent'
        });
        setCurrentRoundIndex(0); 
        setRoundTimeLeft(5);
        totalElapsedSeconds.current = 0;
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }
  }, []);

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

  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: 'IDLE',
      rounds: [],
      score: 0
    }));
    setCurrentRoundIndex(0); 
    setRoundTimeLeft(5);
    totalElapsedSeconds.current = 0;
  }, []);

  // UI Helpers
  const currentRound = gameState.rounds[currentRoundIndex];
  const isCurrentRoundAnswered = currentRound?.userChoiceId !== undefined && currentRound?.userChoiceId !== null;
  const isLastRound = currentRoundIndex === gameState.rounds.length - 1;
  const completedRounds = gameState.rounds.filter(r => r.userChoiceId !== undefined).length;

  // --- VIEW ROUTING ---
  if (loading) return <LoadingScreen progress={0} />;
  
  if (gameState.status === 'LOGIN') {
    return <LoginPage onSubmit={handleLogin} error={loginError} />;
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
    return <RulesPage onStart={() => setGameState(prev => ({ ...prev, status: 'GENERATING' }))} />;
  }

  if (gameState.status === 'GENERATING') return <LoadingScreen progress={gameState.loadingProgress} />;

  if (gameState.status === 'FINISHED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#13111C]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF00E6] rounded-full mix-blend-multiply filter blur-[150px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00FF9D] rounded-full mix-blend-multiply filter blur-[150px] opacity-10 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="relative z-10 flex flex-col items-center w-full max-w-4xl animate-in zoom-in duration-300 text-center">
           <div className="mb-10 transform -rotate-1">
             <div className="bg-[#00FF9D] text-black border-2 border-[#00FF9D] px-6 py-2 font-mono text-sm font-bold uppercase tracking-widest shadow-[6px_6px_0px_rgba(0,0,0,1)]">
                // SYSTEM DIAGNOSTIC COMPLETE
             </div>
           </div>
           <h1 className="text-4xl md:text-6xl font-heading leading-none text-white retro-text-shadow uppercase mb-6">
             Uplink Successful
           </h1>
           <p className="text-2xl md:text-3xl font-heading uppercase tracking-[0.2em] text-yellow-400 mb-16">
             Attempt Saved to History
           </p>
           <button onClick={resetGame} className="group relative inline-flex items-center gap-4 px-12 py-6 bg-[#FF00E6] text-white font-heading text-2xl uppercase tracking-widest hover:bg-[#d900c4] hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(255,46,230,0.3)]">
             <RotateCcw className="w-8 h-8 group-hover:-rotate-180 transition-transform" />
             <span>Back to main page</span>
             <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
           </button>
        </div>
      </div>
    );
  }

  if (gameState.status === 'IDLE') {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-black">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF00E6] rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00FF9D] rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
        <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 text-center relative">
          <div className="mb-8 transform -rotate-2">
            <span className="bg-black text-[#00FF9D] border-2 border-[#00FF9D] px-4 py-2 font-mono text-sm uppercase tracking-widest shadow-[4px_4px_0px_#00FF9D]">v 1.2.0 // ACM SigAI Chapter</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-heading mb-6 leading-none retro-text-shadow text-white uppercase">REAL<br/><span className="text-[#FF00E6]">VS</span><br/>ARTIFICIAL</h1>
          <div className="max-w-xl mx-auto mb-12 bg-black/50 p-6 border-l-4 border-[#00FF9D] backdrop-blur-sm text-left">
            <p className="text-lg md:text-xl text-gray-200 leading-relaxed font-mono">Identify the <span className="text-[#00FF9D] font-bold">AI IMPOSTOR</span>.<br/>Distinguish hallucinations from <span className="text-[#FF00E6] font-bold">HUMAN SOUL</span>.</p>
          </div>
          <button onClick={startGame} className="group game-btn relative inline-flex items-center gap-4 px-12 py-6 bg-[#FF00E6] text-white font-heading text-2xl uppercase tracking-widest hover:bg-[#d900c4]">
            <Zap className="w-8 h-8 fill-current" /> Initialize Sequence <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white custom-scrollbar flex flex-col bg-[#0a0a0c]">
      <header className="sticky top-0 z-50 bg-[#13111C]/95 border-b-4 border-black px-4 py-3 shadow-[0px_4px_20px_rgba(0,0,0,0.5)]">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div onClick={resetGame} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
               <div className="bg-[#FF00E6] w-8 h-8 flex items-center justify-center border-2 border-black font-bold text-sm shadow-[2px_2px_0px_#000]">R</div>
               <div className="hidden sm:block"><span className="font-heading text-xl tracking-tighter uppercase">REAL<span className="text-[#00FF9D]">VS</span>AI</span></div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-[#1F1B2E] hover:bg-[#FF2E2E] text-gray-400 hover:text-white px-3 py-1.5 rounded border border-gray-700 transition-all group active:scale-95"
            >
              <LogOut size={14} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-tighter">Logout</span>
            </button>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-8">
             <div className={`flex items-center gap-2 border px-3 py-1.5 rounded ${roundTimeLeft <= 2 ? 'border-red-500 bg-red-500/10' : 'border-[#FF00E6]/30 bg-black/40'}`}>
                <Timer size={16} className={roundTimeLeft <= 2 ? 'text-red-500 animate-pulse' : 'text-[#FF00E6]'} />
                <span className={`font-mono text-lg font-bold tracking-widest ${roundTimeLeft <= 2 ? 'text-red-500' : 'text-white'}`}>
                  00:0{roundTimeLeft}
                </span>
             </div>

             <div className="flex flex-col items-end w-32">
                <span className="text-[10px] uppercase text-gray-400 font-mono tracking-widest">Progress</span>
                <div className="w-full h-3 bg-gray-800 border border-gray-600 mt-1">
                   <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" 
                        style={{ width: `${(completedRounds / gameState.rounds.length) * 100}%` }}></div>
                </div>
                <span className="text-[9px] mt-1 text-gray-500 font-mono uppercase">ROUND {currentRoundIndex + 1} / {gameState.rounds.length}</span>
             </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
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
      </main>
      
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#13111C] via-[#13111C]/95 to-transparent z-40 border-t border-white/5 backdrop-blur-sm">
        <div className="container mx-auto flex justify-center">
            <button 
              onClick={() => handleNextRound()} 
              disabled={!isCurrentRoundAnswered} 
              className={`group pointer-events-auto game-btn px-12 py-5 font-heading text-xl uppercase tracking-widest transition-all duration-300 flex items-center gap-4
                ${isCurrentRoundAnswered 
                  ? 'bg-white text-black hover:bg-[#00FF9D] shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'}`}
            >
              <span>{isLastRound ? 'Submit Results' : 'Next Sequence'}</span>
              {isLastRound ? <CheckCircle className="w-6 h-6" /> : <ArrowRight className={`w-6 h-6 transition-transform ${isCurrentRoundAnswered ? 'group-hover:translate-x-2' : ''}`} />}
            </button>
        </div>
      </div>
    </div>
  );
}
