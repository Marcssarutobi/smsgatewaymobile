import axios from 'axios';
import { tokenStorage } from '../lib/tokenStorage';

// À adapter : IP de ta machine sur le réseau local (pas "localhost",
// ton téléphone ne peut pas résoudre "localhost" comme ton PC)
const API_BASE_URL = 'http://192.168.100.17:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});