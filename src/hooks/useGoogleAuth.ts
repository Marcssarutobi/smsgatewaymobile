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
  const [pickerError, setPickerError] = useState<unknown>(null);

  const {
    mutate: loginWithGoogle,
    isPending,
    data,
    error: loginError, // erreur de l'appel POST /auth/google/mobile (ex: 401 "Token non destiné à cette application")
  } = useMutation({
    mutationFn: googleAuthService.loginWithIdToken,
  });

  const promptAsync = async () => {
    try {
      setPickerError(null);
      await GoogleSignin.hasPlayServices();

      // Sans ce signOut, une fois qu'un compte a été choisi une première fois,
      // le module natif Google garde une session en cache : les appels
      // suivants à signIn() ne réaffichent plus le sélecteur de comptes (ils
      // tentent une reconnexion silencieuse) et, si une tentative précédente
      // n'a jamais résolu proprement sa promesse, peuvent même rester bloqués
      // sans jamais rien renvoyer. On repart donc d'un état propre à chaque clic.
      if (GoogleSignin.hasPreviousSignIn()) {
        await GoogleSignin.signOut();
      }

      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (idToken) {
        loginWithGoogle(idToken, {
          onError: (e) => console.error('[GoogleAuth] Échec appel /auth/google/mobile:', e),
        });
      } else {
        setPickerError(new Error('Aucun id_token retourné par Google'));
      }
    } catch (e: any) {
      // L'utilisateur a simplement annulé : ce n'est pas une erreur à afficher.
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      // Une tentative précédente est encore considérée "en cours" côté natif
      // (cas où une tentative antérieure n'a jamais résolu sa promesse).
      if (e?.code === statusCodes.IN_PROGRESS) {
        setPickerError(new Error('Une connexion Google est déjà en cours, réessaie dans quelques secondes.'));
        return;
      }
      setPickerError(e);
    }
  };

  const isConfigured = GOOGLE_WEB_CLIENT_ID.length > 0;

  return {
    promptAsync,
    isReady: isConfigured,
    isPending,
    data,
    // On expose désormais AUSSI l'erreur backend (loginError), qui avant
    // n'était jamais renvoyée : le picker Google réussissait, l'appel au
    // backend échouait, et personne n'était prévenu (ni toast, ni navigation).
    error: pickerError ?? loginError,
    isConfigured,
  };
}
