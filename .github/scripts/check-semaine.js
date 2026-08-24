// Robot The Roolio Family — tourne toutes les 10 minutes via GitHub Actions.
//
// 1) Si aucune semaine active n'existe (filet de sécurité), en crée une.
// 2) Le dimanche entre 19h00 et 19h09 (heure de Paris, DST géré automatiquement) :
//    - verrouille la semaine active en cours (bloquee:true, closedAt, resume)
//    - envoie le résumé sur Discord (si un webhook est configuré dans Admin → Config)
//    - ouvre immédiatement la semaine suivante (7 jours)
//
// Tout est fait via une transaction atomique sur "semaines" pour ne jamais
// entrer en collision avec un membre qui agirait en même temps depuis Admin.

const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = admin.database();

function formatDateFR(d) {
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
}

function nomSemaine(debut) {
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 6);
  return `${formatDateFR(debut)} - ${formatDateFR(fin)}`;
}

// Heure de Paris fiable (gère automatiquement CET/CEST)
function parisNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: weekdayMap[get("weekday")],
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString("fr-FR") + " $";
}

async function construireResume(weekId, nom) {
  const snap = await db.ref("actions/" + weekId).once("value");
  const actions = Object.values(snap.val() || {});
  const gainsSale = actions.reduce((acc, a) => acc + Number(a.argent_sale || 0), 0);
  const gainsPropre = actions.reduce((acc, a) => acc + Number(a.argent_propre || 0), 0);
  const reussites = actions.filter((a) => a.resultat === "Réussite").length;
  const echecs = actions.filter((a) => a.resultat === "Échec").length;

  const parMembre = {};
  actions.forEach((a) => { parMembre[a.prenom_membre] = (parMembre[a.prenom_membre] || 0) + 1; });
  const classement = Object.entries(parMembre)
    .sort((a, b) => b[1] - a[1])
    .map(([p, n], i) => `${i + 1}. ${p} — ${n} action(s)`)
    .join("\n");

  const texte =
    `📋 RÉSUMÉ — ${nom} — The Roolio Family\n` +
    `Actions : ${actions.length} (✅ ${reussites} / ❌ ${echecs})\n` +
    `Gains sale : ${formatMoney(gainsSale)}\n` +
    `Gains propre : ${formatMoney(gainsPropre)}\n\n` +
    `Classement :\n${classement || "—"}`;

  return { texte, gainsSale, gainsPropre, reussites, echecs, nbActions: actions.length, classement };
}

async function envoyerWebhook(webhook, resume, nom) {
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: `📋 RÉSUMÉ — ${nom}`,
            color: 0x6b7280,
            fields: [
              { name: "Actions", value: `${resume.nbActions} (✅ ${resume.reussites} / ❌ ${resume.echecs})`, inline: true },
              { name: "Gains sale", value: formatMoney(resume.gainsSale), inline: true },
              { name: "Gains propre", value: formatMoney(resume.gainsPropre), inline: true },
              { name: "Classement", value: resume.classement || "—" },
            ],
          },
        ],
      }),
    });
    console.log("Résumé envoyé sur Discord.");
  } catch (e) {
    console.error("Échec de l'envoi du webhook Discord :", e.message);
  }
}

async function main() {
  const paris = parisNow();
  const shouldCloseSchedule = paris.day === 0 && paris.hour === 19 && paris.minute < 10;

  // DIAGNOSTIC : montre exactement ce que le robot voit avant toute action.
  const diagSnap = await db.ref("semaines").once("value");
  const diagVal = diagSnap.val();
  console.log("🔍 Diagnostic — projectId utilisé :", serviceAccount.project_id);
  console.log("🔍 Diagnostic — databaseURL utilisée :", process.env.FIREBASE_DB_URL);
  console.log("🔍 Diagnostic — contenu actuel de /semaines :", JSON.stringify(diagVal));

  const semainesRef = db.ref("semaines");
  let action = null; // "created" | "closed_and_created" | null

  const result = await semainesRef.transaction((current) => {
    action = null; // reset à CHAQUE tentative — une transaction peut réessayer plusieurs fois
    const semaines = current || {};
    const list = Object.entries(semaines).map(([id, s]) => ({ id, ...s }));
    const active = list.find((s) => s.bloquee !== true);

    // Cas 1 : aucune semaine active du tout → filet de sécurité, on en crée une.
    if (!active) {
      const id = semainesRef.push().key;
      const nom = nomSemaine(new Date());
      action = { type: "created", id, nom };
      return { ...semaines, [id]: { nom, bloquee: false, createdAt: Date.now() } };
    }

    // Cas 2 : dimanche 19h (Paris) → on ferme l'active et on ouvre la suivante.
    if (shouldCloseSchedule) {
      const newId = semainesRef.push().key;
      const nomSuivante = nomSemaine(new Date());
      action = { type: "closed_and_created", closedId: active.id, closedNom: active.nom, newId, newNom: nomSuivante };
      return {
        ...semaines,
        [active.id]: { ...active, bloquee: true, closedAt: Date.now() },
        [newId]: { nom: nomSuivante, bloquee: false, createdAt: Date.now() },
      };
    }

    // Cas 3 : rien à faire.
    return current;
  });

  if (!result.committed) {
    console.log("Transaction non validée (collision détectée) — nouvel essai au prochain cycle.");
    return;
  }

  if (!action) {
    console.log("Rien à faire — semaine active en cours, hors créneau de clôture.");
    return;
  }

  if (action.type === "created") {
    console.log("✅ Semaine créée automatiquement (filet de sécurité) :", action.nom);
    const verifSnap = await db.ref("semaines").once("value");
    console.log("🔍 Diagnostic — contenu de /semaines juste après écriture :", JSON.stringify(verifSnap.val()));
    return;
  }

  if (action.type === "closed_and_created") {
    console.log(`✅ Semaine "${action.closedNom}" clôturée, "${action.newNom}" ouverte.`);
    const resume = await construireResume(action.closedId, action.closedNom);
    await db.ref("semaines/" + action.closedId + "/resume").set(resume.texte);

    const cfgSnap = await db.ref("config/discord_webhook_semaine").once("value");
    const webhook = cfgSnap.val();
    if (webhook) await envoyerWebhook(webhook, resume, action.closedNom);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Erreur:", e);
    process.exit(1);
  });
