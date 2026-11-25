import { auth } from "./firebase.js";

// Chaque requête joint l'ID token Firebase de l'utilisateur connecté (renouvelé automatiquement).
async function request(path, options) {
  const headers = {
    "Content-Type": "application/json",
    ...options?.headers
  };
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Erreur serveur (${res.status})`);
    err.code = data.code;
    throw err;
  }
  return data;
}
export const api = {
  register(payload) {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  me() {
    return request("/api/auth/me");
  },
  updateProfile(patch) {
    return request("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(patch)
    });
  },
  listMerchants() {
    return request("/api/merchants");
  },
  getMyMerchant() {
    return request("/api/merchants/mine");
  },
  updateMyMerchant(patch) {
    return request("/api/merchants/mine", {
      method: "PATCH",
      body: JSON.stringify(patch)
    });
  },
  listOffers(params) {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.category && params.category !== "Toutes") sp.set("category", params.category);
    if (params?.merchantId) sp.set("merchantId", params.merchantId);
    if (params?.maxPrice) sp.set("maxPrice", params.maxPrice);
    if (params?.type && params.type !== "all") sp.set("type", params.type);
    if (params?.onlyAvailable) sp.set("onlyAvailable", "true");
    const qs = sp.toString();
    return request(`/api/offers${qs ? `?${qs}` : ""}`);
  },
  listMyOffers() {
    return request("/api/offers/mine");
  },
  createOffer(payload) {
    return request("/api/offers", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateOffer(id, patch) {
    return request(`/api/offers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    });
  },
  deleteOffer(id) {
    return request(`/api/offers/${id}`, {
      method: "DELETE"
    });
  },
  listOrders() {
    return request("/api/orders");
  },
  createOrder(items) {
    return request("/api/orders", {
      method: "POST",
      body: JSON.stringify({ items })
    });
  },
  cancelOrder(orderId) {
    return request(`/api/orders/${orderId}/cancel`, {
      method: "PATCH"
    });
  },
  initKonnect(orderId) {
    return request("/api/payments/konnect/init", {
      method: "POST",
      body: JSON.stringify({ orderId })
    });
  },
  confirmKonnect(orderId, method) {
    return request("/api/payments/konnect/confirm", {
      method: "POST",
      body: JSON.stringify({ orderId, method })
    });
  },
  verifyQr(code) {
    return request("/api/orders/verify-qr", {
      method: "POST",
      body: JSON.stringify({ code })
    });
  },
  listNotifications() {
    return request("/api/notifications");
  },
  markNotificationRead(id) {
    return request(`/api/notifications/${id}/read`, {
      method: "PATCH"
    });
  },
  registerFcmToken(token) {
    return request("/api/notifications/token", {
      method: "POST",
      body: JSON.stringify({ token })
    });
  },
  getPlatformStats() {
    return request("/api/stats/platform");
  },
  adminListMerchants() {
    return request("/api/admin/merchants");
  },
  adminSetMerchantStatus(id, status) {
    return request(`/api/admin/merchants/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },
  adminListUsers() {
    return request("/api/admin/users");
  },
  adminSetUserStatus(id, active) {
    return request(`/api/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ active })
    });
  }
};
