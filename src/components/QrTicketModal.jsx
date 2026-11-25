import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Clock, MapPin, X } from "lucide-react";
export function QrTicketModal({ order, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  useEffect(() => {
    if (!order || !order.qrToken) return;
    const payload = JSON.stringify({
      orderId: order.id,
      qrToken: order.qrToken,
      pickupCode: order.pickupCode,
      merchantId: order.merchantId
    });
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" }
    }).then((url) => setQrDataUrl(url)).catch(() => setQrDataUrl(""));
  }, [order]);
  if (!order) return null;
  return <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    role="dialog"
    aria-modal="true"
  >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-medium text-emerald-800">Ticket de retrait CampusSave</p>
            <h3 className="mt-0.5 font-display text-xl font-bold text-slate-900">
              {order.merchantName}
            </h3>
          </div>
          <button
    type="button"
    onClick={onClose}
    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
    aria-label="Fermer"
  >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center text-center">
          {qrDataUrl ? <div className="rounded-xl border border-slate-200 bg-white p-3">
              <img
    src={qrDataUrl}
    alt={`QR Code retrait ${order.pickupCode}`}
    className="h-52 w-52"
    referrerPolicy="no-referrer"
  />
            </div> : <div className="flex h-52 w-52 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
              Génération QR...
            </div>}

          <p className="mt-4 font-mono text-2xl font-bold tracking-wider text-slate-900 tabular-nums">
            {order.pickupCode}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">{order.qrToken}</p>

          {order.status === "picked_up" ? <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Retrait validé · +{order.ecoPointsAwarded} EcoPoints attribués
            </div> : <p className="mt-3 text-xs text-slate-600">
              Présentez ce QR code au comptoir lors de la récupération pour débloquer vos EcoPoints.
            </p>}
        </div>

        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Créneau de retrait
            </span>
            <span className="font-mono font-medium text-slate-900">{order.pickupWindow}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Adresse
            </span>
            <span className="font-medium text-slate-900">{order.merchantAddress}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Référence Konnect Test</span>
            <span className="font-mono text-slate-900">{order.paymentRef}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total payé</span>
            <span className="font-mono font-semibold text-emerald-800 tabular-nums">
              {Number(order?.totalAmount ?? 0).toFixed(2)} TND
            </span>
          </div>
        </div>
      </div>
    </div>;
}
