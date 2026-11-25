// Charge le catalogue de démonstration (commerces + offres) dans Firestore.
// Usage : npm run seed       (idempotent : peut être relancé sans créer de doublons)
//
// Les commerces de démonstration appartiennent à des propriétaires fictifs (demo_owner_N) :
// ils servent à remplir le catalogue. Pour tester le parcours commerçant, inscrivez-vous
// avec votre propre adresse Gmail (rôle « Commerçant ») puis validez le commerce en tant qu'admin.
import fs from "node:fs";
import { db } from "../src/server/firebase.js";

const data = JSON.parse(fs.readFileSync(new URL("./seed-data.json", import.meta.url), "utf-8"));
const now = Date.now();
const batch = db.batch();

data.merchants.forEach((m, i) => {
  batch.set(db.collection("merchants").doc(m.id), {
    ...m,
    createdAt: new Date(now - i * 1000).toISOString()
  });
});
data.offers.forEach((o, i) => {
  batch.set(db.collection("offers").doc(o.id), {
    ...o,
    createdAt: new Date(now - i * 1000).toISOString()
  });
});

await batch.commit();
console.log(`Seed terminé : ${data.merchants.length} commerces, ${data.offers.length} offres.`);
process.exit(0);
