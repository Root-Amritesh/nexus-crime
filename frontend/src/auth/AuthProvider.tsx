import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, isDemoMode, getIdToken } from './firebase';

interface AuthContextType {
  /** Current Firebase user, or null if not signed in */
  user: User | null;
  /** True while Firebase auth state is being resolved on initial load */
  loading: boolean;
  /** True when running in demo mode (no real Firebase auth) */
  demoMode: boolean;
  /** Demo investigator ID used when demoMode is true */
  demoInvestigatorId: string;
  /** Get the current ID token for backend API calls */
  getToken: () => Promise<string | null>;
  /** Sign out the current user */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  demoMode: false,
  demoInvestigatorId: 'INV-DEMO-001',
  getToken: async () => null,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const demoMode = isDemoMode();
  const demoInvestigatorId = 'INV-DEMO-001';

  useEffect(() => {
    if (demoMode) {
      // In demo mode, skip Firebase auth listener entirely
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [demoMode]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (demoMode) return null;
    return getIdToken();
  }, [demoMode]);

  const logout = useCallback(async () => {
    if (!demoMode) {
      await signOut(auth);
    }
    setUser(null);
  }, [demoMode]);

  return (
    <AuthContext.Provider value={{ user, loading, demoMode, demoInvestigatorId, getToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
