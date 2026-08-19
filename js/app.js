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

  return membre;
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

// Calcule le solde d'argent sale / propre depuis toutes les sources Firebase
async function computeSoldes() {
  const [aSnap, gSnap, vSnap, cSnap, argSaleSnap, argPropreSnap, blanchSnap, payeSnap] = await Promise.all([
    db.ref('actions').get(),
    db.ref('cambriolages').get(),
    db.ref('ventes').get(),
    db.ref('config').get(),
    db.ref('argent_sale').get(),
    db.ref('argent_propre').get(),
    db.ref('blanchiments').get(),
    db.ref('payes').get(),
  ]);
  const cfg = Object.assign({ taux_action_pct: 25, taux_cambriolage: 700, taux_pochon: 25 }, cSnap.val() || {});

  let solde_sale = 0, solde_propre = 0;
  const parMembre = {}; // gains bruts par membre (avant paye)

  entries(aSnap.val()).forEach(([id, a]) => {
    const gain = (a.montant || 0) * (cfg.taux_action_pct / 100);
    solde_sale += gain;
    parMembre[a.membre_id] = (parMembre[a.membre_id] || 0) + gain;
  });
  entries(gSnap.val()).forEach(([id, g]) => {
    const gain = (g.count || 0) * cfg.taux_cambriolage;
    solde_sale += gain;
    parMembre[g.membre_id] = (parMembre[g.membre_id] || 0) + gain;
  });
  entries(vSnap.val()).forEach(([id, v]) => {
    const gain = (v.qty || 0) * cfg.taux_pochon;
    solde_sale += gain;
    parMembre[v.membre_id] = (parMembre[v.membre_id] || 0) + gain;
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
