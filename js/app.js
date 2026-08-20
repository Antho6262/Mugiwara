// ============================================================
// LES MUGIWARA — Shell commun (sidebar + topbar)
// ============================================================
const NAV_ITEMS = [
  { page: 'dashboard',    icon: '🗺️', label: 'Dashboard',    file: 'dashboard.html' },
  { page: 'tracker',      icon: '🏴‍☠️', label: 'Tracker',      file: 'tracker.html' },
  { page: 'stock',        icon: '📦', label: 'Stock',        file: 'stock.html' },
  { page: 'transactions', icon: '🧾', label: 'Transactions', file: 'transactions.html' },
  { page: 'blanchiment',  icon: '🌊', label: 'Blanchiment',  file: 'blanchiment.html' },
  { page: 'stats',        icon: '🧭', label: 'Stats & Quotas', file: 'stats.html' },
  { page: 'paye',         icon: '💰', label: 'Paye',         file: 'paye.html' },
  { page: 'taxes',        icon: '⚖️', label: 'Taxes',        file: 'taxes.html' },
  { page: 'admin',        icon: '⚙️', label: 'Admin',        file: 'admin.html', adminOnly: true },
  { page: 'profil',       icon: '👤', label: 'Profil',       file: 'profil.html' },
];

function initShell(pageKey, title) {
  const membre = requireSession();
  if (!membre) return null;

  if (pageKey === 'admin' && !isAdmin(membre)) {
    window.location.href = 'dashboard.html';
    return null;
  }

  const g = gradeInfo(membre.grade);

  const navHtml = NAV_ITEMS
    .filter(item => !item.adminOnly || isAdmin(membre))
    .map(item => `
      <a href="${item.file}" class="${item.page === pageKey ? 'active' : ''}">
        <span class="ic">${item.icon}</span> ${item.label}
      </a>`)
    .join('');

  document.getElementById('sidebar').innerHTML = `
    <div class="brand">
      <img src="../img/logo.png" alt="Les Mugiwara" class="brand-logo">
      <h1>MUGIWARA</h1>
      <div class="tag">L'ÉQUIPAGE</div>
    </div>
    <div class="navlist">${navHtml}</div>
    <div class="who">
      <b>${membre.prenom}</b>
      <span class="grade">${g.emoji} ${g.nom.toUpperCase()}</span>
    </div>
    <button class="ghost logout" id="btn-logout">Se déconnecter</button>
  `;

  document.getElementById('btn-logout').addEventListener('click', () => {
    clearSession();
    window.location.href = '../index.html';
  });

  if (document.getElementById('pagehead-title')) {
    document.getElementById('pagehead-title').textContent = title;
  }

  ensureActiveWeek().catch(err => console.error('ensureActiveWeek', err));
  applyPermissions(membre, pageKey).catch(err => console.error('applyPermissions', err));

  return membre;
}

// ------------------------------------------------------------
// Permissions par grade — masque les liens interdits dans la sidebar
// et redirige si la page courante est interdite. Par défaut (rien
// configuré dans Admin → Permissions) tout reste visible pour tout
// le monde : aucun risque de se retrouver bloqué hors config.
// ------------------------------------------------------------
async function applyPermissions(membre, pageKey) {
  if (isAdmin(membre)) return; // fondateur / admin : toujours tout
  if (pageKey === 'dashboard' || pageKey === 'profil' || pageKey === 'admin') return; // toujours visibles / déjà gérées

  const snap = await db.ref('permissions/' + membre.grade).get();
  const perms = snap.val() || {};

  NAV_ITEMS.forEach(item => {
    if (item.page === 'dashboard' || item.page === 'profil' || item.adminOnly) return;
    if (perms[item.page] === false) {
      const a = document.querySelector(`.navlist a[href="${item.file}"]`);
      if (a) a.remove();
    }
  });

  if (perms[pageKey] === false) {
    window.location.href = 'dashboard.html';
  }
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// peut payer / valider un blanchiment : fondateur, admin, ou grade Lead → Sergent (ordre <= 5)
function canManage(membre) {
  return isAdmin(membre) || gradeInfo(membre.grade).ordre <= 5;
}

function startOfWeekISO() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // lundi = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.toISOString();
}

// ------------------------------------------------------------
// Semaines — création / clôture automatique, sans bot.
// Appelée à chaque chargement de page (initShell) : idempotente,
// utilise une transaction Firebase pour éviter les doublons si
// plusieurs personnes se connectent au même moment.
// ------------------------------------------------------------
async function ensureActiveWeek() {
  const now = new Date();
  const mondayISO = startOfWeekISO();
  const monday = new Date(mondayISO);
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const finISO = nextMonday.toISOString();
  const nowISO = now.toISOString();

  // Semaine active déclarée dans la config
  const activeIdSnap = await db.ref('config/semaine_active_id').get();
  const activeId = activeIdSnap.val();

  if (activeId) {
    const wSnap = await db.ref('semaines/' + activeId).get();
    const w = wSnap.val();
    if (w && !w.bloquee && w.fin > nowISO) {
      return activeId; // semaine en cours toujours valide, rien à faire
    }
    if (w && !w.bloquee) {
      // semaine expirée naturellement → on la clôture
      await db.ref('semaines/' + activeId).update({ bloquee: true, closedAt: nowISO });
    }
  }

  // Cherche si une semaine correspondant à "cette semaine" existe déjà (évite les doublons)
  const allSnap = await db.ref('semaines').get();
  const all = entries(allSnap.val());
  const existing = all.find(([id, w]) => w.debut === mondayISO);

  let newId;
  if (existing) {
    newId = existing[0];
  } else {
    newId = uid();
    await db.ref('semaines/' + newId).set({
      nom: 'Semaine du ' + monday.toLocaleDateString('fr-FR'),
      debut: mondayISO,
      fin: finISO,
      bloquee: false,
      createdAt: nowISO
    });
  }

  // Transaction : ne remplace la semaine active que si elle n'a pas déjà été mise à jour entre-temps
  await db.ref('config/semaine_active_id').transaction(current => {
    if (current === activeId) return newId;
    return current; // quelqu'un d'autre a déjà mis à jour, on ne touche à rien
  });

  const finalSnap = await db.ref('config/semaine_active_id').get();
  return finalSnap.val() || newId;
}

// Calcule le solde d'argent sale / propre depuis toutes les sources Firebase
async function computeSoldes() {
  const [aSnap, gSnap, vSnap, lSnap, cSnap, argSaleSnap, argPropreSnap, blanchSnap, payeSnap] = await Promise.all([
    db.ref('actions').get(),
    db.ref('cambriolages').get(),
    db.ref('ventes').get(),
    db.ref('labos').get(),
    db.ref('config').get(),
    db.ref('argent_sale').get(),
    db.ref('argent_propre').get(),
    db.ref('blanchiments').get(),
    db.ref('payes').get(),
  ]);
  const cfg = Object.assign({ taux_action_pct: 25, taux_cambriolage: 25, taux_pochon: 25, taux_branche: 25 }, cSnap.val() || {});

  let solde_sale = 0, solde_propre = 0;
  const parMembre = {}; // part due (commission) par membre, avant paye

  entries(aSnap.val()).filter(([id, a]) => a.resultat !== 'Échec').forEach(([id, a]) => {
    const montant = a.montant || 0;
    solde_sale += montant; // le montant total va au groupe
    const part = montant * (cfg.taux_action_pct / 100);
    parMembre[a.membre_id] = (parMembre[a.membre_id] || 0) + part;
  });
  entries(gSnap.val()).filter(([id, g]) => g.resultat !== 'Échec').forEach(([id, g]) => {
    const montant = g.montant || 0;
    solde_sale += montant;
    const part = montant * (cfg.taux_cambriolage / 100);
    parMembre[g.membre_id] = (parMembre[g.membre_id] || 0) + part;
  });
  entries(vSnap.val()).filter(([id, v]) => v.resultat !== 'Échec').forEach(([id, v]) => {
    const montant = v.montant || 0;
    solde_sale += montant;
    const part = montant * (cfg.taux_pochon / 100);
    parMembre[v.membre_id] = (parMembre[v.membre_id] || 0) + part;
  });
  entries(lSnap.val()).filter(([id, l]) => l.resultat !== 'Échec').forEach(([id, l]) => {
    const montant = l.montant || 0;
    solde_sale += montant;
    const part = montant * ((cfg.taux_branche || 0) / 100);
    parMembre[l.membre_id] = (parMembre[l.membre_id] || 0) + part;
  });

  entries(argSaleSnap.val()).forEach(([id, m]) => {
    solde_sale += m.type === 'Sortie' ? -(m.montant || 0) : (m.montant || 0);
  });
  entries(argPropreSnap.val()).forEach(([id, m]) => {
    solde_propre += m.type === 'Sortie' ? -(m.montant || 0) : (m.montant || 0);
  });

  const blanchiments = entries(blanchSnap.val());
  blanchiments.forEach(([id, b]) => {
    solde_sale -= (b.montant_sale || 0);
    solde_propre += (b.montant_propre || 0);
  });

  const payes = entries(payeSnap.val());
  const payeParMembre = {};
  payes.forEach(([id, p]) => {
    solde_sale -= (p.montant || 0);
    payeParMembre[p.membre_id] = (payeParMembre[p.membre_id] || 0) + (p.montant || 0);
  });

  const aPayerParMembre = {};
  Object.keys(parMembre).forEach(mid => {
    aPayerParMembre[mid] = Math.max(0, (parMembre[mid] || 0) - (payeParMembre[mid] || 0));
  });

  return { solde_sale, solde_propre, gainsParMembre: parMembre, payeParMembre, aPayerParMembre };
}
