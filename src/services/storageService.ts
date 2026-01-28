import { db, auth } from "../firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc,
  deleteDoc
} from "firebase/firestore";

// SAVE PARTIAL PROGRESS
export const savePartialProgress = async (rounds: any[], score: number, teamName: string) => {
  if (!auth.currentUser) return;

  try {
    const sessionRef = doc(db, "active_sessions", auth.currentUser.uid);

    const progressCount = rounds.filter(r => r.userChoiceId !== null).length;

    await setDoc(sessionRef, {
      name: teamName,
      email: auth.currentUser.email,
      rounds: rounds,
      currentScore: score,
      progress: progressCount,
      lastActive: serverTimestamp(),
      status: 'LIVE'
    }, { merge: true });
  } catch (e) {
    console.error("CRITICAL_SYNC_FAILURE:", e);
  }
};

// SAVE FINAL SCORE
export const saveScore = async (teamName: string, score: number) => {
  if (!auth.currentUser) {
    console.error("ACCESS_DENIED: No authenticated agent found.");
    return;
  }

  try {
    await addDoc(collection(db, "submissions"), {
      name: teamName,
      email: auth.currentUser.email,
      score: score,
      timestamp: serverTimestamp(),
      status: 'LOCKED'
    });


    const sessionRef = doc(db, "active_sessions", auth.currentUser.uid);
    await deleteDoc(sessionRef);

    console.log("DATA_UPLINK_SUCCESS: Score committed to mainframe.");
  } catch (e) {
    console.error("DATABASE_ERROR: Final sync failed:", e);
  }
};
