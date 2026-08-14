// EXPO_PUBLIC_* est inliné au build par Expo (SDK 49+), à définir dans un fichier
// .env à la racine (voir .env.example) — jamais commité avec de vraies valeurs.
// Repli sur une IP locale de dev si la variable n'est pas définie.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.100.7:8000/api';

// ID client OAuth "Web" créé dans la Google Cloud Console (Identifiants > ID client OAuth
// > Application Web). C'est bien le client WEB qu'il faut utiliser ici, même pour l'app
// mobile : c'est lui qui signe le id_token vérifié ensuite par le backend
// (voir GOOGLE_WEB_CLIENT_ID dans le .env du backend, qui doit correspondre à cette même valeur).
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';