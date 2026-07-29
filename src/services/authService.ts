import { api } from './api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: { id: number; name: string; email: string };
  token: string;
}

export interface TwoFactorPendingResponse {
  requires_2fa: true;
  temp_token: string;
}

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthResponse | TwoFactorPendingResponse> => {
    const { data } = await api.post('/auth/login', payload);
    return data;
  },
};

export function isTwoFactorPending(
  data: AuthResponse | TwoFactorPendingResponse
): data is TwoFactorPendingResponse {
  return (data as TwoFactorPendingResponse).requires_2fa === true;
}