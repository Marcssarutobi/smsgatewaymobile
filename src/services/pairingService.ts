import { api } from './api';

export interface PairingPayload {
  pairing_token: string;
  device_name: string;
  android_device_id?: string;
  fcm_token?: string;
  sims: { slot_index: number; phone_number?: string; operator?: string }[];
}

export const pairingService = {
  pair: async (payload: PairingPayload) => {
    // Route publique, mais on garde `api` (token utilisateur) — pas besoin ici,
    // le pairing_token du QR suffit à identifier le compte côté backend
    const { data } = await api.post('/device/pair', payload);
    return data as { device_token: string; device: { id: number; name: string } };
  },
};