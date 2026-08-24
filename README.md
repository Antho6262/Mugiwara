# 🩸 THE ROOLIO FAMILY — Site du groupe

Site vierge basé sur la même architecture éprouvée de gestion de faction RP, prêt à être
configuré entièrement par le groupe (membres, grades, stock, actions, permissions…).
Seul **Tony Diaz — Fondateur** est créé par défaut, avec accès total.

---

## 1. Créer ta base Firebase (gratuite, ~3 min)

1. Va sur https://console.firebase.google.com → **Ajouter un projet** (ex: `roolio-family`).
2. Dans le projet → **Build → Realtime Database → Créer une base de données**.
   Démarre en mode test (règles ouvertes), tu les restreindras plus tard.
3. Dans **Paramètres du projet → Général → Vos applications → Web (`</>`)** :
   crée une appli, copie l'objet de config qui s'affiche.
4. Ouvre `js/firebase-config.js` et remplace le bloc `FIREBASE_CONFIG` par celui copié.

## 2. Initialiser le site

1. Ouvre `index.html` dans un navigateur (ou la page une fois déployée).
2. Clique sur **« Initialiser le site »** en bas → tu arrives sur `setup.html`.
3. Choisis le mot de passe de Tony Diaz (par défaut `tony2026`) puis lance l'initialisation.
4. Connecte-toi avec **Tony Diaz** depuis `index.html`.

## 3. Tout configurer depuis Admin

Une fois connecté en Fondateur, l'onglet **Admin** permet de tout créer :
- **Semaines** : créer/bloquer les semaines, générer le résumé.
- **Membres** : ajouter les membres du groupe, leur grade, leur quota.
- **Stock** : créer les catégories et produits (prix, stock, seuil d'alerte).
- **Actions** : créer les actions disponibles (montant $ sale/propre par unité,
  et la recette de stock consommée automatiquement — ex: 1 action = -2 unités d'un produit).
- **Grades** : créer la hiérarchie (le grade *Fondateur* est protégé).
- **Permissions** : cocher les pages accessibles par grade (le Fondateur a toujours tout).
- **Config** : taux de frais de blanchiment, webhook Discord pour le résumé de semaine.

Tant que rien n'est configuré dans Permissions, **seul le Fondateur** a accès aux pages —
c'est volontaire, pour éviter d'exposer des données avant que tout soit prêt.

---

## STACK TECHNIQUE
- Frontend : HTML/CSS/JS vanilla — GitHub Pages (statique)
- Base de données : Firebase Realtime Database (gratuit)
- Hébergement : GitHub Pages (gratuit)

## STRUCTURE DU SITE
```
roolio-family-site/
├── index.html          ← Page de connexion
├── setup.html          ← Initialisation Firebase (usage unique)
├── css/style.css        ← CSS global (thème noir / acier / or)
├── img/background.png   ← Blason de The Roolio Family (fond du site)
├── js/
│   ├── firebase-config.js  ← Config Firebase + session + permissions
│   └── app.js               ← Sidebar, nav (NAV_ITEMS), shell commun
└── pages/
    ├── dashboard.html
    ├── tracker.html
    ├── stats.html
    ├── stock.html
    ├── quotas.html
    ├── blanchiment.html
    ├── admin.html
    ├── profil.html
    ├── transactions.html
    └── taxes.html
```

## FIREBASE — STRUCTURE DES DONNÉES (vierge, tout se remplit depuis Admin)
```
membres/{id}        prenom, nom, grade, mot_de_passe, actif, role (admin/membre), quota
grades/{id}          nom, ordre
semaines/{id}        nom, bloquee, createdAt
actions_dispo/{id}   nom, montant_sale, montant_propre, recipe:[{catId,prodId,qty}]
actions/{semaineId}/{id}  membre_id, prenom_membre, nom_membre, grade_membre, action, action_id,
                           quantite, date, heure, resultat, raison_echec,
                           argent_sale, argent_propre, gains_totaux, createdAt
stock/{catId}        nom, emoji, produits/{id}: nom, prix, stock, seuil
argent/sale/{id}, argent/propre/{id}   date, description, type (Entrée/Sortie), montant, responsable
blanchiments/{id}    date, description, montant_sale, montant_propre, frais, responsable
sanctions/{id}       membre_id, prenom, nom, niveau, motif, par, date
journal_stock/{id}   date, membre, action, quantite, produit
objectifs_config/{id}: cible          objectifs_membres/{membreId}/{id}: cible
transactions/{id}    type(achat/vente), groupe, telephone, produit_id, produit_nom, catId,
                      quantite, prix, type_argent, notes, date
taxes/{id}           groupe, telephone, membre_id, prenom_membre, taxe_id, taxe_nom,
                      montant, type_argent, notes, date
types_taxes/{id}     nom
permissions/{grade}/{page}   true/false
config               blanchiment_taux, discord_webhook_semaine, nom_groupe
```

## PERMISSIONS
- Gérées depuis Admin → onglet Permissions.
- Le Fondateur (role = admin) a toujours accès à tout, même si rien n'est configuré.
- Suppression (tracker, transactions, taxes, sanctions) réservée aux membres `role = admin`.

## AJOUTER UNE NOUVELLE PAGE — CHECKLIST
1. Créer `pages/ma-page.html` (copier la structure d'une page existante : shell `initShell('ma-page', 'Titre')`).
2. `js/app.js` → ajouter dans `NAV_ITEMS` :
   ```js
   { page: 'ma-page', icon: '🔥', label: 'Ma Page', file: 'ma-page.html' }
   ```
3. `js/firebase-config.js` → ajouter `{ page: "ma-page", label: "Ma Page" }` dans `PAGES_DISPO`.
4. Configurer les accès dans Admin → Permissions.

## DÉPLOYER SUR GITHUB PAGES
```bash
cd chemin/vers/roolio-family-site
git init
git add .
git commit -m "Init The Roolio Family"
git branch -M main
git remote add origin https://github.com/TON_COMPTE/roolio-family-site.git
git push -u origin main
```
Puis dans GitHub → Settings → Pages → Source : branche `main`, dossier `/ (root)`.

## BUGS / POINTS D'ATTENTION (hérités du projet d'origine)
1. **Nouvelle page** → checklist ci-dessus obligatoire.
2. **`orderByChild` Firebase** nécessite un index dans les règles → trier en JS à la place (déjà fait partout ici).
3. **Règles Firebase** : en mode test elles expirent au bout de 30 jours — pense à les restreindre/renouveler dans la console.
4. **`snap.forEach`** ne retourne qu'un élément si index manquant → ce site utilise systématiquement `entries(snap.val())` (= `Object.entries(val||{})`).
5. **Emojis complexes** (ex: `⚖️`) dans la nav peuvent causer des bugs d'encodage → préférer des emojis simples.
