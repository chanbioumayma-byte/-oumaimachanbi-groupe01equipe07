// Initialisation du Firebase Admin SDK (Auth + Firestore + Cloud Messaging).
// La clé de compte de service n'est JAMAIS dans le dépôt : elle est lue depuis
//   - la variable FIREBASE_SERVICE_ACCOUNT_JSON (contenu JSON, pour l'hébergement), ou
//   - le fichier indiqué par GOOGLE_APPLICATION_CREDENTIALS (défaut : ./serviceAccountKey.json).
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  const keyPath = path.resolve(
    process.cwd(),
    process.env.GOOGLE_APPLICATION_CREDENTIALS || "serviceAccountKey.json"
  );
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Clé Firebase introuvable : ${keyPath}\n` +
        "Placez le fichier serviceAccountKey.json à la racine du projet " +
        "(Console Firebase > Paramètres du projet > Comptes de service > Générer une nouvelle clé privée)."
    );
  }
  return JSON.parse(fs.readFileSync(keyPath, "utf-8"));
}

if (getApps().length === 0) {
  initializeApp({ credential: cert(loadServiceAccount()) });
}

export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
export const auth = getAuth();
export const messaging = getMessaging();
export { FieldValue };
