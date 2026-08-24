// EXPO_PUBLIC_* est inliné au build par Expo (SDK 49+), à définir dans un fichier
// .env à la racine (voir .env.example) — jamais commité avec de vraies valeurs.
// Repli sur une IP locale de dev si la variable n'est pas définie.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://sms-gateway-saas.onebioafrica.com/api';

// ID client OAuth "Web" créé dans la Google Cloud Console (Identifiants > ID client OAuth
// > Application Web). C'est bien le client WEB qu'il faut utiliser ici, même pour l'app
// mobile : c'est lui qui signe le id_token vérifié ensuite par le backend
// (voir GOOGLE_WEB_CLIENT_ID dans le .env du backend, qui doit correspondre à cette même valeur).
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

// ID client OAuth "Android" créé dans la Google Cloud Console (Identifiants > ID client OAuth
// > Application Android), lié au package "com.tonentreprise.smsgatewaymobile" et à l'empreinte
// SHA-1 du build (voir `eas credentials` pour la récupérer). Avec le SDK natif
// (@react-native-google-signin/google-signin), cette valeur n'est plus passée explicitement en
// code : Google la retrouve côté serveur via le SHA-1 enregistré sur ce client Android. On la
// garde disponible ici si besoin (debug, vérifications manuelles).
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';