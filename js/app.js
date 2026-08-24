/* ============================================================
   THE ROOLIO FAMILY — app.js
   Sidebar / topbar communs + items de navigation.
   ============================================================ */

const NAV_ITEMS = [
  { page: "dashboard",    icon: "🏠", label: "Dashboard",    file: "dashboard.html" },
  { page: "tracker",      icon: "📋", label: "Tracker",      file: "tracker.html" },
  { page: "stock",        icon: "📦", label: "Stock",        file: "stock.html" },
  { page: "transactions", icon: "🔁", label: "Transactions", file: "transactions.html" },
  { page: "labo",         icon: "🧪", label: "Labo",         file: "labo.html" },
  { page: "stats",        icon: "📊", label: "Stats",        file: "stats.html" },
  { page: "quotas",       icon: "🎯", label: "Quotas",       file: "quotas.html" },
  { page: "blanchiment",  icon: "💵", label: "Blanchiment",  file: "blanchiment.html" },
  { page: "paye",         icon: "💰", label: "Paye",         file: "paye.html" },
  { page: "taxes",        icon: "🧾", label: "Taxes",        file: "taxes.html" },
  { page: "admin",        icon: "⚙️", label: "Admin",        file: "admin.html" },
  { page: "profil",       icon: "👤", label: "Profil",       file: "profil.html" }
];

/* Les 5 premières pages restent toujours visibles dans la sidebar ;
   tout le reste est regroupé dans un sous-menu repliable "Plus". */
const NAV_PRIMARY_COUNT = 5;

/* Ouvre/ferme le sous-menu "Plus" dans la sidebar. */
function toggleNavSubmenu(toggleEl) {
  const submenu = toggleEl.nextElementSibling;
  const chevron = toggleEl.querySelector(".nav-chevron");
  const ouvert = submenu.style.display !== "none";
  submenu.style.display = ouvert ? "none" : "block";
  chevron.textContent = ouvert ? "▸" : "▾";
}

/* Construit le shell (sidebar + topbar) dans #shell, protège la page,
   et renvoie la session du membre connecté (ou redirige vers /index.html). */
async function initShell(activePage, pageTitle) {
  const session = requireSession();
  if (!session) return null;

  let allowed;
  try {
    allowed = await canAccess(session, activePage);
  } catch (e) {
    allowed = false;
  }
  if (!allowed) {
    document.body.innerHTML =
      '<div class="login-wrap"><div class="login-card"><div class="login-brand">ACCÈS REFUSÉ</div>' +
      '<p class="muted" style="text-align:center;margin-top:10px;">Ton compte est désactivé ou n\'a pas accès à cette page.</p>' +
      '<a href="' + pathToRoot() + 'index.html" class="btn btn-primary" style="margin-top:16px;display:block;text-align:center;" onclick="clearSession()">Retour à la connexion</a></div></div>';
    return null;
  }

  const root = pathToRoot();
  const primaryItems = NAV_ITEMS.slice(0, NAV_PRIMARY_COUNT);
  const restItems = NAV_ITEMS.slice(NAV_PRIMARY_COUNT);

  let navHtml = "";
  for (const item of primaryItems) {
    const ok = await canAccess(session, item.page);
    if (!ok) continue;
    const active = item.page === activePage ? " active" : "";
    navHtml += `<a class="nav-item${active}" href="${root}pages/${item.file}">
        <span class="ic">${item.icon}</span><span class="lbl">${item.label}</span>
      </a>`;
  }

  let restHtml = "";
  let restContainsActive = false;
  for (const item of restItems) {
    const ok = await canAccess(session, item.page);
    if (!ok) continue;
    const active = item.page === activePage ? " active" : "";
    if (active) restContainsActive = true;
    restHtml += `<a class="nav-item${active}" href="${root}pages/${item.file}">
        <span class="ic">${item.icon}</span><span class="lbl">${item.label}</span>
      </a>`;
  }

  if (restHtml) {
    navHtml += `
      <div class="nav-item nav-toggle" onclick="toggleNavSubmenu(this)">
        <span class="ic">☰</span><span class="lbl">Plus</span><span class="nav-chevron">${restContainsActive ? "▾" : "▸"}</span>
      </div>
      <div class="nav-submenu" style="display:${restContainsActive ? "block" : "none"};">${restHtml}</div>
    `;
  }

  const shellHtml = `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-head">
          <img src="${root}img/logo.png" alt="The Roolio Family" class="sidebar-coin">
          <div class="sidebar-logo"><span class="full">THE ROOLIO FAMILY</span></div>
        </div>
        <nav class="nav">${navHtml}</nav>
        <div class="sidebar-foot">
          <div class="who"><b>${session.prenom} ${session.nom || ""}</b><span class="grade">${session.grade || ""}</span></div>
          <div id="rtStatus" class="small muted" style="margin:6px 0;">🔄 Connexion…</div>
          <span class="logout-link" onclick="logout()">Se déconnecter</span>
        </div>
      </aside>
      <div class="main">
        <div class="topbar">
          <div class="topbar-title">${pageTitle || ""}</div>
          <div class="topbar-brand"><span class="coin">🪙</span> THE ROOLIO FAMILY</div>
        </div>
        <main class="content fade-in" id="content"></main>
      </div>
    </div>
  `;
  document.getElementById("shell").outerHTML = shellHtml;

  // Indicateur temps réel : reflète l'état réel de la connexion Firebase
  // (se met à jour tout seul si la connexion tombe ou revient).
  db.ref(".info/connected").on("value", snap => {
    const el = document.getElementById("rtStatus");
    if (!el) return;
    el.textContent = snap.val() === true ? "🟢 Temps réel actif" : "🔴 Connexion perdue…";
  });

  return session;
}
