import React, { createContext, useContext, useEffect, useState } from 'react';
import { tokenStorage } from '../lib/tokenStorage';

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tokenStorage.get().then((storedToken) => {
      setToken(storedToken);
      setIsLoading(false);
    });
  }, []);

  const signIn = async (newToken: string) => {
    await tokenStorage.set(newToken);
    setToken(newToken);
  };

  const signOut = async () => {
    await tokenStorage.clear();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
}