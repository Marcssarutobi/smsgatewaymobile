import axios from 'axios';
import { tokenStorage } from '../lib/tokenStorage';
import { API_BASE_URL } from '../lib/config';



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