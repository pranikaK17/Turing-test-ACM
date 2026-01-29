import React from 'react';
import { ScanEye, Fingerprint, AlertTriangle, ArrowRight, Crosshair, ShieldCheck, Ban } from 'lucide-react';

interface RulesPageProps {
  onStart: () => void;
}

export default function RulesPage({ onStart }: RulesPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#13111C] font-mono text-white">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF00E6] rounded-full mix-blend-multiply filter blur-[150px] opacity-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00FF9D] rounded-full mix-blend-multiply filter blur-[150px] opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl animate-in zoom-in duration-300">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-block border border-[#00FF9D] text-[#00FF9D] px-4 py-1 text-xs uppercase mb-4 bg-[#00FF9D]/10 tracking-[0.2em] shadow-[0_0_10px_rgba(0,255,157,0.2)]">
            Mission Protocol
          </div>
          <h1 className="text-4xl md:text-6xl font-heading uppercase tracking-tighter text-white retro-text-shadow">
            Rules of <span className="text-[#FF00E6]">Engagement</span>
          </h1>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
            Your objective is to identify artificial impostors within the dataset. <br className="hidden md:block"/>
            Follow the protocols below to ensure high accuracy.
          </p>
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          {/* Rule Card 1 - UPDATED */}
          <div className="group relative bg-[#0A0A0B] border border-[#2A2440] hover:border-[#FF00E6] transition-colors duration-300 p-6 flex flex-col gap-4">
            <div className="absolute -top-3 -left-3">
              <div className="bg-[#FF00E6] text-white px-3 py-1 font-bold text-xs uppercase transform -rotate-2 shadow-[4px_4px_0px_#000]">
                Protocol 01
              </div>
            </div>
            <div className="flex items-start gap-4 mt-2">
              <div className="p-3 bg-[#FF00E6]/10 text-[#FF00E6] rounded-sm group-hover:bg-[#FF00E6] group-hover:text-white transition-colors">
                <Ban size={24} />
              </div>
              <div>
                <h3 className="text-xl font-heading uppercase tracking-wide mb-1 text-white">No Regression</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-[#00FF9D]">Forward navigation only.</span> You cannot return to previous images. Once submitted, the session is locked and cannot be retaken.
                </p>
              </div>
            </div>
          </div>

          {/* Rule Card 2 */}
          <div className="group relative bg-[#0A0A0B] border border-[#2A2440] hover:border-[#FF00E6] transition-colors duration-300 p-6 flex flex-col gap-4">
             <div className="absolute -top-3 -left-3">
              <div className="bg-[#FF00E6] text-white px-3 py-1 font-bold text-xs uppercase transform -rotate-2 shadow-[4px_4px_0px_#000]">
                Protocol 02
              </div>
            </div>
            <div className="flex items-start gap-4 mt-2">
              <div className="p-3 bg-[#FF00E6]/10 text-[#FF00E6] rounded-sm group-hover:bg-[#FF00E6] group-hover:text-white transition-colors">
                <Crosshair size={24} />
              </div>
              <div>
                <h3 className="text-xl font-heading uppercase tracking-wide mb-1 text-white">Target The AI</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Your goal is to click on the <span className="text-[#FF00E6]">AI Generated Image</span>. The "Real" image is your control variable. Do not select it.
                </p>
              </div>
            </div>
          </div>

          {/* Rule Card 3 */}
          <div className="group relative bg-[#0A0A0B] border border-[#2A2440] hover:border-[#FF00E6] transition-colors duration-300 p-6 flex flex-col gap-4">
             <div className="absolute -top-3 -left-3">
              <div className="bg-[#FF00E6] text-white px-3 py-1 font-bold text-xs uppercase transform -rotate-2 shadow-[4px_4px_0px_#000]">
                Protocol 03
              </div>
            </div>
            <div className="flex items-start gap-4 mt-2">
              <div className="p-3 bg-[#FF00E6]/10 text-[#FF00E6] rounded-sm group-hover:bg-[#FF00E6] group-hover:text-white transition-colors">
                <Fingerprint size={24} />
              </div>
              <div>
                <h3 className="text-xl font-heading uppercase tracking-wide mb-1 text-white">Details Matter</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  AI often struggles with <span className="text-[#00FF9D]">hands, text, and eyes</span>. Use these as primary indicators when the distinction is difficult.
                </p>
              </div>
            </div>
          </div>

          {/* Rule Card 4 */}
          <div className="group relative bg-[#0A0A0B] border border-[#2A2440] hover:border-[#FF00E6] transition-colors duration-300 p-6 flex flex-col gap-4">
             <div className="absolute -top-3 -left-3">
              <div className="bg-[#FF00E6] text-white px-3 py-1 font-bold text-xs uppercase transform -rotate-2 shadow-[4px_4px_0px_#000]">
                Protocol 04
              </div>
            </div>
            <div className="flex items-start gap-4 mt-2">
              <div className="p-3 bg-[#FF00E6]/10 text-[#FF00E6] rounded-sm group-hover:bg-[#FF00E6] group-hover:text-white transition-colors">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-xl font-heading uppercase tracking-wide mb-1 text-white">Move fast . Think sharp</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Your grade is calculated from two metrics: <span className="text-[#00FF9D]">response time</span> and <span className="text-[#00FF9D]">accuracy</span>.Excel in both to reach <span className="text-[#FF00E6]">"Godlike"</span> status.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer / Start Action */}
        <div className="flex flex-col items-center justify-center gap-6 pt-6 border-t border-white/5">
          <div className="flex items-center gap-2 text-[#00FF9D] text-xs uppercase tracking-widest animate-pulse">
            <AlertTriangle size={14} />
            <span>System Ready for uplink</span>
          </div>

          <button 
            onClick={onStart}
            // FIXED: Added 'overflow-hidden' here to stop the glitch effect from spilling out
            className="group relative inline-flex items-center gap-4 px-16 py-6 bg-[#FF00E6] text-white font-heading text-xl uppercase tracking-widest hover:bg-[#d900c4] active:scale-95 transition-all shadow-[0_0_40px_rgba(255,0,230,0.3)] hover:shadow-[0_0_60px_rgba(255,0,230,0.5)] overflow-hidden"
          >
            <span>START THE QUIZ </span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform relative z-10" />
            
            {/* Button Glitch Effect Overlay */}
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
          </button>
        </div>

      </div>
    </div>
  );
}
