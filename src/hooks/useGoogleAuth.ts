import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useMutation } from '@tanstack/react-query';
import { googleAuthService } from '../services/googleAuthService';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '642132289453-ap6hq7v1bsk0dssmd5jmpvnr5vl5h3ug.apps.googleusercontent.com',
    iosClientId: '642132289453-ch097s1ah6lh9v1srfvovrsu5shemttv.apps.googleusercontent.com',
    webClientId: '642132289453-ch097s1ah6lh9v1srfvovrsu5shemttv.apps.googleusercontent.com', // le même que côté Laravel
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