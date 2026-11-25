// Couche de données CampusSave — Firebase Firestore (via firebase-admin).
// Collections : users, merchants, offers, orders, notifications.
// Toutes les méthodes sont asynchrones.
import crypto from "node:crypto";
import { db, FieldValue, messaging } from "./firebase.js";

const col = (name) => db.collection(name);
const nowIso = () => new Date().toISOString();
const newId = (prefix, bytes = 5) => `${prefix}_${crypto.randomBytes(bytes).toString("hex")}`;
const docData = (snap) => (snap.exists ? { id: snap.id, ...snap.data() } : null);
const listData = (qs) => qs.docs.map(docData);

const byDateDesc = (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
export class BusinessError extends Error {}
const fail = (msg) => {
  throw new BusinessError(msg);
};

export function toPublicUser(user) {
  if (!user) return user;
  const { fcmToken: _t, ...pub } = user;
  return pub;
}

let statsCache = { at: 0, value: null };
const invalidateStats = () => {
  statsCache = { at: 0, value: null };
};

class Store {
  // ───────────────────────── Utilisateurs ─────────────────────────
  async getUserById(id) {
    if (!id) return null;
    return docData(await col("users").doc(id).get());
  }

  /** Crée le profil Firestore d'un compte Firebase Auth déjà créé (uid). */
  async registerUser(uid, input) {
    const now = nowIso();
    const isStudent = input.role === "student";
    const user = {
      id: uid,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      phone: input.phone.trim(),
      ecoPoints: isStudent ? 20 : 0, // bonus de bienvenue
      mealsRescued: 0,
      foodSavedKg: 0,
      moneySavedTnd: 0,
      active: true,
      createdAt: now
    };
    if (isStudent) user.studentCardId = input.studentCardId?.trim() || "ESSECT-2026-NEW";

    let merchant;
    const batch = db.batch();
    batch.set(col("users").doc(uid), user);
    if (!isStudent) {
      merchant = {
        id: newId("mrc"),
        ownerId: uid,
        name: input.businessName?.trim() || `${input.name.trim()} Café`,
        category: input.businessCategory || "Cafétéria",
        description:
          input.businessDescription?.trim() ||
          "Établissement partenaire CampusSave à proximité de l’ESSECT.",
        address: input.businessAddress?.trim() || "Quartier Montfleury, Tunis",
        distanceMeters: 350,
        walkMinutes: 4,
        mapX: 48,
        mapY: 64,
        openingHours: "08h00 – 20h00",
        phone: input.phone.trim(),
        status: "pending",
        rating: 5,
        totalMealsSaved: 0,
        createdAt: now
      };
      batch.set(col("merchants").doc(merchant.id), merchant);
    }
    await batch.commit();
    invalidateStats();

    if (merchant) {
      const admins = listData(await col("users").where("role", "==", "admin").get());
      for (const adm of admins) {
        await this.addNotification(
          adm.id,
          "Nouveau commerçant inscrit",
          `${merchant.name} demande l’approbation pour rejoindre CampusSave.`,
          "in_app"
        );
      }
    } else {
      await this.addNotification(
        uid,
        "Bienvenue sur CampusSave",
        "Votre compte étudiant est actif (+20 EcoPoints de bienvenue).",
        "fcm_push"
      );
    }
    return { user: toPublicUser(user), merchant };
  }

  async updateUserProfile(userId, patch) {
    const user = await this.getUserById(userId);
    if (!user) fail("Utilisateur introuvable.");
    const upd = {};
    if (patch.name?.trim()) upd.name = patch.name.trim();
    if (patch.phone?.trim()) upd.phone = patch.phone.trim();
    if (patch.studentCardId?.trim() && user.role === "student") {
      upd.studentCardId = patch.studentCardId.trim();
    }
    if (Object.keys(upd).length) await col("users").doc(userId).update(upd);
    return toPublicUser({ ...user, ...upd });
  }

  async saveFcmToken(userId, token) {
    await col("users").doc(userId).update({ fcmToken: token, fcmUpdatedAt: nowIso() });
  }

  async listUsersForAdmin() {
    const users = listData(await col("users").get());
    return users.sort(byDateDesc).map(toPublicUser);
  }

  async setUserActiveStatus(userId, active) {
    const user = await this.getUserById(userId);
    if (!user) fail("Utilisateur introuvable.");
    await col("users").doc(userId).update({ active });
    invalidateStats();
    return toPublicUser({ ...user, active });
  }

  // ───────────────────────── Commerces ─────────────────────────
  async listMerchants(includeAll = false) {
    const q = includeAll ? col("merchants") : col("merchants").where("status", "==", "approved");
    return listData(await q.get());
  }

  async getMerchantByOwner(ownerId) {
    const qs = await col("merchants").where("ownerId", "==", ownerId).limit(1).get();
    return qs.empty ? null : docData(qs.docs[0]);
  }

  async getMerchantById(id) {
    if (!id) return null;
    return docData(await col("merchants").doc(id).get());
  }

  async updateMerchantProfile(ownerId, patch) {
    const merchant = await this.getMerchantByOwner(ownerId);
    if (!merchant) fail("Commerce introuvable.");
    const upd = {};
    if (patch.name?.trim()) upd.name = patch.name.trim();
    if (patch.category) upd.category = patch.category;
    if (patch.description?.trim()) upd.description = patch.description.trim();
    if (patch.address?.trim()) upd.address = patch.address.trim();
    if (patch.openingHours?.trim()) upd.openingHours = patch.openingHours.trim();
    if (patch.phone?.trim()) upd.phone = patch.phone.trim();
    if (typeof patch.distanceMeters === "number" && patch.distanceMeters > 0) {
      upd.distanceMeters = patch.distanceMeters;
      upd.walkMinutes = Math.max(1, Math.round(patch.distanceMeters / 80));
    }
    const updated = { ...merchant, ...upd };
    const batch = db.batch();
    batch.update(col("merchants").doc(merchant.id), upd);
    // Les offres dupliquent le nom / l'adresse / la distance du commerce.
    const offers = await col("offers").where("merchantId", "==", merchant.id).get();
    for (const o of offers.docs) {
      batch.update(o.ref, {
        merchantName: updated.name,
        merchantAddress: updated.address,
        distanceMeters: updated.distanceMeters
      });
    }
    await batch.commit();
    return updated;
  }

  async setMerchantStatus(merchantId, status) {
    const merchant = await this.getMerchantById(merchantId);
    if (!merchant) fail("Commerce introuvable.");
    await col("merchants").doc(merchantId).update({ status });
    invalidateStats();
    await this.addNotification(
      merchant.ownerId,
      status === "approved" ? "Commerce validé par l’ESSECT" : "Statut commerce mis à jour",
      status === "approved"
        ? `Félicitations ! ${merchant.name} est désormais visible pour les étudiants.`
        : `Le statut de ${merchant.name} est passé à : ${status}.`,
      "fcm_push"
    );
    return { ...merchant, status };
  }

 
// ───────────────────────── Offres ─────────────────────────
  async listOffers(filters) {
    let forcedMerchantId = null;
    if (filters?.actorRole === "merchant" && filters?.actorId) {
      const myMerchant = await this.getMerchantByOwner(filters.actorId);
      if (!myMerchant) return [];
      forcedMerchantId = myMerchant.id;
    }

    const [merchantsSnap, offersSnap] = await Promise.all([
      col("merchants").where("status", "==", "approved").get(),
      forcedMerchantId
        ? col("offers").where("merchantId", "==", forcedMerchantId).get()
        : col("offers").where("active", "==", true).get()
    ]);

    const approvedIds = new Set(merchantsSnap.docs.map((d) => d.id));
    return listData(offersSnap)
      .filter((offer) => {
        if (forcedMerchantId) {
          if (offer.merchantId !== forcedMerchantId) return false;
        } else {
          if (!approvedIds.has(offer.merchantId)) return false;
          if (filters?.merchantId && offer.merchantId !== filters.merchantId) return false;
        }
        if (filters?.onlyAvailable && offer.quantity <= 0) return false;
        if (filters?.category && filters.category !== "Toutes" && offer.category !== filters.category) {
          return false;
        }
        if (filters?.offerType && filters.offerType !== "all" && offer.offerType !== filters.offerType) {
          return false;
        }
        if (
          typeof filters?.maxPrice === "number" &&
          !Number.isNaN(filters.maxPrice) &&
          offer.discountedPrice > filters.maxPrice
        ) {
          return false;
        }
        if (filters?.q?.trim()) {
          const needle = filters.q.trim().toLowerCase();
          const hay =
            `${offer.title} ${offer.description} ${offer.merchantName} ${offer.category}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort(byDateDesc);
  }

  async listMerchantOffers(merchantId) {
    const qs = await col("offers").where("merchantId", "==", merchantId).get();
    return listData(qs).sort(byDateDesc);
  }

  async createOffer(ownerId, input) {
    const merchant = await this.getMerchantByOwner(ownerId);
    if (!merchant) fail("Commerce introuvable.");
    if (merchant.status !== "approved") {
      fail("Votre commerce doit être validé par l’administrateur avant de publier des offres.");
    }
    const { originalPrice, discountedPrice, quantity } = input;
    if (![originalPrice, discountedPrice, quantity].every(Number.isFinite)) {
      fail("Prix et quantité doivent être des nombres valides.");
    }
    if (discountedPrice >= originalPrice || discountedPrice <= 0) {
      fail("Le prix réduit doit être inférieur au prix initial et supérieur à 0.");
    }
    if (quantity < 1) fail("La quantité doit être d’au moins 1.");

    const defaultImageByCategory = {
      Boulangerie: "/images/offer_bakery_box_1795344519200.jpg",
      "Plats cuisinés": "/images/offer_mediterranean_meal_1795344519047.jpg",
      Sandwichs: "/images/offer_sandwich_cafe_1795344519548.jpg",
      Cafétéria: "/images/offer_sandwich_cafe_1795344519548.jpg",
      Pâtisserie: "/images/offer_bakery_box_1795344519200.jpg"
    };
    const offer = {
      id: newId("off"),
      merchantId: merchant.id,
      merchantName: merchant.name,
      merchantAddress: merchant.address,
      distanceMeters: merchant.distanceMeters,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      offerType: input.offerType,
      originalPrice: Number(originalPrice.toFixed(2)),
      discountedPrice: Number(discountedPrice.toFixed(2)),
      quantity: Math.floor(quantity),
      weightKg: Number((input.weightKg || 0.7).toFixed(2)),
      pickupStart: input.pickupStart,
      pickupEnd: input.pickupEnd,
      imageUrl:
        input.imageUrl?.trim() ||
        (input.offerType === "surprise"
          ? "/images/offer_surprise_basket_1795344518967.jpg"
          : defaultImageByCategory[input.category]),
      active: true,
      createdAt: nowIso()
    };
    await col("offers").doc(offer.id).set(offer);
    invalidateStats();
    return offer;
  }

  async #assertOfferAccess(offer, actorId, actorRole) {
    if (actorRole === "admin") return;
    const merchant = await this.getMerchantByOwner(actorId);
    if (!merchant || merchant.id !== offer.merchantId) fail("Accès refusé à cette offre.");
  }

  async updateOffer(offerId, actorId, actorRole, patch) {
    const offer = docData(await col("offers").doc(offerId).get());
    if (!offer) fail("Offre introuvable.");
    await this.#assertOfferAccess(offer, actorId, actorRole);

    const upd = {};
    if (patch.title?.trim()) upd.title = patch.title.trim();
    if (patch.description?.trim()) upd.description = patch.description.trim();
    if (patch.category) upd.category = patch.category;
    if (patch.offerType) upd.offerType = patch.offerType;
    if (typeof patch.originalPrice === "number" && patch.originalPrice > 0) {
      upd.originalPrice = Number(patch.originalPrice.toFixed(2));
    }
    if (typeof patch.discountedPrice === "number" && patch.discountedPrice > 0) {
      upd.discountedPrice = Number(patch.discountedPrice.toFixed(2));
    }
    if (typeof patch.quantity === "number" && patch.quantity >= 0) {
      upd.quantity = Math.floor(patch.quantity);
    }
    if (typeof patch.weightKg === "number" && patch.weightKg > 0) {
      upd.weightKg = Number(patch.weightKg.toFixed(2));
    }
    if (patch.pickupStart) upd.pickupStart = patch.pickupStart;
    if (patch.pickupEnd) upd.pickupEnd = patch.pickupEnd;
    if (typeof patch.active === "boolean") upd.active = patch.active;
    if (typeof patch.imageUrl === "string" && patch.imageUrl.trim()) upd.imageUrl = patch.imageUrl.trim();

    const merged = { ...offer, ...upd };
    if (merged.discountedPrice >= merged.originalPrice) {
      fail("Le prix réduit doit rester inférieur au prix initial.");
    }
    if (Object.keys(upd).length) await col("offers").doc(offerId).update(upd);
    invalidateStats();
    return merged;
  }

  async deleteOffer(offerId, actorId, actorRole) {
    const offer = docData(await col("offers").doc(offerId).get());
    if (!offer) fail("Offre introuvable.");
    await this.#assertOfferAccess(offer, actorId, actorRole);
    await col("offers").doc(offerId).delete();
    invalidateStats();
  }

  // ───────────────────────── Commandes ─────────────────────────
  async createOrder(studentId, requestedItems) {
    const student = await this.getUserById(studentId);
    if (!student || student.role !== "student") {
      fail("Seuls les étudiants connectés peuvent réserver une offre.");
    }
    if (!Array.isArray(requestedItems) || !requestedItems.length) fail("Votre panier est vide.");

    // Regroupe les lignes d'une même offre (évite de contourner le contrôle de stock).
    const wanted = new Map();
    for (const it of requestedItems) {
      const qty = Math.floor(Number(it?.quantity));
      if (typeof it?.offerId !== "string" || !Number.isFinite(qty) || qty <= 0) {
        fail("Article de panier invalide.");
      }
      wanted.set(it.offerId, (wanted.get(it.offerId) || 0) + qty);
    }
    const offerIds = [...wanted.keys()];

    // Transaction : lecture du stock + décrément + création de la commande de façon atomique.
    const order = await db.runTransaction(async (tx) => {
      const snaps = await tx.getAll(...offerIds.map((id) => col("offers").doc(id)));
      const resolved = snaps.map((snap) => {
        const offer = docData(snap);
        if (!offer || !offer.active) fail("Une des offres sélectionnées n’est plus disponible.");
        const qty = wanted.get(offer.id);
        if (qty > offer.quantity) {
          fail(`Stock insuffisant pour "${offer.title}" (${offer.quantity} restants).`);
        }
        return { offer, qty };
      });

      const merchantId = resolved[0].offer.merchantId;
      if (resolved.some((r) => r.offer.merchantId !== merchantId)) {
        fail("Veuillez réserver auprès d’un seul commerce par ticket QR.");
      }
      const merchant = docData(await tx.get(col("merchants").doc(merchantId)));
      if (!merchant || merchant.status !== "approved") fail("Commerce indisponible.");

      let totalAmount = 0;
      let originalTotal = 0;
      let totalWeightKg = 0;
      const items = [];
      for (const { offer, qty } of resolved) {
        totalAmount += offer.discountedPrice * qty;
        originalTotal += offer.originalPrice * qty;
        totalWeightKg += offer.weightKg * qty;
        items.push({
          offerId: offer.id,
          title: offer.title,
          offerType: offer.offerType,
          quantity: qty,
          unitPrice: offer.discountedPrice,
          originalUnitPrice: offer.originalPrice,
          weightKg: offer.weightKg
        });
        tx.update(col("offers").doc(offer.id), { quantity: offer.quantity - qty });
      }
      const first = resolved[0].offer;
      const newOrder = {
        id: newId("ord"),
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        merchantId: merchant.id,
        merchantName: merchant.name,
        merchantAddress: merchant.address,
        items,
        totalAmount: Number(totalAmount.toFixed(2)),
        originalTotal: Number(originalTotal.toFixed(2)),
        savingsTnd: Number((originalTotal - totalAmount).toFixed(2)),
        totalWeightKg: Number(totalWeightKg.toFixed(2)),
        pickupWindow: `${first.pickupStart} – ${first.pickupEnd}`,
        status: "pending_payment",
        ecoPointsAwarded: 0,
        createdAt: nowIso()
      };
      tx.set(col("orders").doc(newOrder.id), newOrder);
      return newOrder;
    });
    invalidateStats();
    return order;
  }

async cancelOrder(orderId, actorId, actorRole) {
    const cancelled = await db.runTransaction(async (tx) => {
      const order = docData(await tx.get(col("orders").doc(orderId)));
      if (!order) fail("Commande introuvable.");
      if (actorRole !== "admin" && order.studentId !== actorId) fail("Accès refusé.");
      if (order.status === "picked_up") fail("Une commande déjà récupérée ne peut pas être annulée.");
      if (order.status === "cancelled") return order;

      const items = Array.isArray(order.items) ? order.items : [];
      if (items.length) {
        const offerSnaps = await tx.getAll(...items.map((i) => col("offers").doc(i.offerId)));
        offerSnaps.forEach((snap, idx) => {
          if (snap.exists) {
            tx.update(snap.ref, { quantity: snap.data().quantity + (items[idx].quantity || 0) });
          }
        });
      }
      tx.update(col("orders").doc(orderId), { status: "cancelled" });
      return { ...order, status: "cancelled" };
    });
    invalidateStats();
    return cancelled;
  }

  async confirmKonnectPayment(orderId, studentId, method) {
    const result = await db.runTransaction(async (tx) => {
      const order = docData(await tx.get(col("orders").doc(orderId)));
      if (!order) fail("Commande introuvable.");
      if (order.studentId !== studentId) fail("Accès refusé.");
      if (order.status === "cancelled") fail("Cette commande a été annulée.");
      if (order.status === "paid" || order.status === "picked_up") return { order, fresh: false };

      const upd = {
        status: "paid",
        paymentMethod: method,
        paymentRef: `KNT-TEST-${crypto.randomInt(100000, 999999)}`,
        qrToken: `CS-QR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
        pickupCode: `CS-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
        paidAt: nowIso()
      };
      tx.update(col("orders").doc(orderId), upd);
      return { order: { ...order, ...upd }, fresh: true };
    });

    invalidateStats();
    if (result.fresh) {
      const { order } = result;
      await this.addNotification(
        studentId,
        `Paiement Konnect confirmé (${order.pickupCode})`,
        `Présentez votre QR code chez ${order.merchantName} entre ${order.pickupWindow}.`,
        "fcm_push"
      );
      const merchant = await this.getMerchantById(order.merchantId);
      if (merchant) {
        await this.addNotification(
          merchant.ownerId,
          `Nouvelle commande payée (${order.pickupCode})`,
          `${order.studentName} vient de régler ${order.totalAmount.toFixed(2)} TND via Konnect.`,
          "fcm_push"
        );
      }
    }
    return result.order;
  }

  async #findOrderByCode(token) {
    const upper = token.toUpperCase();
    for (const field of ["qrToken", "pickupCode"]) {
      const qs = await col("orders").where(field, "==", upper).limit(1).get();
      if (!qs.empty) return docData(qs.docs[0]);
    }
    if (/^[a-z0-9_-]+$/i.test(token)) {
      return docData(await col("orders").doc(token.toLowerCase()).get());
    }
    return null;
  }

  async verifyAndPickupOrder(codeOrToken, actorId, actorRole) {
    const cleaned = codeOrToken.trim();
    let token = cleaned;
    try {
      if (cleaned.startsWith("{")) {
        const parsed = JSON.parse(cleaned);
        token = parsed.qrToken || parsed.pickupCode || cleaned;
      }
    } catch {
      /* texte brut */
    }
    const found = await this.#findOrderByCode(String(token));
    if (!found) fail("QR Code ou code de retrait invalide.");

    if (actorRole !== "admin") {
      const merchant = await this.getMerchantByOwner(actorId);
      if (!merchant || merchant.id !== found.merchantId) {
        fail("Ce QR code appartient à un autre établissement.");
      }
    }

    // Transaction : empêche de valider deux fois le même QR code.
    const result = await db.runTransaction(async (tx) => {
      const orderRef = col("orders").doc(found.id);
      const order = docData(await tx.get(orderRef));
      const studentSnap = await tx.get(col("users").doc(order.studentId));
      const merchantSnap = await tx.get(col("merchants").doc(order.merchantId));

      if (order.status === "pending_payment") fail("Cette commande n’a pas encore été réglée via Konnect.");
      if (order.status === "cancelled") fail("Cette commande a été annulée.");
      if (order.status === "picked_up") fail("Ce QR code a déjà été validé et utilisé.");

      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const hasSurprise = order.items.some((item) => item.offerType === "surprise");
      const ecoPoints = totalItems * 25 + (hasSurprise ? 15 : 0);
      const pickedUpAt = nowIso();

      tx.update(orderRef, { status: "picked_up", pickedUpAt, ecoPointsAwarded: ecoPoints });
      if (studentSnap.exists) {
        tx.update(studentSnap.ref, {
          ecoPoints: FieldValue.increment(ecoPoints),
          mealsRescued: FieldValue.increment(totalItems),
          foodSavedKg: FieldValue.increment(order.totalWeightKg),
          moneySavedTnd: FieldValue.increment(order.savingsTnd)
        });
      }
      if (merchantSnap.exists) {
        tx.update(merchantSnap.ref, { totalMealsSaved: FieldValue.increment(totalItems) });
      }
      return { order: { ...order, status: "picked_up", pickedUpAt, ecoPointsAwarded: ecoPoints }, ecoPoints };
    });

    invalidateStats();
    await this.addNotification(
      result.order.studentId,
      `+${result.ecoPoints} EcoPoints crédités !`,
      `Retrait validé chez ${result.order.merchantName}. Vous avez sauvé ${result.order.totalWeightKg.toFixed(2)} kg d’aliments.`,
      "fcm_push"
    );
    return result.order;
  }

  async listOrdersForUser(userId, role) {
    let orders;
    if (role === "admin") {
      orders = listData(await col("orders").get());
    } else if (role === "student") {
      orders = listData(await col("orders").where("studentId", "==", userId).get());
    } else {
      const merchant = await this.getMerchantByOwner(userId);
      if (!merchant) return [];
      orders = listData(await col("orders").where("merchantId", "==", merchant.id).get());
    }
    return orders.sort(byDateDesc);
  }

  // ───────────────────────── Notifications ─────────────────────────
  async addNotification(userId, title, body, channel) {
    const notif = {
      id: newId("ntf", 4),
      userId,
      title,
      body,
      channel,
      read: false,
      createdAt: nowIso()
    };
    await col("notifications").doc(notif.id).set(notif);

    // Envoi réel d'une notification push FCM si l'appareil a enregistré un jeton.
    if (channel === "fcm_push") {
      this.getUserById(userId)
        .then((u) => {
          if (!u?.fcmToken) return;
          return messaging.send({ token: u.fcmToken, notification: { title, body } });
        })
        .catch(() => {
          /* jeton expiré ou FCM indisponible : la notification reste visible dans l'application */
        });
    }
    return notif;
  }

  async listNotifications(userId) {
    const qs = await col("notifications").where("userId", "==", userId).get();
    return listData(qs).sort(byDateDesc).slice(0, 25);
  }

  async markNotificationRead(notifId, userId) {
    const snap = await col("notifications").doc(notifId).get();
    if (snap.exists && snap.data().userId === userId) {
      await snap.ref.update({ read: true });
    }
  }

  // ───────────────────────── Statistiques ─────────────────────────
  // ───────────────────────── Statistiques ─────────────────────────
  async getPlatformStats() {
    if (statsCache.value && Date.now() - statsCache.at < 20000) return statsCache.value;

    const [users, merchants, offers, orders] = await Promise.all([
      col("users").get().then(listData),
      col("merchants").get().then(listData),
      col("offers").get().then(listData),
      col("orders").get().then(listData)
    ]);

    const paidOrPickedUp = orders.filter((o) => o.status === "paid" || o.status === "picked_up");
    const pickedUpOnly = orders.filter((o) => o.status === "picked_up");

    const totalFoodSavedKg = pickedUpOnly.reduce(
      (acc, o) => acc + (Number(o.totalWeightKg) || 0),
      0
    );
    const totalMealsRescued = pickedUpOnly.reduce(
      (acc, o) =>
        acc +
        (Array.isArray(o.items)
          ? o.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
          : 0),
      0
    );

    const stats = {
      totalUsers: users.length,
      totalStudents: users.filter((u) => u.role === "student").length,
      totalMerchants: users.filter((u) => u.role === "merchant").length,
      totalMerchantStores: merchants.length,
      pendingMerchants: merchants.filter((m) => m.status === "pending").length,
      approvedMerchants: merchants.filter((m) => m.status === "approved").length,
      activeOffers: offers.filter((o) => o.active && o.quantity > 0).length,
      surpriseBasketsCount: offers.filter(
        (o) => o.active && o.quantity > 0 && o.offerType === "surprise"
      ).length,
      totalOrders: orders.length,
      paidOrPickedUpOrders: paidOrPickedUp.length,
      totalRevenueTnd: Number(
        paidOrPickedUp.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0).toFixed(2)
      ),
      totalMoneySavedTnd: Number(
        pickedUpOnly.reduce((acc, o) => acc + (Number(o.savingsTnd) || 0), 0).toFixed(2)
      ),
      totalFoodSavedKg: Number(totalFoodSavedKg.toFixed(1)),
      totalCo2AvoidedKg: Number((totalFoodSavedKg * 2.5).toFixed(1)),
      totalMealsRescued,
      totalEcoPointsDistributed: users.reduce((acc, u) => acc + (Number(u.ecoPoints) || 0), 0)
    };

    statsCache = { at: Date.now(), value: stats };
    return stats;
  }
}

export const store = new Store();
