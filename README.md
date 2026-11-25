# CampusSave — Plateforme de lutte contre le gaspillage alimentaire

Projet intégrateur — 3ème année E-Business (Business Computing) — ESSECT.
Étudiants ↔ restaurants/cafétérias de proximité : invendus à prix réduits, réservation, paiement Konnect (mode test), retrait par QR Code.

## Architecture

| Couche | Technologie | Dossier |
|---|---|---|
| Application Web | React 19 + Vite + Tailwind | `src/` |
| Backend / API REST | Node.js + Express | `server.js`, `src/server/` |
| Authentification | Firebase Authentication (e-mail/mot de passe, **e-mail vérifié obligatoire**) | `src/lib/firebase.js`, `src/server/firebase.js` |
| Base de données | Firebase Firestore (`users`, `merchants`, `offers`, `orders`, `notifications`) | `src/server/store.js` |
| Notifications | Firebase Cloud Messaging (envoi serveur via `firebase-admin`) | `src/server/store.js` |
| Application Mobile | Flutter | `mobile-flutter/` |
| Configuration Firebase | Règles et index Firestore | `firebase-config/` |
| Documentation | UML (`docs/uml`), rapport (`docs/RAPPORT_PROJET.md`) | `docs/` |

Flux d'authentification : le client (web ou mobile) se connecte avec Firebase Auth, reçoit un **ID token**, l'envoie à l'API
(`Authorization: Bearer <token>`) ; le serveur le vérifie (`verifyIdToken`), exige `email_verified = true`, puis lit le rôle
(`student`, `merchant`, `admin`) dans `users/{uid}` (Firestore).

## Installation

Prérequis : Node.js ≥ 20.

1. **Projet Firebase** (console.firebase.google.com) : activer *Authentication → E-mail/Mot de passe* et *Firestore Database*.
2. **Clé du serveur** : *Paramètres du projet → Comptes de service → Générer une nouvelle clé privée*.
   Enregistrer le fichier sous `serviceAccountKey.json` à la racine (**ignoré par Git, ne jamais le publier**).
3. **Configuration Web** : *Paramètres du projet → Vos applications → Application Web*, puis copier les valeurs dans `.env` :
   ```bash
   cp .env.example .env     # puis renseigner les variables VITE_FIREBASE_*
   ```
4. Installer et lancer :
   ```bash
   npm install
   node scripts/seed.js     # charge le catalogue de démonstration (une seule fois)
   npm run dev              # http://localhost:3000
   ```

## Comptes et rôles

Les adresses doivent être des adresses **Gmail réelles** : un e-mail de confirmation est envoyé à l'inscription.
Astuce : `prenom+admin@gmail.com` et `prenom+commerce@gmail.com` arrivent dans la même boîte que `prenom@gmail.com`.

1. S'inscrire via l'application (Étudiant ou Commerçant), cliquer sur le lien reçu par e-mail, puis se connecter.
2. Le rôle **administrateur** ne peut pas être choisi à l'inscription. Après avoir créé le compte :
   ```bash
   node scripts/make-admin.js votre.adresse@gmail.com
   ```
3. L'administrateur valide le commerce du commerçant (tableau de bord admin) ; le commerçant peut alors publier des offres.

## Fonctionnalités

Obligatoires : authentification et rôles, gestion des commerces (validation admin), offres (prix initial/réduit, quantité, horaires),
recherche multicritères, réservation avec contrôle atomique du stock (transaction Firestore), paiement Konnect en mode test,
QR Code de retrait (usage unique), tableaux de bord par rôle.
Bonus : Campus Radar, Surprise Basket, EcoPoints, Impact Dashboard.

Paiement : le tunnel Konnect fonctionne en **simulation sandbox** (aucun appel à l'API Konnect réelle).

## Sécurité

- Aucune clé privée dans le dépôt (`serviceAccountKey.json` et `.env` sont ignorés par Git).
- Accès contrôlés par rôle côté serveur ; un commerçant ne modifie que ses offres et ne valide que ses commandes.
- Seules les adresses Gmail vérifiées peuvent utiliser l'API.

## Application mobile

> À compléter après la migration Flutter (connexion Firebase Auth, instructions `flutterfire configure` et `flutter run`).
