// EXPO_PUBLIC_* est inliné au build par Expo (SDK 49+), à définir dans un fichier
// .env à la racine (voir .env.example) — jamais commité avec de vraies valeurs.
// Repli sur une IP locale de dev si la variable n'est pas définie.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.100.7:8000/api';