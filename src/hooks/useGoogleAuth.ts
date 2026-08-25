import { useState } from 'react';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
import { useMutation } from '@tanstack/react-query';
import { googleAuthService } from '../services/googleAuthService';
import { GOOGLE_WEB_CLIENT_ID } from '../lib/config';

// Décode la partie payload d'un JWT (base64url) sans vérifier la signature -
// uniquement pour lire des claims publics (ex: "aud") à des fins de debug
// côté client. Ne JAMAIS s'en servir pour valider un token : seule la
// vérification serveur (voir GoogleAuthController::mobileLogin) fait foi.
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    let base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const json =
      typeof atob === 'function'
        ? decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
        : Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Traduit l'erreur brute (native GoogleSignin OU réponse axios du backend) en
// message lisible et EXACT à afficher à l'utilisateur. C'est volontairement
// verbeux : le but est de voir la vraie cause en prod (build signé / APK),
// là où "en local ça marchait" parce que le dev client utilisait un SHA-1 /
// une config différente de celle du build distribué.
export function getGoogleAuthErrorMessage(error: unknown): string {
  const e = error as any;
  if (!e) return 'Erreur inconnue.';

  // Erreur venant du backend (POST /auth/google/mobile a répondu, mais en erreur).
  if (e?.response) {
    const status = e.response.status;
    const backendMessage = e.response.data?.message ?? e.response.data?.error;
    if (backendMessage) return `[${status}] ${backendMessage}`;
    return `Le serveur a répondu avec le code ${status}.`;
  }
  if (e?.request && !e?.response) {
    // Requête envoyée mais aucune réponse (mauvais API_BASE_URL, pas de réseau, CORS, etc.)
    return `Impossible de joindre le serveur (${e?.message ?? 'pas de réponse'}).`;
  }

  // Erreurs natives connues du module GoogleSignin.
  switch (e?.code) {
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return 'Google Play Services indisponible ou obsolète sur cet appareil.';
    case statusCodes.SIGN_IN_REQUIRED:
      return 'Connexion Google requise (session native invalide).';
    case statusCodes.NULL_PRESENTER:
      return "Erreur d'affichage du sélecteur de comptes Google (NULL_PRESENTER).";
    // Code natif Android "DEVELOPER_ERROR" (10) : la config OAuth ne
    // correspond pas au build utilisé. Cause la plus fréquente d'un
    // "ça marchait en local" : le SHA-1 du build de dev est enregistré dans
    // Google Cloud Console, mais pas celui du build signé (release/EAS/APK),
    // ou le package name / SHA-1 déclaré ne correspond pas à ce build.
    case '10':
    case 10:
      return "Configuration Google invalide pour ce build (DEVELOPER_ERROR / code 10) : le SHA-1 et/ou le nom de package de ce build ne sont probablement pas enregistrés sur le client OAuth Android dans Google Cloud Console.";
    default:
      break;
  }

  if (typeof e?.message === 'string' && e.message.length > 0) {
    return e?.code ? `[${e.code}] ${e.message}` : e.message;
  }

  try {
    return JSON.stringify(e);
  } catch {
    return 'Erreur inconnue.';
  }
}

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
  // Verrou explicite, en plus de isPending du useMutation ci-dessous : celui-ci
  // couvre AUSSI la phase avant l'appel au backend (hasPlayServices/signOut/
  // signIn), qui est justement la fenêtre pendant laquelle un double-tap
  // déclenchait l'erreur native IN_PROGRESS (12502).
  const [isSigningIn, setIsSigningIn] = useState(false);
  // "aud" réellement embarqué dans l'id_token renvoyé par Google pour CE
  // build précis. À comparer avec GOOGLE_WEB_CLIENT_ID (mobile) et
  // GOOGLE_WEB_CLIENT_ID côté backend Laravel : les 3 doivent être identiques.
  const [tokenAudience, setTokenAudience] = useState<string | null>(null);

  const {
    mutate: loginWithGoogle,
    isPending,
    data,
    error: loginError, // erreur de l'appel POST /auth/google/mobile (ex: 401 "Token non destiné à cette application")
  } = useMutation({
    mutationFn: googleAuthService.loginWithIdToken,
  });

  const promptAsync = async () => {
    // Rejoue-t-on un appel alors qu'un premier est encore en cours (double-tap,
    // ou tap pendant que le sélecteur de comptes natif met du temps à
    // s'afficher) ? On ignore silencieusement plutôt que de relancer
    // GoogleSignin.signIn() une seconde fois — c'est ça, concrètement, qui
    // provoquait l'erreur native "[12502] Sign-in in progress".
    if (isSigningIn) return;

    setIsSigningIn(true);
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
        setTokenAudience(decodeJwtPayload(idToken)?.aud ?? null);
        loginWithGoogle(idToken, {
          onError: (e) => console.error('[GoogleAuth] Échec appel /auth/google/mobile:', e),
        });
      } else {
        setPickerError(new Error('Aucun id_token retourné par Google'));
      }
    } catch (e: unknown) {
      // isErrorWithCode() : vérificateur recommandé par la librairie pour
      // fiabiliser l'accès à error.code (une comparaison directe e?.code
      // peut échouer silencieusement selon la forme exacte de l'erreur
      // native remontée par cette version du module).
      if (isErrorWithCode(e)) {
        // L'utilisateur a simplement annulé : ce n'est pas une erreur à afficher.
        if (e.code === statusCodes.SIGN_IN_CANCELLED) {
          return;
        }
        // Une tentative précédente est encore considérée "en cours" côté natif
        // (cas où une tentative antérieure n'a jamais résolu sa promesse, ou
        // survivant malgré le verrou isSigningIn ci-dessus).
        if (e.code === statusCodes.IN_PROGRESS) {
          setPickerError(new Error('Une connexion Google est déjà en cours, réessaie dans quelques secondes.'));
          return;
        }
      }
      setPickerError(e);
    } finally {
      setIsSigningIn(false);
    }
  };

  const isConfigured = GOOGLE_WEB_CLIENT_ID.length > 0;

  // Info de debug : à comparer avec le "GOOGLE_WEB_CLIENT_ID" du .env backend
  // et le client OAuth "Web" dans Google Cloud Console. Un "[401] Token non
  // destiné à cette application" vient presque toujours d'un de ces deux
  // identifiants qui ne correspond pas à `aud`.
  const debugInfo = tokenAudience
    ? `aud du token reçu: ${tokenAudience} — webClientId compilé dans cet APK: ${GOOGLE_WEB_CLIENT_ID || '(vide)'}`
    : null;

  return {
    promptAsync,
    isReady: isConfigured,
    // Exposé pour désactiver le bouton pendant TOUTE la séquence (pas
    // seulement l'appel backend final) — c'est ce qui manquait pour empêcher
    // le double-tap à la source.
    isPending: isSigningIn || isPending,
    data,
    // On expose désormais AUSSI l'erreur backend (loginError), qui avant
    // n'était jamais renvoyée : le picker Google réussissait, l'appel au
    // backend échouait, et personne n'était prévenu (ni toast, ni navigation).
    error: pickerError ?? loginError,
    debugInfo,
    isConfigured,
  };
}
