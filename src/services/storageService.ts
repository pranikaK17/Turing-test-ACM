import { db, auth } from "../firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc
} from "firebase/firestore";

/**
 * Helper to determine if the current agent is an Admin.
 */
const isUserAdmin = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() && userDoc.data().role === 'admin';
  } catch (e) {
    return false;
  }
};

/**
 * SAVE PARTIAL PROGRESS (Live Heartbeat)
 * Updates the 'active_sessions' collection using the UID as the key.
 * This keeps exactly ONE live row per person in the "Live Signals" section.
 */
export const savePartialProgress = async (rounds: any[], score: number, teamName: string) => {
  if (!auth.currentUser) return;

  try {
    const uid = auth.currentUser.uid;
    // Admins shouldn't clutter the live feed
    const isAdmin = await isUserAdmin(uid);
    if (isAdmin) return; 

    const sessionRef = doc(db, "active_sessions", uid);
    
    // Progress is the count of rounds where a choice was made
    const progressCount = rounds.filter(r => r.userChoiceId !== undefined).length;

    await setDoc(sessionRef, {
      name: teamName,
      email: auth.currentUser.email,
      rounds: rounds,          
      currentScore: score,     
      progress: progressCount, 
      lastActive: serverTimestamp(),
      status: 'LIVE',
      role: 'player' 
    }, { merge: true });
  } catch (e) {
    console.error("HEARTBEAT_SYNC_ERROR:", e);
  }
};

/**
 * SAVE FINAL SCORE (Final Archive)
 * Creates a NEW unique document in 'submissions' every time.
 */
export const saveScore = async (
  teamName: string, 
  score: number, 
  timeTaken: number, 
  rounds: any[] 
) => {
  if (!auth.currentUser) {
    console.error("UPLINK_DENIED: No session found.");
    return;
  }

  try {
    const uid = auth.currentUser.uid;
    const email = auth.currentUser.email;
    const isAdmin = await isUserAdmin(uid);
    
    // Admins don't get ranked
    if (isAdmin) {
      await deleteDoc(doc(db, "active_sessions", uid)).catch(() => {});
      return;
    }

    // --- CALCULATE ATTEMPT NUMBER ---
    const submissionsRef = collection(db, "submissions");
    const q = query(submissionsRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    const attemptNumber = querySnapshot.size + 1; 

    // 1. Permanent Archive Entry (UNIQUE DOCUMENT)
    // Using addDoc() instead of setDoc() prevents overwriting.
    await addDoc(collection(db, "submissions"), {
      uid: uid,
      name: teamName,
      email: email,
      score: score,
      timeTaken: timeTaken || 0,
      rounds: rounds, 
      attempt: attemptNumber, 
      timestamp: serverTimestamp(), // Dashboard uses this for sorting
      status: 'LOCKED',
      role: 'player'
    });

    // 2. Clear Active Session
    // Deleting the UID-based session allows the user to start a fresh game
    // without seeing their old "In Progress" results.
    await deleteDoc(doc(db, "active_sessions", uid));

    console.log(`UPLINK_SUCCESS: Locked Attempt #${attemptNumber} for ${email}. Score: ${score}`);
  } catch (e) {
    console.error("DATABASE_CRITICAL_ERROR:", e);
    throw e; // Pass to App.tsx so it can handle UI error states
  }
};
