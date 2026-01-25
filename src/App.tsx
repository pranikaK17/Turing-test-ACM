import React, { useState, useCallback, useRef } from 'react';
import { generateGameRounds } from './services/gameService';
import { saveScore } from './services/storageService';
import { GameState } from '../types';
import { LoadingScreen } from './components/LoadingScreen';
import { RoundCard } from './components/RoundCard';
// REMOVED: LoginPage and AdminDashboard imports
import { Trophy, ArrowRight, RotateCcw, Zap } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    status: 'IDLE', // CHANGED: Starts directly at Landing Page
    rounds: [],
    loadingProgress: 0,
    score: 0,
    teamName: 'Guest Agent' // CHANGED: Default name since there is no login
  });

  const roundsEndRef = useRef<HTMLDivElement>(null);

  // REMOVED: handleLogin, handleAdminLogin, handleLogout

  // Initialize Game
  const startGame = useCallback(async () => {
    setGameState(prev => ({ ...prev, status: 'GENERATING', loadingProgress: 0, score: 0 }));
    
    try {
      const rounds = await generateGameRounds((progress) => {
        setGameState(prev => ({ ...prev, loadingProgress: progress }));
      });
      
      setGameState(prev => ({
        ...prev,
        status: 'PLAYING',
        rounds: rounds,
        loadingProgress: 100
      }));
    } catch (error) {
      console.error("Failed to start game", error);
      setGameState(prev => ({ ...prev, status: 'IDLE' }));
    }
  }, []);

  // Handle Selection
  const handleSelection = useCallback((roundId: number, imageId: string) => {
    setGameState(prev => {
      const newRounds = prev.rounds.map(round => {
        if (round.id !== roundId) return round;
        
        // Find selected image
        const selectedImage = round.images.find(img => img.id === imageId);
        const isCorrect = selectedImage?.type === 'AI'; 
        
        return {
          ...round,
          userChoiceId: imageId,
          isCorrect: isCorrect
        };
      });
      
      // Calculate current score
      const currentScore = newRounds.filter(r => r.isCorrect).length;

      return {
        ...prev,
        rounds: newRounds,
        score: currentScore
      };
    });
  }, []);

  // Handle Submit / Finish
  const finishGame = useCallback(() => {
    // Save Score to Local Storage (Optional now since there is no unique user)
    setGameState(prev => {
      saveScore(prev.teamName, prev.score);
      return { ...prev, status: 'FINISHED' };
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Reset Game to Landing Page
  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: 'IDLE',
      rounds: [],
      score: 0
    }));
  }, []);

  // Calculate completion
  const completedRounds = gameState.rounds.filter(r => r.userChoiceId !== null).length;
  const isAllAnswered = completedRounds === 5;

  // --- VIEW ROUTING ---
  
  // REMOVED: Checks for 'LOGIN' and 'ADMIN'

  if (gameState.status === 'GENERATING') {
    return <LoadingScreen progress={gameState.loadingProgress} />;
  }

  if (gameState.status === 'FINISHED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#13111C]">
        
        <div className="game-card w-full max-w-2xl p-8 md:p-12 text-center relative z-10 animate-in zoom-in duration-300">
           
           <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
             <div className="bg-yellow-400 p-6 rounded-full border-4 border-black shadow-[0px_10px_0px_rgba(0,0,0,0.3)]">
                <Trophy className="w-16 h-16 text-black" strokeWidth={2.5} />
             </div>
           </div>

           <div className="mt-12 space-y-4">
              <h2 className="text-2xl font-bold uppercase text-gray-400 tracking-widest">Mission Complete</h2>
              <h1 className="text-6xl md:text-8xl font-heading text-white retro-text-shadow">
                {gameState.score} / 5
              </h1>
           </div>
           
           <p className="text-2xl font-bold text-[#00FF9D] mt-4 mb-8 uppercase tracking-wide">
             {gameState.score === 5 ? ">> GODLIKE DETECTION <<" :
              gameState.score >= 3 ? ">> SKILLED OPERATOR <<" :
              ">> SYSTEM COMPROMISED <<"}
           </p>

           <div className="grid gap-3 mb-12 text-left">
             {gameState.rounds.map(round => (
                <div key={round.id} className="flex items-center justify-between p-3 bg-black/40 border-l-4 border-gray-700 hover:bg-black/60 transition-colors">
                   <span className="text-gray-300 font-mono text-sm uppercase">Lvl {round.id}: {round.subject}</span>
                   <span className={`font-bold uppercase text-sm px-2 py-1 ${round.isCorrect ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>
                     {round.isCorrect ? 'SUCCESS' : 'FAILED'}
                   </span>
                </div>
             ))}
           </div>

           <div className="flex flex-col gap-4">
             <button 
               onClick={resetGame}
               className="w-full game-btn bg-[#00FF9D] text-black font-heading text-2xl py-4 hover:bg-[#00e68d] flex items-center justify-center gap-3 uppercase tracking-wider"
             >
               <RotateCcw size={28} />
               Reboot System
             </button>
           </div>
        </div>
      </div>
    );
  }

  if (gameState.status === 'IDLE') {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden">
        {/* Decorative BG Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF00E6] rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00FF9D] rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>

        <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 text-center relative">
          
          <div className="mb-8 transform -rotate-2">
            <span className="bg-black text-[#00FF9D] border-2 border-[#00FF9D] px-4 py-2 font-mono text-sm uppercase tracking-widest shadow-[4px_4px_0px_#00FF9D]">
              v 2.5.0 // ACM SigAI Chapter
            </span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-heading mb-6 leading-none retro-text-shadow">
            REAL<br/>
            <span className="text-[#FF00E6]">VS</span><br/>
            ARTIFICIAL
          </h1>
          
          <div className="max-w-xl mx-auto mb-12 bg-black/50 p-6 border-l-4 border-[#00FF9D] backdrop-blur-sm">
            <p className="text-lg md:text-xl text-gray-200 leading-relaxed font-mono">
              Identify the <span className="text-[#00FF9D] font-bold">AI IMPOSTOR</span>.<br/>
              Distinguish hallucinations from <span className="text-[#FF00E6] font-bold">HUMAN SOUL</span>.
            </p>
          </div>

          <button 
            onClick={startGame}
            className="group game-btn relative inline-flex items-center gap-4 px-12 py-6 bg-[#FF00E6] text-white font-heading text-2xl uppercase tracking-widest hover:bg-[#d900c4]"
          >
            <Zap className="w-8 h-8 fill-current" />
            Initialize
            <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
          </button>
          
          <div className="mt-12 flex gap-8 text-gray-500 font-mono text-xs uppercase">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#00FF9D] rounded-full animate-ping"></div>
              <span>System Online</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // PLAYING STATE
  return (
    <div className="min-h-screen crt text-white custom-scrollbar flex flex-col">
      {/* HUD Header */}
      <header className="sticky top-0 z-50 bg-[#13111C]/95 border-b-4 border-black px-4 py-3 shadow-[0px_4px_20px_rgba(0,0,0,0.5)]">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="bg-[#FF00E6] w-8 h-8 flex items-center justify-center border-2 border-black font-bold text-sm">R</div>
             <div className="hidden sm:block">
               <span className="font-heading text-xl tracking-tighter">REAL<span className="text-[#00FF9D]">VS</span>AI</span>
             </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-8">
             {/* Score Counter */}
             <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase text-gray-400 font-mono tracking-widest">Score</span>
                <span className="font-heading text-2xl text-[#00FF9D] leading-none retro-text-shadow">{gameState.score}</span>
             </div>

             {/* Progress Bar/Counter */}
             <div className="flex flex-col items-end w-32">
                <span className="text-[10px] uppercase text-gray-400 font-mono tracking-widest">Progress</span>
                <div className="w-full h-3 bg-gray-800 border border-gray-600 mt-1">
                   <div 
                     className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                     style={{ width: `${(Math.min(completedRounds, 5) / 5) * 100}%` }}
                   ></div>
                </div>
             </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="text-center mb-12">
           <div className="inline-block border-2 border-[#00FF9D] text-[#00FF9D] px-4 py-1 font-mono text-xs uppercase mb-2 bg-[#00FF9D]/10">
             Current Objective
           </div>
           <h2 className="text-3xl md:text-4xl font-heading text-white uppercase retro-text-shadow">
             Locate the AI Image
           </h2>
        </div>

        <div className="space-y-4">
          {gameState.rounds.map((round) => (
            <RoundCard 
              key={round.id} 
              round={round} 
              onSelect={handleSelection} 
            />
          ))}
        </div>

        <div ref={roundsEndRef} className="pb-32"></div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 w-full p-6 pointer-events-none flex justify-center z-40 bg-gradient-to-t from-[#13111C] via-[#13111C]/90 to-transparent">
        <button
          onClick={finishGame}
          disabled={!isAllAnswered}
          className={`
            pointer-events-auto game-btn px-16 py-5 font-heading text-2xl uppercase tracking-widest transition-all duration-300 transform 
            ${isAllAnswered 
              ? 'bg-[#00FF9D] text-black translate-y-0 opacity-100 hover:scale-105' 
              : 'bg-gray-800 text-gray-500 translate-y-12 opacity-0'}
          `}
        >
          Submit Results
        </button>
      </div>
    </div>
  );
}