import React from 'react';
import { GameRound } from '../../types';
import { Check, X, Bot, Paintbrush2 } from 'lucide-react';

interface RoundCardProps {
  round: GameRound;
  onSelect: (roundId: number, imageId: string) => void;
}

export const RoundCard: React.FC<RoundCardProps> = ({ round, onSelect }) => {
  const hasSelected = round.userChoiceId !== null;

  return (
    <div className="w-full max-w-5xl mx-auto mb-16 relative">
      {/* Decorative background element */}
      <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-blue-600 opacity-20 transform -rotate-1 rounded-3xl blur-xl -z-10"></div>

      <div className="game-card rounded-xl p-0 overflow-hidden">
        {/* Card Header */}
        <div className="bg-[#2D2440] border-b-4 border-black p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#FF00E6] text-black font-heading text-xl px-4 py-2 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.5)] transform -rotate-2">
              ROUND {round.id}
            </div>
            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">
              Mission: <span className="text-[#00FF9D]">{round.subject}</span>
            </h3>
          </div>
          <div className="hidden md:block text-xs font-mono text-gray-400 bg-black/30 px-3 py-1 rounded">
             DETECT THE AI IMPOSTOR
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8 bg-[#181524]">
          {round.images.map((image) => {
            const isSelected = round.userChoiceId === image.id;
            const isCorrect = image.type === 'AI'; 
            
            // Logic for visual states
            let containerClass = "border-gray-700 hover:border-[#00FF9D] hover:scale-[1.02] hover:-rotate-1 cursor-pointer";
            let shadowClass = "hover:shadow-[8px_8px_0px_#00FF9D]";
            let overlay = null;

            if (hasSelected) {
              if (isSelected) {
                if (isCorrect) {
                  containerClass = "border-[#00FF9D] scale-100 ring-4 ring-[#00FF9D]/30 z-10";
                  shadowClass = "shadow-[0px_0px_30px_rgba(0,255,157,0.4)]";
                } else {
                  containerClass = "border-[#FF2E2E] scale-100 ring-4 ring-[#FF2E2E]/30 z-10";
                  shadowClass = "shadow-[0px_0px_30px_rgba(255,46,46,0.4)]";
                }
              } else {
                containerClass = "border-gray-800 opacity-40 grayscale scale-95";
                shadowClass = "";
              }
            } else {
              containerClass += " border-gray-700";
            }

            return (
              <div 
                key={image.id}
                onClick={() => !hasSelected && onSelect(round.id, image.id)}
                className={`relative transition-all duration-300 group ${shadowClass}`}
              >
                {/* Frame */}
                <div className={`relative bg-black border-4 ${containerClass} transition-all duration-300 aspect-square overflow-hidden`}>
                   <img 
                     src={image.url} 
                     alt={round.subject}
                     className="object-cover w-full h-full"
                     loading="lazy"
                   />
                   
                   {/* Selection/Result Overlay */}
                   {hasSelected && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                         {/* Badge */}
                         <div className={`
                            transform rotate-[-6deg] px-6 py-3 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.5)]
                            flex items-center gap-3 font-heading text-2xl uppercase
                            ${image.type === 'AI' ? 'bg-[#00FF9D] text-black' : 'bg-[#FF00E6] text-white'}
                         `}>
                            {image.type === 'AI' ? <Bot size={28} /> : <Paintbrush2 size={28} />}
                            {image.type === 'AI' ? 'AI Generated' : 'Human Design'}
                         </div>
                         
                         {isSelected && (
                           <div className="mt-8 transform scale-150">
                             {isCorrect ? (
                               <div className="bg-green-500 rounded-full p-2 border-4 border-black">
                                 <Check className="w-12 h-12 text-white" strokeWidth={4} />
                               </div>
                             ) : (
                               <div className="bg-red-500 rounded-full p-2 border-4 border-black">
                                 <X className="w-12 h-12 text-white" strokeWidth={4} />
                               </div>
                             )}
                           </div>
                         )}
                      </div>
                   )}
                </div>

                {/* Hover "Pick Me" Text - Only if not selected yet */}
                {!hasSelected && (
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-20">
                    <div className="bg-white text-black font-bold px-4 py-1 border-2 border-black shadow-[4px_4px_0px_#000] uppercase text-sm">
                      Select
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Round Result Footer */}
        {hasSelected && (
           <div className={`p-4 text-center border-t-4 border-black ${round.isCorrect ? 'bg-[#00FF9D]/20' : 'bg-[#FF2E2E]/20'}`}>
              <h4 className={`font-heading text-xl uppercase ${round.isCorrect ? 'text-[#00FF9D]' : 'text-[#FF2E2E]'}`}>
                 {round.isCorrect ? ">> TARGET IDENTIFIED SUCCESSFULLY <<" : ">> ERROR: HUMAN ART DETECTED <<"}
              </h4>
           </div>
        )}
      </div>
    </div>
  );
};