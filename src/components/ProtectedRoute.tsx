import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean; // New prop to differentiate Admin vs Player routes
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps): React.JSX.Element => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Logic: Check Firestore for the role
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          const role = userDoc.data()?.role;
          setIsAdmin(role === 'admin');
        } catch (error) {
          console.error("Role verification failed:", error);
          setIsAdmin(false);
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    // UI remains identical to your original
    return <div className="flex h-screen items-center justify-center bg-[#13111C] text-[#00FF9D] font-mono tracking-widest">INITIALIZING...</div>;
  }

  // 1. If not logged in, redirect to login/home
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2. Logic: If route requires Admin but user is just a Player
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
