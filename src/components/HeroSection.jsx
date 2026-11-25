import { useState } from "react";
import { ArrowRight, MapPin, UtensilsCrossed } from "lucide-react";
export function HeroSection({
  stats,
  onExploreOffers,
  onOpenRadar
}) {
  const [imgError, setImgError] = useState(false);
  return <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          {
    /* Left column */
  }
          <div className="flex flex-col justify-between lg:col-span-6 lg:py-2">
            <div>
              <p className="text-xs font-medium tracking-wide text-emerald-800">
                ESSECT Montfleury · Réseau Solidaire Anti-Gaspillage
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl text-balance leading-[1.1]">
                Sauvez les repas du campus avant la fermeture
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                CampusSave relie les étudiants de l’ESSECT aux boulangeries, cafétérias et
                restaurants du quartier. Réservez les invendus du jour jusqu’à -65%, payez
                avec Konnect et retirez votre commande par QR code.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
    type="button"
    onClick={onExploreOffers}
    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
  >
                Explorer les offres
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
    type="button"
    onClick={onOpenRadar}
    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
  >
                <MapPin className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                Voir Campus Radar
              </button>
            </div>
          </div>

          {
    /* Right column: full-height editorial photograph */
  }
          <div className="lg:col-span-6">
            <div className="relative h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-80 lg:h-full lg:min-h-[340px]">
              {!imgError ? <img
    src="/images/hero_campus_food_1795344519494.jpg"
    alt="Assortiment de viennoiseries, bols méditerranéens et sacs kraft anti-gaspillage près de l'ESSECT"
    className="h-full w-full object-cover"
    referrerPolicy="no-referrer"
    onError={() => setImgError(true)}
  /> : <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 p-6 text-center">
                  <UtensilsCrossed className="h-10 w-10 text-emerald-700" aria-hidden="true" />
                  <p className="mt-2 font-display text-lg font-semibold text-slate-800">
                    CampusSave ESSECT Montfleury
                  </p>
                </div>}
            </div>
          </div>
        </div>

        {
    /* Full-width 4-column Impact Strip below Hero */
  }
        <div className="mt-10 grid grid-cols-2 gap-6 border-t border-slate-200 pt-8 md:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Repas sauvés</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {stats ? (stats.totalMealsRescued ?? 0) : "261"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Portions distribuées</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Aliments préservés</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {stats ? `${Number(stats.totalFoodSavedKg ?? 0).toFixed(1)} kg` : "130.8 kg"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Invendus valorisés</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">CO₂ évité</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-emerald-800 tabular-nums">
              {stats ? `${Number(stats.totalCo2AvoidedKg ?? 0).toFixed(1)} kg` : "327.0 kg"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Bilan carbone campus</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Économies étudiantes</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {stats ? `${Number(stats.totalMoneySavedTnd ?? 0).toFixed(0)} TND` : "1 445 TND"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Budget préservé</p>
          </div>
        </div>
      </div>
    </section>;
}
