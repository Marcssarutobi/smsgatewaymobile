import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useMutation } from '@tanstack/react-query';
import { googleAuthService } from '../services/googleAuthService';

WebBrowser.maybeCompleteAuthSession();

// ⚠️ Remplace par ton VRAI Web Client ID (le même que GOOGLE_CLIENT_ID côté Laravel)
const GOOGLE_WEB_CLIENT_ID = '642132289453-ch097s1ah6lh9v1srfvovrsu5shemttv.apps.googleusercontent.com';

export function useGoogleAuth() {
  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true } as any);

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

  return { promptAsync, isReady: !!request, isPending, data, error };
}