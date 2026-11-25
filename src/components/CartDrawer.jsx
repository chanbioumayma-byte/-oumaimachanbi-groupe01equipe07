import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
export function CartDrawer({
  open,
  items,
  onClose,
  onUpdateQty,
  onRemove,
  onCheckout,
  submitting,
  error
}) {
  if (!open) return null;
  const subtotal = items.reduce((s, i) => s + i.offer.discountedPrice * i.quantity, 0);
  const original = items.reduce((s, i) => s + i.offer.originalPrice * i.quantity, 0);
  const savings = Math.max(0, original - subtotal);
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div
    className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
    role="dialog"
    aria-modal="true"
    aria-label="Panier de réservation"
  >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-slate-900">Votre réservation</h2>
          </div>
          <button
    type="button"
    onClick={onClose}
    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
    aria-label="Fermer le panier"
  >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="h-10 w-10 text-slate-300" aria-hidden="true" />
              <p className="mt-3 font-display text-base font-semibold text-slate-900">
                Votre panier est vide
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Sélectionnez une offre alimentaire ou un Panier Surprise pour générer votre ticket QR.
              </p>
            </div> : <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Établissement :{" "}
                <span className="font-semibold text-slate-900">
                  {items[0].offer.merchantName}
                </span>
              </p>

              {items.map(({ offer, quantity }) => <div
    key={offer.id}
    className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4"
  >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{offer.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Retrait {offer.pickupStart} – {offer.pickupEnd}
                    </p>
                    <p className="mt-1 font-mono text-xs font-semibold text-emerald-800 tabular-nums">
                      {(offer.discountedPrice * quantity).toFixed(2)} TND
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
    type="button"
    onClick={() => onUpdateQty(offer.id, -1)}
    className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 cursor-pointer"
    aria-label="Diminuer la quantité"
  >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center font-mono text-sm font-semibold tabular-nums">
                      {quantity}
                    </span>
                    <button
    type="button"
    disabled={quantity >= offer.quantity}
    onClick={() => onUpdateQty(offer.id, 1)}
    className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
    aria-label="Augmenter la quantité"
  >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
    type="button"
    onClick={() => onRemove(offer.id)}
    className="ml-1 rounded-md p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
    aria-label="Supprimer l'article"
  >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>)}
            </div>}
        </div>

        {items.length > 0 && <div className="border-t border-slate-200 bg-slate-50 px-6 py-5">
            {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </div>}

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Valeur initiale</span>
                <span className="font-mono line-through tabular-nums">{original.toFixed(2)} TND</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-medium">
                <span>Économie réalisée</span>
                <span className="font-mono tabular-nums">-{savings.toFixed(2)} TND</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>Total à payer (Konnect)</span>
                <span className="font-mono tabular-nums">{subtotal.toFixed(2)} TND</span>
              </div>
            </div>

            <button
    type="button"
    disabled={submitting}
    onClick={onCheckout}
    className="mt-4 w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer"
  >
              {submitting ? "Cr\xE9ation de la commande..." : "Payer avec Konnect (Test)"}
            </button>
          </div>}
      </div>
    </div>;
}
