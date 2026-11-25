import { useState } from "react";
import { Clock, MapPin, Navigation, Store } from "lucide-react";

const STATUS_LABELS = {
  approved: { text: "Établissement validé", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  pending: { text: "En attente de validation", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  rejected: { text: "Refusé", cls: "bg-red-50 text-red-700 border-red-200" }
};

export function CampusRadarView({
  merchants,
  offers,
  user = null,
  currentMerchant = null,
  onSelectMerchantOffers
}) {
  const [selectedId, setSelectedId] = useState(merchants[0]?.id || "");
  const selected = merchants.find((m) => m.id === selectedId) || merchants[0];

  const isStudentOrGuest = !user || user.role === "student";
  const isMerchant = user?.role === "merchant";
  const isAdmin = user?.role === "admin";
  const isOwnStore = isMerchant && selected && currentMerchant?.id === selected.id;

  const merchantOffers = selected
    ? offers.filter((o) => o.merchantId === selected.id && o.quantity > 0)
    : [];

  const statusMeta = selected ? STATUS_LABELS[selected.status] || STATUS_LABELS.approved : null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-medium text-emerald-800">
          Fonctionnalité Bonus · Géolocalisation de proximité
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Campus Radar — Autour de l’ESSECT Montfleury
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Repérez en un coup d’œil les boulangeries, cafétérias et restaurants partenaires à
          moins de 5 minutes à pied du campus.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Interactive Spatial Campus Map */}
        <div className="lg:col-span-7">
          <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-slate-200 bg-[#EEF2EE]">
            <svg
              viewBox="0 0 800 480"
              className="h-full w-full"
              role="img"
              aria-label="Carte Campus Radar autour de l'ESSECT Montfleury"
            >
              <rect x="40" y="30" width="210" height="140" rx="8" fill="#E4E9E4" />
              <rect x="290" y="30" width="220" height="140" rx="8" fill="#E4E9E4" />
              <rect x="550" y="30" width="210" height="140" rx="8" fill="#E4E9E4" />
              <rect x="40" y="210" width="210" height="230" rx="8" fill="#E4E9E4" />
              <rect
                x="290"
                y="210"
                width="220"
                height="120"
                rx="8"
                fill="#DCE6DC"
                stroke="#15803D"
                strokeWidth="1.5"
              />
              <rect x="550" y="210" width="210" height="230" rx="8" fill="#E4E9E4" />

              <line x1="0" y1="190" x2="800" y2="190" stroke="#FFFFFF" strokeWidth="14" />
              <line x1="270" y1="0" x2="270" y2="480" stroke="#FFFFFF" strokeWidth="12" />
              <line x1="530" y1="0" x2="530" y2="480" stroke="#FFFFFF" strokeWidth="12" />

              <circle
                cx="400"
                cy="270"
                r="115"
                fill="none"
                stroke="#15803D"
                strokeOpacity="0.25"
                strokeDasharray="6 6"
              />
              <circle
                cx="400"
                cy="270"
                r="215"
                fill="none"
                stroke="#15803D"
                strokeOpacity="0.18"
                strokeDasharray="6 6"
              />

              <text x="58" y="185" fill="#64748B" fontSize="11" fontFamily="Plus Jakarta Sans">
                Rue Abou Kacem Chebbi
              </text>
              <text x="545" y="185" fill="#64748B" fontSize="11" fontFamily="Plus Jakarta Sans">
                Avenue Ali Trad
              </text>
              <text
                x="345"
                y="274"
                fill="#14532D"
                fontSize="13"
                fontWeight="700"
                fontFamily="Bricolage Grotesque"
              >
                Campus ESSECT
              </text>
            </svg>

            {merchants.map((merchant) => {
              const active = selected?.id === merchant.id;
              const activeCount = offers.filter(
                (o) => o.merchantId === merchant.id && o.quantity > 0
              ).length;
              return (
                <button
                  key={merchant.id}
                  type="button"
                  onClick={() => setSelectedId(merchant.id)}
                  style={{ left: `${merchant.mapX}%`, top: `${merchant.mapY}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-3 py-1.5 text-left shadow-sm transition-transform cursor-pointer ${
                    active
                      ? "z-20 scale-105 border-emerald-800 bg-emerald-700 text-white"
                      : "z-10 border-slate-300 bg-white text-slate-900 hover:border-emerald-700"
                  }`}
                >
                  <p className="text-xs font-semibold whitespace-nowrap">{merchant.name}</p>
                  <p
                    className={`font-mono text-[11px] tabular-nums ${
                      active ? "text-emerald-100" : "text-slate-500"
                    }`}
                  >
                    {merchant.distanceMeters} m
                    {!isMerchant || merchant.id === currentMerchant?.id
                      ? ` · ${activeCount} offre(s)`
                      : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Merchant Panel */}
        <div className="lg:col-span-5">
          {selected ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-emerald-800">
                    {selected.category} · {selected.walkMinutes} min à pied
                  </p>
                  <h3 className="mt-1 font-display text-xl font-bold text-slate-900">
                    {selected.name}
                  </h3>
                </div>
                <span className="font-mono text-sm font-semibold text-slate-700 tabular-nums">
                  {Number(selected?.rating ?? 0).toFixed(1)} / 5
                </span>
              </div>

              {isAdmin && statusMeta && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusMeta.cls}`}
                  >
                    {statusMeta.text}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {selected.totalMealsSaved ?? 0} portions sauvées
                  </span>
                </div>
              )}

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {selected.description}
              </p>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span>{selected.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span className="font-mono">{selected.openingHours}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span className="font-mono tabular-nums">
                    {selected.distanceMeters} mètres depuis l’entrée ESSECT
                  </span>
                </div>
              </div>

              {isStudentOrGuest && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-800">
                    Offres disponibles ({merchantOffers.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {merchantOffers.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Aucune offre active en ce moment dans cet établissement.
                      </p>
                    ) : (
                      merchantOffers.map((off) => (
                        <div
                          key={off.id}
                          className="flex items-center justify-between border-b border-slate-100 py-2 text-xs last:border-b-0"
                        >
                          <span className="font-medium text-slate-800 truncate pr-2">
                            {off.title}
                          </span>
                          <span className="font-mono font-semibold text-emerald-800 shrink-0 tabular-nums">
                            {Number(off?.discountedPrice ?? 0).toFixed(2)} TND
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectMerchantOffers(selected.id)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                  >
                    <Store className="h-4 w-4" aria-hidden="true" />
                    Voir toutes les offres de ce commerce
                  </button>
                </div>
              )}

              {isOwnStore && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => onSelectMerchantOffers(selected.id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                  >
                    <Store className="h-4 w-4" aria-hidden="true" />
                    Gérer mes offres
                  </button>
                </div>
              )}

              {isMerchant && !isOwnStore && (
                <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  Fiche partenaire en lecture seule.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}