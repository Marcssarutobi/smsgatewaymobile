import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useMutation } from '@tanstack/react-query';
import { googleAuthService } from '../services/googleAuthService';
import { GOOGLE_WEB_CLIENT_ID } from '../lib/config';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  // `useProxy` a été retiré d'expo-auth-session (le service de proxy Expo
  // n'existe plus) : le retour OAuth se fait maintenant via le scheme natif
  // de l'app ("smsgatewaymobile://", défini dans app.json), ce qui nécessite
  // un dev build ou un build EAS — ça ne fonctionnera pas dans Expo Go.
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'smsgatewaymobile' });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  const { mutate: loginWithGoogle, isPending, data, error } = useMutation({
    mutationFn: googleAuthService.loginWithIdToken,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      loginWithGoogle(id_token);
    }
  }, [response]);

  const isConfigured = GOOGLE_WEB_CLIENT_ID.length > 0;

  return { promptAsync, isReady: isConfigured && !!request, isPending, data, error, isConfigured };
}
