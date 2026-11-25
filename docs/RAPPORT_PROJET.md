# Rapport de Projet Intégrateur — CampusSave

**Établissement :** École Supérieure des Sciences Économiques et Commerciales de Tunis (ESSECT)  
**Filière :** 3ème année E-Business (Business Computing)  
**Modules :** Intégration Web (React.js) & Développement Mobile (Flutter)  
**Date limite de dépôt :** 25 novembre 2026  

---

## 1. Contexte & Problématique

Chaque fin de journée, les boulangeries, cafétérias et restaurants situés aux abords du campus de l'ESSECT à Montfleury (Rue Abou Kacem Chebbi, Avenue Ali Trad) se retrouvent avec des invendus alimentaires encore frais. Parallèlement, de nombreux étudiants recherchent des repas accessibles et de qualité entre les cours.

**CampusSave** apporte une réponse numérique concrète à cette double problématique :
- Réduire le gaspillage alimentaire local.
- Permettre aux étudiants de bénéficier de repas entre `-50%` et `-70%`.
- Offrir aux commerçants de proximité un canal de valorisation simple et sans perte sèche.

---

## 2. Architecture Technique

Le système repose sur une architecture **3-tiers découplée** avec un **backend REST commun** :

1. **Client Web (`React.js 19` + `Tailwind CSS v4`)** : Interface responsive adaptée aux écrans desktop et tablettes pour les trois acteurs (Étudiant, Commerçant, Administrateur).
2. **Client Mobile (`Flutter / Dart`)** : Application mobile multiplateforme iOS/Android destinée aux étudiants en mobilité sur le campus et aux commerçants pour scanner les QR codes au comptoir.
3. **Backend API REST (`Node.js / Express`)** : Couche métier unifiée gérant l'authentification sécurisée (`scrypt` + jetons HMAC Bearer), la gestion atomique des stocks, l'initialisation/confirmation Konnect Test, la vérification des QR codes et le calcul des EcoPoints / CO₂ évité.
4. **Persistance & Services Cloud (`Firebase Auth, Firestore, FCM`)** : Schémas de données structurés, règles de sécurité Firestore et file de notifications push.

---

## 3. Choix Sécuritaires & Ergonomiques

- **Contrôle d'accès basé sur les rôles (RBAC)** : Chaque route API vérifie le rôle du jeton (`student`, `merchant`, `admin`) ainsi que la propriété des ressources (un commerçant ne modifie que ses propres offres et ne valide que ses propres commandes).
- **Intégrité transactionnelle des stocks** : La réservation décrémente les quantités disponibles et les restaure automatiquement en cas d'annulation avant retrait.
- **Validation des formulaires** : Contrôles côté client et serveur (cohérence `prix réduit < prix initial`, quantité minimale, validation e-mail et formats horaires).
- **Design System sobre et lisible** : Palette neutre haute lisibilité avec accent vert botanique (`#15803D`), chiffres tabulaires (`JetBrains Mono`) pour les prix en TND et les métriques d'impact.

---

## 4. Bilan des Fonctionnalités Livrées

Toutes les fonctionnalités obligatoires (Authentification, Commerces, Offres, Recherche, Réservation, Paiement Konnect Test, QR Code, Tableaux de bord) ainsi que les **4 fonctionnalités bonus** (Campus Radar, Surprise Basket, EcoPoints, Impact Dashboard) sont intégralement opérationnelles et synchronisées via le backend commun.
