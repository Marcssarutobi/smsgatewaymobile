import { api } from './api';

export const googleAuthService = {
  loginWithIdToken: async (idToken: string) => {
    const { data } = await api.post('/auth/google/mobile', { id_token: idToken });
    return data;
  },
};