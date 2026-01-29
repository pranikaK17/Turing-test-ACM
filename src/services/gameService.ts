import { GameRound, GameImage } from "../../types";
import childrenAI from "../images/childrenAI.jpeg";
import childrenREAL from "../images/childrenREAL.jpeg";
import trainAI from "../images/trainAI.jpeg";
import trainREAL from "../images/trainREAL.jpeg";
import dogFAKE from "../images/dogFAKE.jpeg";
import dogREAL from "../images/dogREAL.jpeg";
import snowREAL from "../images/snowREAL.jpeg";
import snowAI from "../images/snowAI.jpeg";
import parachuteAI from "../images/parachuteAI.jpeg";
import parachuteREAL from "../images/parachuteREAL.jpeg";
import droneREAL from "../images/droneREAL.jpeg";
import droneAI from "../images/droneAI.jpeg";

const STATIC_DATA = [
  {
    subject: "Children playing",
    images: [
      { url: childrenREAL, type: 'AI' },
      { url: childrenAI, type: 'DESIGN' }
    ]
  },
  {
    subject: "Train station",
    images: [
      { url: trainREAL, type: 'AI' },
      { url: trainAI, type: 'DESIGN' }
    ]
  },
  {
    subject: "Drone view",
    images: [
      { url: droneREAL, type: 'AI' },
      { url: droneAI, type: 'DESIGN' }
    ]
  },
  {
    subject: "Dog portrait",
    images: [
      { url: dogREAL, type: 'AI' },
      { url: dogFAKE, type: 'DESIGN' }
    ]
  },
  {
    subject: "Parachute descent",
    images: [
      { url: parachuteREAL, type: 'AI' },
      { url: parachuteAI, type: 'DESIGN' }
    ]
  },
  {
    subject: "Snowy landscape",
    images: [
      { url: snowREAL, type: 'AI' },
      { url: snowAI, type: 'DESIGN' }
    ]
  }
] as const;

/**
 * SHUFFLE HELPER: Fisher-Yates Algorithm
 * Ensures every permutation of the array is equally likely.
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function generateGameRounds(
  onProgress: (progress: number) => void
): Promise<GameRound[]> {
  const rounds: GameRound[] = [];
  
  // LOGIC: Randomize the order of the question set pool
  const randomizedDataPool = shuffleArray([...STATIC_DATA]);
  const totalSteps = randomizedDataPool.length;

  for (let i = 0; i < totalSteps; i++) {
    // Artificial delay for "neural link" loading feel
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const data = randomizedDataPool[i];
    
    const image1: GameImage = {
      id: `round-${i}-img1`,
      url: data.images[0].url,
      type: data.images[0].type as 'DESIGN' | 'AI'
    };

    const image2: GameImage = {
      id: `round-${i}-img2`,
      url: data.images[1].url,
      type: data.images[1].type as 'DESIGN' | 'AI'
    };

    // LOGIC: Randomize image position (Left vs Right)
    const isFirst = Math.random() > 0.5;
    
    rounds.push({
      id: i + 1, // Visual ID for the UI
      subject: data.subject,
      images: isFirst ? [image1, image2] : [image2, image1],
      userChoiceId: null,
      isCorrect: null
    });

    onProgress(((i + 1) / totalSteps) * 100);
  }

  return rounds;
}
