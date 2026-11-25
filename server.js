import path from "node:path";
import express from "express";
import { auth } from "./src/server/firebase.js";
import { BusinessError, store, toPublicUser } from "./src/server/store.js";

const PORT = Number(process.env.PORT) || 3000;

// Inscription réservée aux adresses Gmail (adresses réelles, vérifiées par e-mail).
const GMAIL_RE = /^[a-z0-9._%+-]+@gmail\.com$/i;

function bearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

/** Vérifie le jeton Firebase uniquement (utilisé pour l'inscription : le profil n'existe pas encore). */
async function requireFirebaseToken(req, res, next) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentification requise." });
    return;
  }
  try {
    req.firebaseUser = await auth.verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Session expirée ou invalide." });
  }
}

/** Vérifie le jeton Firebase + e-mail confirmé + profil actif. Renseigne req.auth = { sub, role }. */
async function requireAuth(req, res, next) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentification requise." });
    return;
  }
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    res.status(401).json({ error: "Session expirée ou invalide." });
    return;
  }
  if (decoded.email_verified !== true) {
    res.status(403).json({
      code: "email_not_verified",
      error: "Adresse e-mail non vérifiée. Cliquez sur le lien reçu par e-mail."
    });
    return;
  }
  try {
    const user = await store.getUserById(decoded.uid);
    if (!user) {
      res.status(404).json({ code: "profile_missing", error: "Profil CampusSave introuvable." });
      return;
    }
    if (!user.active) {
      res.status(403).json({ error: "Compte suspendu ou introuvable." });
      return;
    }
    req.auth = { sub: decoded.uid, role: user.role };
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

/** Authentification optionnelle (pour les routes publiques qui adaptent leur réponse selon le rôle). */
async function optionalAuth(req, _res, next) {
  const token = bearerToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    if (decoded.email_verified === true) {
      const user = await store.getUserById(decoded.uid);
      if (user && user.active) {
        req.auth = { sub: decoded.uid, role: user.role };
      }
    }
  } catch {
    // Jeton absent, expiré ou invalide : on continue en mode visiteur public
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({ error: "Accès non autorisé pour ce rôle." });
      return;
    }
    next();
  };
}

/**
 * Enveloppe une route async : les erreurs métier (BusinessError) deviennent des réponses 400
 * avec leur message ; toute autre erreur est journalisée et renvoie une réponse 500 générique.
 */
const route = (handler, fallbackMessage = "Erreur serveur.") => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    if (res.headersSent) return;
    if (err instanceof BusinessError) {
      res.status(400).json({ error: err.message });
    } else {
      console.error(err);
      res.status(500).json({ error: fallbackMessage });
    }
  }
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Sert publiquement les images statiques (public/images/...) pour le Web et Flutter.
  app.use(express.static(path.resolve(process.cwd(), "public")));

  // ───────────── Authentification ─────────────
  app.post(
    "/api/auth/register",
    requireFirebaseToken,
    route(async (req, res) => {
      const decoded = req.firebaseUser;
      const email = decoded.email;
      if (!email || !GMAIL_RE.test(email)) {
        res.status(400).json({ error: "Seules les adresses Gmail (@gmail.com) sont acceptées." });
        return;
      }
      const {
        name,
        role,
        phone,
        studentCardId,
        businessName,
        businessAddress,
        businessCategory,
        businessDescription
      } = req.body ?? {};
      if (typeof name !== "string" || name.trim().length < 2) {
        res.status(400).json({ error: "Le nom complet est requis (min. 2 caractères)." });
        return;
      }
      if (role !== "student" && role !== "merchant") {
        res.status(400).json({ error: "Rôle invalide pour l’inscription." });
        return;
      }
      if (role === "merchant" && (typeof businessName !== "string" || businessName.trim().length < 2)) {
        res.status(400).json({ error: "Le nom du commerce est requis." });
        return;
      }
      if (await store.getUserById(decoded.uid)) {
        res.status(409).json({ error: "Un profil existe déjà pour ce compte." });
        return;
      }
      const result = await store.registerUser(decoded.uid, {
        name,
        email,
        role,
        phone: typeof phone === "string" && phone.trim() ? phone : "+216 00 000 000",
        studentCardId: typeof studentCardId === "string" ? studentCardId : undefined,
        businessName: typeof businessName === "string" ? businessName : undefined,
        businessAddress: typeof businessAddress === "string" ? businessAddress : undefined,
        businessCategory,
        businessDescription: typeof businessDescription === "string" ? businessDescription : undefined
      });
      res.status(201).json({ user: result.user, merchant: result.merchant });
    }, "Erreur d’inscription.")
  );

  app.get(
    "/api/auth/me",
    requireAuth,
    route(async (req, res) => {
      const user = await store.getUserById(req.auth.sub);
      if (!user) {
        res.status(404).json({ error: "Utilisateur introuvable." });
        return;
      }
      const merchant = user.role === "merchant" ? await store.getMerchantByOwner(user.id) : undefined;
      res.json({ user: toPublicUser(user), merchant });
    })
  );

  app.patch(
    "/api/auth/profile",
    requireAuth,
    route(async (req, res) => {
      const { name, phone, studentCardId } = req.body ?? {};
      const updated = await store.updateUserProfile(req.auth.sub, { name, phone, studentCardId });
      res.json({ user: updated });
    }, "Erreur profil.")
  );

  // ───────────── Commerces ─────────────
  app.get(
    "/api/merchants",
    route(async (_req, res) => {
      res.json({ merchants: await store.listMerchants(false) });
    })
  );

  app.get(
    "/api/merchants/mine",
    requireAuth,
    requireRole("merchant"),
    route(async (req, res) => {
      const merchant = await store.getMerchantByOwner(req.auth.sub);
      if (!merchant) {
        res.status(404).json({ error: "Commerce introuvable." });
        return;
      }
      res.json({ merchant });
    })
  );

  app.patch(
    "/api/merchants/mine",
    requireAuth,
    requireRole("merchant"),
    route(async (req, res) => {
      res.json({ merchant: await store.updateMerchantProfile(req.auth.sub, req.body ?? {}) });
    }, "Erreur mise à jour commerce.")
  );

  // ───────────── Offres ─────────────
  app.get(
    "/api/offers",
    optionalAuth,
    route(async (req, res) => {
      const { q, category, merchantId, maxPrice, type, onlyAvailable } = req.query;
      const offers = await store.listOffers({
        q: typeof q === "string" ? q : undefined,
        category: typeof category === "string" ? category : undefined,
        merchantId: typeof merchantId === "string" ? merchantId : undefined,
        maxPrice: typeof maxPrice === "string" && maxPrice ? Number(maxPrice) : undefined,
        offerType: typeof type === "string" ? type : undefined,
        onlyAvailable: onlyAvailable === "true",
        actorId: req.auth?.sub,
        actorRole: req.auth?.role
      });
      res.json({ offers });
    })
  );

  app.get(
    "/api/offers/mine",
    requireAuth,
    requireRole("merchant"),
    route(async (req, res) => {
      const merchant = await store.getMerchantByOwner(req.auth.sub);
      res.json({ offers: merchant ? await store.listMerchantOffers(merchant.id) : [] });
    })
  );

  app.post(
    "/api/offers",
    requireAuth,
    requireRole("merchant"),
    route(async (req, res) => {
      const {
        title,
        description,
        category,
        offerType,
        originalPrice,
        discountedPrice,
        quantity,
        weightKg,
        pickupStart,
        pickupEnd,
        imageUrl
      } = req.body ?? {};
      if (typeof title !== "string" || title.trim().length < 3) {
        res.status(400).json({ error: "Le titre de l’offre est requis." });
        return;
      }
      const offer = await store.createOffer(req.auth.sub, {
        title,
        description: typeof description === "string" ? description : "",
        category,
        offerType: offerType === "surprise" ? "surprise" : "standard",
        originalPrice: Number(originalPrice),
        discountedPrice: Number(discountedPrice),
        quantity: Number(quantity),
        weightKg: Number(weightKg || 0.7),
        pickupStart: typeof pickupStart === "string" ? pickupStart : "17h00",
        pickupEnd: typeof pickupEnd === "string" ? pickupEnd : "19h00",
        imageUrl: typeof imageUrl === "string" ? imageUrl : undefined
      });
      res.status(201).json({ offer });
    }, "Erreur création offre.")
  );

  app.patch(
    "/api/offers/:id",
    requireAuth,
    requireRole("merchant", "admin"),
    route(async (req, res) => {
      const offer = await store.updateOffer(String(req.params.id), req.auth.sub, req.auth.role, req.body ?? {});
      res.json({ offer });
    }, "Erreur modification offre.")
  );

  app.delete(
    "/api/offers/:id",
    requireAuth,
    requireRole("merchant", "admin"),
    route(async (req, res) => {
      await store.deleteOffer(String(req.params.id), req.auth.sub, req.auth.role);
      res.json({ deleted: true });
    }, "Erreur suppression offre.")
  );

  // ───────────── Commandes & paiement ─────────────
  app.get(
    "/api/orders",
    requireAuth,
    route(async (req, res) => {
      res.json({ orders: await store.listOrdersForUser(req.auth.sub, req.auth.role) });
    })
  );

  app.post(
    "/api/orders",
    requireAuth,
    requireRole("student"),
    route(async (req, res) => {
      const { items } = req.body ?? {};
      if (!Array.isArray(items)) {
        res.status(400).json({ error: "Liste d’articles invalide." });
        return;
      }
      res.status(201).json({ order: await store.createOrder(req.auth.sub, items) });
    }, "Erreur réservation.")
  );

  app.patch(
    "/api/orders/:id/cancel",
    requireAuth,
    route(async (req, res) => {
      res.json({ order: await store.cancelOrder(String(req.params.id), req.auth.sub, req.auth.role) });
    }, "Erreur annulation.")
  );

  app.post(
    "/api/payments/konnect/init",
    requireAuth,
    requireRole("student"),
    route(async (req, res) => {
      const { orderId } = req.body ?? {};
      if (typeof orderId !== "string") {
        res.status(400).json({ error: "Identifiant de commande requis." });
        return;
      }
      const orders = await store.listOrdersForUser(req.auth.sub, "student");
      const order = orders.find((o) => o.id === orderId);
      if (!order) {
        res.status(404).json({ error: "Commande introuvable." });
        return;
      }
      res.json({
        sandbox: true,
        gateway: "Konnect Test Network",
        sessionRef: `KNT-SESS-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
        amountMillimes: Math.round(order.totalAmount * 1000),
        currency: "TND",
        receiverWallet: process.env.KONNECT_RECEIVER_WALLET_ID || "SANDBOX_ESSECT_WALLET"
      });
    })
  );

  app.post(
    "/api/payments/konnect/confirm",
    requireAuth,
    requireRole("student"),
    route(async (req, res) => {
      const { orderId, method } = req.body ?? {};
      if (typeof orderId !== "string") {
        res.status(400).json({ error: "Identifiant de commande requis." });
        return;
      }
      const validMethod =
        method === "konnect_card" || method === "konnect_edinar" ? method : "konnect_wallet";
      res.json({ order: await store.confirmKonnectPayment(orderId, req.auth.sub, validMethod) });
    }, "Erreur paiement Konnect.")
  );

  app.post(
    "/api/orders/verify-qr",
    requireAuth,
    requireRole("merchant", "admin"),
    route(async (req, res) => {
      const { code } = req.body ?? {};
      if (typeof code !== "string" || !code.trim()) {
        res.status(400).json({ error: "Code de retrait ou QR requis." });
        return;
      }
      res.json({ order: await store.verifyAndPickupOrder(code, req.auth.sub, req.auth.role) });
    }, "Validation QR impossible.")
  );

  // ───────────── Notifications ─────────────
  app.get(
    "/api/notifications",
    requireAuth,
    route(async (req, res) => {
      res.json({ notifications: await store.listNotifications(req.auth.sub) });
    })
  );

  app.patch(
    "/api/notifications/:id/read",
    requireAuth,
    route(async (req, res) => {
      await store.markNotificationRead(String(req.params.id), req.auth.sub);
      res.json({ ok: true });
    })
  );

  app.post(
    "/api/notifications/token",
    requireAuth,
    route(async (req, res) => {
      const { token } = req.body ?? {};
      if (typeof token !== "string" || token.length < 20) {
        res.status(400).json({ error: "Jeton FCM invalide." });
        return;
      }
      await store.saveFcmToken(req.auth.sub, token);
      res.json({ ok: true });
    })
  );

  // ───────────── Statistiques & administration ─────────────
  app.get(
    "/api/stats/platform",
    route(async (_req, res) => {
      res.json({ stats: await store.getPlatformStats() });
    })
  );

  app.get(
    "/api/admin/merchants",
    requireAuth,
    requireRole("admin"),
    route(async (_req, res) => {
      res.json({ merchants: await store.listMerchants(true) });
    })
  );

  app.patch(
    "/api/admin/merchants/:id/status",
    requireAuth,
    requireRole("admin"),
    route(async (req, res) => {
      const { status } = req.body ?? {};
      if (status !== "approved" && status !== "rejected" && status !== "pending") {
        res.status(400).json({ error: "Statut commerçant invalide." });
        return;
      }
      res.json({ merchant: await store.setMerchantStatus(String(req.params.id), status) });
    }, "Erreur statut commerce.")
  );

  app.get(
    "/api/admin/users",
    requireAuth,
    requireRole("admin"),
    route(async (_req, res) => {
      res.json({ users: await store.listUsersForAdmin() });
    })
  );

  app.patch(
    "/api/admin/users/:id/status",
    requireAuth,
    requireRole("admin"),
    route(async (req, res) => {
      const { active } = req.body ?? {};
      res.json({ user: await store.setUserActiveStatus(String(req.params.id), Boolean(active)) });
    }, "Erreur statut utilisateur.")
  );

  // ───────────── Application web ─────────────
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CampusSave server listening on http://localhost:${PORT}`);
  });
}

startServer();