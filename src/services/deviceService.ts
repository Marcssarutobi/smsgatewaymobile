import { api } from './api';
import { deviceApi } from './deviceApi';

export const deviceService = {
  getMyDevice: async (deviceId: string) => {
    const { data } = await api.get(`/devices/${deviceId}`);
    return data;
  },
  heartbeat: async (payload: { battery_level?: number }) => {
    const { data } = await deviceApi.post('/device/heartbeat', payload);
    return data;
  },
};