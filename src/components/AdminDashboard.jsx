import { Check, ShieldAlert, X } from "lucide-react";
import { api } from "../lib/api.js";
export function AdminDashboard({
  stats,
  merchants,
  users,
  orders,
  onRefresh
}) {
  const handleMerchantStatus = async (id, status) => {
    await api.adminSetMerchantStatus(id, status);
    onRefresh();
  };
  const handleToggleUser = async (user) => {
    await api.adminSetUserStatus(user.id, !user.active);
    onRefresh();
  };
  return <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-medium text-emerald-800">
          Supervision Plateforme · ESSECT Administration
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Tableau de bord Administrateur
        </h2>
      </div>

      {
    /* Platform KPI grid */
  }
      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Utilisateurs inscrits</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {stats?.totalUsers ?? users.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {stats?.totalStudents ?? 0} étudiants · {stats?.totalMerchants ?? 0} commerces
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Commerces à valider</p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-700 tabular-nums">
            {stats?.pendingMerchants ?? 0}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {stats?.approvedMerchants ?? 0} approuvés
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Volume d’affaires Konnect</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {(stats?.totalRevenueTnd ?? 0).toFixed(2)} TND
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {stats?.paidOrPickedUpOrders ?? 0} commandes réglées
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Impact CO₂ campus</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {(stats?.totalCo2AvoidedKg ?? 0).toFixed(1)} kg
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {(stats?.totalFoodSavedKg ?? 0).toFixed(1)} kg d’invendus sauvés
          </p>
        </div>
      </div>

      {
    /* Merchant Approvals */
  }
      <div className="mt-10 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="font-display text-lg font-bold text-slate-900">
            Validation des commerces partenaires ({merchants.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Établissement</th>
                <th className="px-4 py-3 font-medium">Catégorie</th>
                <th className="px-4 py-3 font-medium">Adresse</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-6 py-3 font-medium text-right">Décision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {merchants.map((m) => <tr key={m.id}>
                  <td className="px-6 py-3.5 font-semibold text-slate-900">{m.name}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{m.category}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{m.address}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold">
                    <span
    className={m.status === "approved" ? "text-emerald-700" : m.status === "pending" ? "text-amber-700" : "text-red-600"}
  >
                      {m.status === "approved" ? "Approuv\xE9" : m.status === "pending" ? "En attente" : "Rejet\xE9"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      {m.status !== "approved" && <button
    type="button"
    onClick={() => handleMerchantStatus(m.id, "approved")}
    className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
  >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Valider
                        </button>}
                      {m.status !== "rejected" && <button
    type="button"
    onClick={() => handleMerchantStatus(m.id, "rejected")}
    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-red-500 hover:text-red-600 cursor-pointer"
  >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          Rejeter
                        </button>}
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {
    /* Users & Orders */
  }
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-6">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Comptes utilisateurs ({users.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {users.map((u) => <div key={u.id} className="flex items-center justify-between gap-4 px-6 py-3.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {u.role} · {u.email}
                  </p>
                </div>
                {u.role !== "admin" && <button
    type="button"
    onClick={() => handleToggleUser(u)}
    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold shrink-0 cursor-pointer ${u.active ? "border-slate-300 text-slate-700 hover:text-red-600" : "border-emerald-700 text-emerald-700"}`}
  >
                    <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                    {u.active ? "Suspendre" : "R\xE9activer"}
                  </button>}
              </div>)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-6">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Supervision des commandes ({orders.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 8).map((o) => <div key={o.id} className="flex items-center justify-between gap-4 px-6 py-3.5 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">
                    {o.studentName} → {o.merchantName}
                  </p>
                  <p className="font-mono text-xs text-slate-500">
                    {o.pickupCode || o.id} · {o.status}
                  </p>
                </div>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {Number(o?.totalAmount ?? 0).toFixed(2)} TND
                </span>
              </div>)}
          </div>
        </div>
      </div>
    </section>;
}
