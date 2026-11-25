// Donne le rôle « admin » à un compte existant.
// Usage : npm run make-admin -- votre.adresse@gmail.com
// Prérequis : le compte a déjà été créé via le formulaire d'inscription de l'application.
import { auth, db } from "../src/server/firebase.js";

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Usage : npm run make-admin -- adresse@gmail.com");
  process.exit(1);
}

try {
  const user = await auth.getUserByEmail(email);
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(
      `Le compte ${email} existe dans Firebase Auth mais n'a pas de profil CampusSave.\n` +
        "Inscrivez-vous d'abord via l'application (formulaire « S'inscrire »)."
    );
    process.exit(1);
  }
  await ref.update({ role: "admin", ecoPoints: 0 });
  const notifs = await db
    .collection("notifications")
    .where("userId", "==", user.uid)
    .where("title", "==", "Bienvenue sur CampusSave")
    .get();
  for (const doc of notifs.docs) {
    await doc.ref.delete();
  }
  console.log(`OK : ${email} est maintenant administrateur. Déconnectez-vous puis reconnectez-vous.`);
} catch (err) {
  console.error(err.code === "auth/user-not-found" ? `Aucun compte Firebase pour ${email}.` : err);
  process.exit(1);
}
process.exit(0);
