# Générer le fichier .apk

Ce fichier ne peut pas être compilé automatiquement (ça demande le SDK Android, une signature par certificat, et un compte EAS avec tes identifiants) — voici la marche à suivre, à faire toi-même une fois prêt.

## ⚠️ Avant de commencer

**Ton backend et ton frontend doivent déjà être hébergés en ligne** (pas en `localhost`). L'app mobile doit pointer vers une vraie URL publique (ex: `https://api.tondomaine.com`), sinon elle ne pourra appeler l'API depuis aucun autre appareil que ta machine de développement.

Vérifie/mets à jour l'URL de l'API dans le code mobile (`src/lib/config.ts` ou équivalent, variable `API_BASE_URL`) avant de lancer le build — un changement après coup demande de refaire un nouveau build.

## Étapes

### 1. Installer l'outil EAS CLI (une seule fois)
```bash
npm install -g eas-cli
```

### 2. Se connecter à ton compte Expo
```bash
eas login
```
(Crée un compte gratuit sur https://expo.dev si tu n'en as pas encore.)

### 3. Lancer le build APK
Le profil `preview` (déjà configuré dans `eas.json`) génère un `.apk` installable directement, sans passer par le Play Store :
```bash
eas build --platform android --profile preview
```
Ça se passe sur les serveurs de build d'Expo (pas sur ta machine), compte 10 à 20 minutes en général. La première fois, EAS te proposera de générer automatiquement un certificat de signature Android — accepte, il sera géré pour toi et réutilisé pour les prochains builds.

### 4. Télécharger le fichier
Une fois le build terminé, un lien de téléchargement s'affiche dans le terminal, et est aussi visible sur https://expo.dev (ton projet > Builds). Télécharge le fichier `.apk`.

### 5. Déposer le fichier dans le frontend
Renomme le fichier téléchargé en `sms-gateway.apk`, et dépose-le à cet emplacement exact dans le projet **frontend** (`smsgatewapfront`) :
```
public/downloads/sms-gateway.apk
```
La page `/download-app` du site (déjà construite) détecte automatiquement sa présence et active le bouton de téléchargement — aucune configuration supplémentaire nécessaire.

## Pour la suite (Google Play)

Quand tu seras prêt à publier sur le Play Store, le profil `production` dans `eas.json` génère un `.aab` (format requis par le Store, différent de l'APK) :
```bash
eas build --platform android --profile production
```
Il te faudra en plus un compte Google Play Console (25$ à vie), et suivre leur processus de validation (peut prendre plusieurs jours pour une première publication).
