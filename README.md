# 👒 Les Mugiwara — Site

## 1. Brancher ton ancien projet Firebase
1. Console Firebase → ton projet → **Build → Realtime Database** (crée-la si pas déjà fait, mode test).
2. **Paramètres du projet → Général → Tes applications → Web (`</>`)** : récupère l'objet de config.
3. Ouvre `js/firebase-config.js`, remplace le bloc `FIREBASE_CONFIG` par le tien.

## 2. Règles Realtime Database
Dans **Realtime Database → Règles**, remplace par :
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
(à restreindre plus tard si besoin — mode ouvert pour démarrer, comme le reste de tes projets.)

## 3. Initialiser
1. Ouvre `index.html` dans un navigateur (ou héberge le dossier).
2. Clique **« Initialiser le site »** → crée ton compte (grade Lead, accès admin).
3. Connecte-toi.

## 4. Configurer depuis Admin
- Taux : % par action, $ par go fast, $ par pochon.
- Équipage : ajouter les membres, leur grade, les passer admin si besoin.

## Déployer (GitHub Pages, gratuit)
```bash
cd mugiwara-site
git init
git add .
git commit -m "Init Mugiwara"
git branch -M main
git remote add origin https://github.com/TON_COMPTE/mugiwara-site.git
git push -u origin main
```
Puis GitHub → Settings → Pages → Source : branche `main`, dossier `/ (root)`.

## Structure
```
index.html        ← connexion
setup.html         ← création du 1er compte (une seule fois)
css/style.css       ← thème
js/firebase-config.js  ← config Firebase + session
js/app.js               ← sidebar / navigation
pages/
  dashboard.html   ← totaux + classement
  tracker.html     ← Action / Go Fast / Vente
  admin.html       ← taux + équipage
  profil.html      ← mes gains + mot de passe
```
