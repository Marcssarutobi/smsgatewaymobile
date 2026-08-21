import React, { createContext, useContext, useEffect, useState } from 'react';
import { tokenStorage } from '../lib/tokenStorage';
import { authService } from '../services/authService';
import { queryClient } from '../lib/queryClient';

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
    try {
      await authService.logout();
    } catch (e) {
      // Le serveur peut être injoignable, ou le token déjà invalide/expiré
      // (ex: après un reset de base) — on ne bloque JAMAIS la déconnexion
      // locale pour autant, l'utilisateur doit toujours pouvoir se déconnecter.
    }

    await tokenStorage.clear();
    // Le pairing (deviceStorage) N'EST PAS effacé ici volontairement : le
    // téléphone reste configuré comme passerelle SMS indépendamment des
    // allers-retours de connexion/déconnexion de l'utilisateur, comme
    // WhatsApp. Le dépairage réel se fait uniquement depuis DashboardScreen
    // (bouton dédié, ou automatiquement si le serveur confirme que ce
    // device n'existe plus — voir le useEffect sur 404/403 dans ce fichier).

    // Vide tout le cache React Query (données du dashboard, device, etc.)
    // pour qu'un autre utilisateur qui se connecte ensuite ne voie jamais
    // une miette des données du compte précédent.
    queryClient.clear();

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