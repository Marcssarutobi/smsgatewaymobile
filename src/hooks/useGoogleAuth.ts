import { useState } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useMutation } from '@tanstack/react-query';
import { googleAuthService } from '../services/googleAuthService';
import { GOOGLE_WEB_CLIENT_ID } from '../lib/config';

// SDK natif Google (Play Services / Credential Manager) : contrairement à
// expo-auth-session, `GoogleSignin.signIn()` affiche le sélecteur de comptes
// natif Android (tiroir en bas avec les comptes déjà connectés sur le
// téléphone) au lieu d'ouvrir un navigateur. Nécessite un dev build / build
// EAS (ne fonctionne pas dans Expo Go) et le SHA-1 du build enregistré côté
// Google Cloud Console sur le client OAuth "Android".
GoogleSignin.configure({
  // Toujours le client "Web" : c'est lui qui signe l'id_token vérifié par le
  // backend (voir GOOGLE_WEB_CLIENT_ID côté Laravel) — inchangé par rapport à
  // avant, aucune modification nécessaire côté backend.
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

export function useGoogleAuth() {
  const [error, setError] = useState<unknown>(null);

  const {
    mutate: loginWithGoogle,
    isPending,
    data,
  } = useMutation({
    mutationFn: googleAuthService.loginWithIdToken,
  });

  const promptAsync = async () => {
    try {
      setError(null);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (idToken) {
        loginWithGoogle(idToken);
      } else {
        setError(new Error('Aucun id_token retourné par Google'));
      }
    } catch (e: any) {
      // L'utilisateur a simplement annulé : ce n'est pas une erreur à afficher.
      if (e?.code !== statusCodes.SIGN_IN_CANCELLED) {
        setError(e);
      }
    }
  };

  const isConfigured = GOOGLE_WEB_CLIENT_ID.length > 0;

  return {
    promptAsync,
    isReady: isConfigured,
    isPending,
    data,
    error,
    isConfigured,
  };
}
