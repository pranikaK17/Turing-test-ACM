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


// Static Data Source - Replace URLs with your actual image paths later
// type: 'DESIGN' = Real/Human
// type: 'AI' = Artificial
const STATIC_DATA = [
  {
    subject: "",
    images: [
      { url: childrenREAL, type: 'DESIGN' },
      { url: childrenAI, type: 'AI' }
    ]
  },
  {
    subject: "",
    images: [
      { url: trainREAL, type: 'DESIGN' },
      { url: trainAI, type: 'AI' }
    ]
  },
  {
    subject: "",
    images: [
      { url: droneREAL, type: 'DESIGN' },
      { url: droneAI, type: 'AI' }
    ]
  },
  {
    subject: "",
    images: [
      { url: dogREAL, type: 'DESIGN' },
      { url: dogFAKE, type: 'AI' }
    ]
  },
  {
    subject: "",
    images: [
      { url: parachuteREAL, type: 'DESIGN' },
      { url: parachuteAI, type: 'AI' }
    ]
  },
  {
    subject: "",
    images: [
      { url: snowREAL, type: 'DESIGN' },
      { url: snowAI, type: 'AI' }
    ]
  }
] as const;

export async function generateGameRounds(
  onProgress: (progress: number) => void
): Promise<GameRound[]> {
  const rounds: GameRound[] = [];
  const totalSteps = STATIC_DATA.length;

  // Simulate loading delay for game feel
  for (let i = 0; i < totalSteps; i++) {
    // Fake delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const data = STATIC_DATA[i];
    
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

    // Randomize order so AI isn't always second
    const isFirst = Math.random() > 0.5;
    
    rounds.push({
      id: i + 1,
      subject: data.subject,
      images: isFirst ? [image1, image2] : [image2, image1],
      userChoiceId: null,
      isCorrect: null
    });

    onProgress(((i + 1) / totalSteps) * 100);
  }

  return rounds;
}