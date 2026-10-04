'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import { normalizeRole } from './rbac';
import { ADMIN_IDLE_TIMEOUT_MS } from './session';

interface UserData {
  uid: string;
  email: string | null;
  role: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            setUserData({
              ...data,
              uid: firebaseUser.uid,
              email: data.email ?? firebaseUser.email,
              role: normalizeRole(data.role) ?? 'EMPLOYEE',
            });
          } else {
            setUserData({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'EMPLOYEE', // Fallback or strict fail
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let timeoutId: number | undefined;
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

    const clearAdminSession = async () => {
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      await signOut(auth);
      window.location.assign('/login');
    };

    const resetTimer = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(clearAdminSession, ADMIN_IDLE_TIMEOUT_MS);
    };

    resetTimer();
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
