import axios from 'axios';
import { deviceStorage } from '../lib/deviceStorage';

const API_BASE_URL = 'http://192.168.100.17:8000/api';

export const deviceApi = axios.create({ baseURL: API_BASE_URL });

deviceApi.interceptors.request.use(async (config) => {
  const token = await deviceStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});