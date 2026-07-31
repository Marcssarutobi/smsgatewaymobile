import axios from 'axios';
import { deviceStorage } from '../lib/deviceStorage';
import { API_BASE_URL } from '../lib/config';


export const deviceApi = axios.create({ baseURL: API_BASE_URL });

deviceApi.interceptors.request.use(async (config) => {
  const token = await deviceStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});