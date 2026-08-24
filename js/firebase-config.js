// ============================================================
// LES MUGIWARA — Config Firebase
// Remplace le bloc ci-dessous par celui de TON projet Firebase :
// Console Firebase → Paramètres du projet → Général → Tes applications → Web (</>)
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCRrO6RryLv7qPGlbV4JbnUsaHgVVTN6Js",
  authDomain: "nemezis-2aa1f.firebaseapp.com",
  databaseURL: "https://nemezis-2aa1f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "nemezis-2aa1f",
  storageBucket: "nemezis-2aa1f.firebasestorage.app",
  messagingSenderId: "830745761363",
  appId: "1:830745761363:web:44b5af8162f8940f0a98a6"
};

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();

// Grades fixes de l'équipage (créés automatiquement à l'initialisation)
const GRADES_DEFAUT = [
  { id: 'fondateur', nom: 'Fondateur',  emoji: '🧭', ordre: 0 },
  { id: 'lead',      nom: 'Lead',       emoji: '👑', ordre: 1 },
  { id: 'colead',    nom: 'Co Lead',    emoji: '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNiAzNiIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2Ij4KICA8cmVjdCB4PSIxIiB5PSIxIiB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIHJ4PSI3IiBmaWxsPSIjMWExYTFhIi8+CiAgPGcgZmlsbD0iI2ZmZmZmZiI+CiAgICA8cGF0aCBkPSJNMTggNi41Yy00LjcgMC04LjMgMy40LTguMyA3LjggMCAyLjYgMS4zIDQuNiAzLjEgNnYyLjZjMCAuNi41IDEuMSAxLjEgMS4xaDEuMXYyLjFjMCAuNS40LjkuOS45aC42di0zaDF2M2gxdi0zaDF2M2guNmMuNSAwIC45LS40LjktLjl2LTIuMWgxLjFjLjYgMCAxLjEtLjUgMS4xLTEuMXYtMi42YzEuOC0xLjQgMy4xLTMuNCAzLjEtNiAwLTQuNC0zLjYtNy44LTguMy03Ljh6Ii8+CiAgICA8ZWxsaXBzZSBjeD0iMTQuMyIgY3k9IjE0LjYiIHJ4PSIxLjkiIHJ5PSIyLjMiIGZpbGw9IiMxYTFhMWEiLz4KICAgIDxlbGxpcHNlIGN4PSIyMS43IiBjeT0iMTQuNiIgcng9IjEuOSIgcnk9IjIuMyIgZmlsbD0iIzFhMWExYSIvPgogICAgPHBhdGggZD0iTTE1LjcgMTkuM2g0LjZsLS45IDEuN2gtMi44eiIgZmlsbD0iIzFhMWExYSIvPgogIDwvZz4KICA8ZyBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMi4xIiBzdHJva2UtbGluZWNhcD0icm91bmQiPgogICAgPGxpbmUgeDE9IjYiIHkxPSIyNCIgeDI9IjMwIiB5Mj0iMzEuNSIvPgogICAgPGxpbmUgeDE9IjMwIiB5MT0iMjQiIHgyPSI2IiB5Mj0iMzEuNSIvPgogIDwvZz4KPC9zdmc+Cg==" alt="Co Lead" style="width:1.15em;height:1.15em;vertical-align:-0.25em;border-radius:3px;">', ordre: 2 },
  { id: 'brasdroit', nom: 'Bras Droit', emoji: '⚔️', ordre: 3 },
  { id: 'amiral',    nom: 'Amiral',     emoji: '⚓', ordre: 4 },
  { id: 'sergent',   nom: 'Sergent',    emoji: '🎖️', ordre: 5 },
  { id: 'membre',    nom: 'Membre',     emoji: '🗡️', ordre: 6 },
  { id: 'recrue',    nom: 'Recrue',     emoji: '👒', ordre: 7 },
];

function gradeInfo(id) {
  return GRADES_DEFAUT.find(g => g.id === id) || GRADES_DEFAUT[GRADES_DEFAUT.length - 1];
}

// ---- Session (stockée dans l'onglet du navigateur) ----
function getSession() {
  try { return JSON.parse(sessionStorage.getItem('mugiwara_session') || 'null'); }
  catch (e) { return null; }
}
function setSession(membre) {
  sessionStorage.setItem('mugiwara_session', JSON.stringify(membre));
}
function clearSession() {
  sessionStorage.removeItem('mugiwara_session');
}
function requireSession() {
  const s = getSession();
  if (!s) {
    const inPages = window.location.pathname.includes('/pages/');
    window.location.href = inPages ? '../index.html' : 'index.html';
    return null;
  }
  return s;
}
function isAdmin(membre) {
  return !!(membre && membre.role === 'admin');
}

// ---- Utilitaire : Object -> [[id, val], ...] (jamais orderByChild) ----
function entries(obj) {
  return Object.entries(obj || {});
}

function fmtMoney(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('fr-FR');
}

function fmtDateHeure(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
