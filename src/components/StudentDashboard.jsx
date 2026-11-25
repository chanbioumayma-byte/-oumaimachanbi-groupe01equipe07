import { useState } from "react";
import { Bell, Leaf, QrCode, UserCheck } from "lucide-react";
import { api } from "../lib/api.js";
const STATUS_LABELS = {
  pending_payment: "En attente de paiement",
  paid: "Pay\xE9e \xB7 Pr\xEAte au retrait",
  picked_up: "R\xE9cup\xE9r\xE9e",
  cancelled: "Annul\xE9e"
};
export function StudentDashboard({
  user,
  orders,
  notifications,
  onRefresh,
  onUserUpdated,
  onOpenQr,
  onPayOrder
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [cardId, setCardId] = useState(user.studentCardId || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null); // { type: "ok" | "err", text: string } 
  const co2Saved = (Number(user?.foodSavedKg ?? 0) * 2.5).toFixed(1);
  const ecoPoints = Number(user?.ecoPoints ?? 0);
  const tierName = ecoPoints >= 300 ? "Ambassadeur ESSECT" : ecoPoints >= 150 ? "Gardien Anti-Gaspi" : "Éco-Initié";
  const nextGoal = ecoPoints >= 300 ? 500 : ecoPoints >= 150 ? 300 : 150;
  const progressPct = Math.min(100, Math.round((ecoPoints / nextGoal) * 100));
const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileStatus(null);
    if (name.trim().length < 2) {
      setProfileStatus({ type: "err", text: "Le nom complet doit contenir au moins 2 caractères." });
      return;
    }
    if (phone.replace(/\D/g, "").length < 8) {
      setProfileStatus({ type: "err", text: "Numéro de téléphone invalide (min. 8 chiffres)." });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        studentCardId: cardId.trim()
      });
      onUserUpdated(res.user);
      setProfileStatus({ type: "ok", text: "Profil mis à jour avec succès." });
    } catch (err) {
      setProfileStatus({
        type: "err",
        text: err instanceof Error ? err.message : "Erreur de mise à jour."
      });
    } finally {
      setSavingProfile(false);
    }
  };
const handleCancel = async (orderId) => {
    try {
      await api.cancelOrder(orderId);
      onRefresh();
    } catch {
      onRefresh();
    }
  };
  const handleReadNotif = async (id) => {
    try {
      await api.markNotificationRead(id);
      onRefresh();
    } catch {
      /* ignore */
    }
  };
  return <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-medium text-emerald-800">
          Espace Étudiant ESSECT · {user.studentCardId || "Carte v\xE9rifi\xE9e"}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Bonjour {user.name.split(" ")[0]}, voici votre impact & vos réservations
        </h2>
      </div>

      {
    /* Personal Impact & EcoPoints Metrics */
  }
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Solde EcoPoints</p>
        <p className="mt-1 font-mono text-3xl font-bold text-emerald-700 tabular-nums">
            {ecoPoints}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-700">{tierName}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
    className="h-full bg-emerald-700 transition-all"
    style={{ width: `${progressPct}%` }}
  />
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-slate-500 tabular-nums">
            Prochain palier : {nextGoal} pts
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Repas sauvés</p>
        <p className="mt-1 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {Number(user?.mealsRescued ?? 0)}
           </p>
          <p className="mt-1 text-xs text-slate-500">Validés par QR code</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Nourriture sauvée & CO₂ évité</p>
          <p className="mt-1 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {Number(user?.foodSavedKg ?? 0).toFixed(1)} kg
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-800 font-mono tabular-nums">
            <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
            {co2Saved} kg CO₂ évités
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Économies réalisées</p>
          <p className="mt-1 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {Number(user?.moneySavedTnd ?? 0).toFixed(2)} TND
          </p>
          <p className="mt-1 text-xs text-slate-500">Par rapport au tarif initial</p>
        </div>
      </div>

      {
    /* Orders table + Profile/Notifications */
  }
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Mes réservations & tickets QR
              </h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {orders.length} commande(s)
              </span>
            </div>

            {orders.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">
                Vous n’avez pas encore effectué de réservation sur CampusSave.
              </div> : <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Commerce & Articles</th>
                      <th className="px-4 py-3 font-medium">Créneau</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 font-medium text-right">Montant</th>
                      <th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => <tr key={order.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5">
                          <p className="font-semibold text-slate-900">{order.merchantName}</p>
                          <p className="text-xs text-slate-500">
                            {order.items.map((i) => `${i.quantity}\xD7 ${i.title}`).join(", ")}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {order.pickupWindow}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-medium whitespace-nowrap">
                          <span
    className={order.status === "picked_up" ? "text-emerald-700" : order.status === "paid" ? "text-slate-900" : order.status === "cancelled" ? "text-red-600" : "text-amber-700"}
  >
                            {STATUS_LABELS[order.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {Number(order?.totalAmount ?? 0).toFixed(2)} TND
                        </td>
                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {order.status === "pending_payment" && <>
                                <button
    type="button"
    onClick={() => onPayOrder(order)}
    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
  >
                                  Payer Konnect
                                </button>
                                <button
    type="button"
    onClick={() => handleCancel(order.id)}
    className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:text-red-600 cursor-pointer"
  >
                                  Annuler
                                </button>
                              </>}
                            {(order.status === "paid" || order.status === "picked_up") && <button
    type="button"
    onClick={() => onOpenQr(order)}
    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:border-emerald-700 cursor-pointer"
  >
                                <QrCode className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                                Ticket QR ({order.pickupCode})
                              </button>}
                          </div>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>}
          </div>
        </div>

        {
    /* Right column: Notifications + Profile */
  }
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Bell className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Notifications (FCM)
              </h3>
            </div>
            <div className="mt-3 space-y-3">
              {notifications.length === 0 ? <p className="text-xs text-slate-500">Aucune notification récente.</p> : notifications.slice(0, 5).map((n) => <div
    key={n.id}
    className={`border-b border-slate-100 pb-3 text-xs last:border-b-0 ${n.read ? "opacity-65" : ""}`}
  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{n.title}</p>
                      {!n.read && <button
    type="button"
    onClick={() => handleReadNotif(n.id)}
    className="text-[11px] font-medium text-emerald-700 hover:underline shrink-0 cursor-pointer"
  >
                          Lu
                        </button>}
                    </div>
                    <p className="mt-1 text-slate-600">{n.body}</p>
                  </div>)}
            </div>
          </div>

          <form
    onSubmit={handleSaveProfile}
    className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
  >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Profil étudiant
              </h3>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Nom complet</label>
              <input
    type="text"
    required
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
  />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Téléphone</label>
              <input
    type="tel"
    required
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
  />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">N° Carte ESSECT</label>
              <input
    type="text"
    value={cardId}
    onChange={(e) => setCardId(e.target.value)}
    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
  />
            </div>
            {profileStatus && (
              <p
                className={`text-xs font-medium ${
                  profileStatus.type === "ok" ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {profileStatus.text}
              </p>
            )}
            <button
    type="submit"
    disabled={savingProfile}
    className="w-full rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
  >
              {savingProfile ? "Enregistrement..." : "Mettre \xE0 jour le profil"}
            </button>
          </form>
        </div>
      </div>
    </section>;
}
