import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Lock,
  ShieldCheck,
  Smartphone,
  Wallet
} from "lucide-react";
import { auth } from "../lib/firebase.js";

const PAYMENT_METHODS = [
  {
    id: "konnect_wallet",
    label: "Konnect Wallet",
    subtitle: "Paiement instantané via portefeuille Konnect",
    icon: Wallet
  },
  {
    id: "konnect_card",
    label: "Carte Bancaire (CIB / Visa / Mastercard)",
    subtitle: "Passerelle sécurisée Konnect Sandbox",
    icon: CreditCard
  },
  {
    id: "konnect_edinar",
    label: "Carte e-Dinar",
    subtitle: "La Poste Tunisienne · Mode test",
    icon: Smartphone
  }
];

export function KonnectModal({ order, onClose, onPaid }) {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [method, setMethod] = useState("konnect_wallet");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!order) {
      setSession(null);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingSession(true);
      setError(null);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/payments/konnect/init", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ orderId: order.id })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Impossible d’initialiser la session Konnect.");
        }
        if (!cancelled) setSession(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur d’initialisation Konnect.");
        }
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [order]);

  if (!order) return null;

  const handleConfirm = async (e) => {
    e.preventDefault();
    setConfirming(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/payments/konnect/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ orderId: order.id, method })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec du paiement Konnect.");
      }
      await onPaid(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du paiement Konnect.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#F8F9F7]"
      role="dialog"
      aria-modal="true"
      aria-label="Passerelle de paiement Konnect"
    >
      {/* En-tête Konnect */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            type="button"
            disabled={confirming}
            onClick={onClose}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Payer plus tard
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Konnect Test Network · Sandbox
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Colonne gauche : Récapitulatif commande */}
          <div className="lg:col-span-5">
            <div className="rounded-xl bg-slate-900 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                {session?.gateway || "Konnect Test Network"}
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tabular-nums">
                {Number(order.totalAmount ?? 0).toFixed(2)} TND
              </p>
              <p className="mt-1 font-mono text-xs text-slate-300 tabular-nums">
                {session
                  ? `${session.amountMillimes} millimes · Réf. ${session.sessionRef}`
                  : "Initialisation de la session..."}
              </p>

              <div className="mt-5 border-t border-slate-700 pt-4 text-sm">
                <p className="font-semibold text-white">{order.merchantName}</p>
                <p className="mt-0.5 text-xs text-slate-300">
                  Retrait : {order.pickupWindow}
                </p>
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-slate-800 pt-3 text-xs text-slate-300">
                    {order.items.map((item) => (
                      <li key={item.offerId} className="flex justify-between gap-2">
                        <span>
                          {item.quantity}× {item.title}
                        </span>
                        <span className="font-mono tabular-nums">
                          {(item.unitPrice * item.quantity).toFixed(2)} TND
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Colonne droite : Choix du moyen de paiement et confirmation */}
          <div className="lg:col-span-7">
            <form
              onSubmit={handleConfirm}
              className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
            >
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Finaliser le paiement Konnect
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Sélectionnez votre mode de règlement pour générer immédiatement votre
                  ticket QR de retrait.
                </p>
              </div>

              {loadingSession ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                  Connexion à la passerelle Konnect...
                </div>
              ) : (
                <div className="space-y-2.5">
                  {PAYMENT_METHODS.map((item) => {
                    const Icon = item.icon;
                    const active = method === item.id;
                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                          active
                            ? "border-emerald-700 bg-emerald-50/50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="konnectMethod"
                          value={item.id}
                          checked={active}
                          onChange={() => setMethod(item.id)}
                          className="accent-emerald-700"
                        />
                        <Icon
                          className={`h-5 w-5 shrink-0 ${
                            active ? "text-emerald-700" : "text-slate-500"
                          }`}
                          aria-hidden="true"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.label}
                          </p>
                          <p className="text-xs text-slate-500">{item.subtitle}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <span>
                  Environnement Sandbox : aucun débit bancaire réel ne sera effectué.
                </span>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={confirming}
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loadingSession || confirming || !session}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                >
                  {confirming
                    ? "Validation Konnect..."
                    : `Confirmer le paiement (${Number(order.totalAmount ?? 0).toFixed(2)} TND)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}