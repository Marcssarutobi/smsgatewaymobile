import axios from 'axios';
import { API_BASE_URL } from '../lib/config';

export interface VerifyTwoFactorPayload {
  tempToken: string;
  code: string;
}

export interface VerifyTwoFactorResponse {
  user: { id: number; name: string; email: string };
  token: string;
}

export const twoFactorService = {
  verify: async ({ tempToken, code }: VerifyTwoFactorPayload): Promise<VerifyTwoFactorResponse> => {
    // Requête isolée (pas l'instance `api` partagée) pour être certain que
    // le temp_token part bien en Authorization Bearer, sans interférence
    // avec un éventuel token utilisateur déjà stocké.
    const { data } = await axios.post(
      `${API_BASE_URL}/2fa/verify`,
      { code },
      { headers: { Authorization: `Bearer ${tempToken}` } }
    );
    return data;
  },
};