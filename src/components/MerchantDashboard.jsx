import { useState } from "react";
import { ArrowRight, CheckCircle2, Plus, QrCode, Store } from "lucide-react";
import { api } from "../lib/api.js";
import { QrCameraScanner } from "./QrCameraScanner.jsx";

export function MerchantDashboard({
  merchant,
  offers,
  orders,
  onRefresh,
  onOpenMyOffers
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Boulangerie");
  const [offerType, setOfferType] = useState("standard");
  const [originalPrice, setOriginalPrice] = useState("14.00");
  const [discountedPrice, setDiscountedPrice] = useState("5.50");
  const [quantity, setQuantity] = useState("5");
  const [weightKg, setWeightKg] = useState("0.8");
  const [pickupStart, setPickupStart] = useState("17h30");
  const [pickupEnd, setPickupEnd] = useState("19h30");
  const [formError, setFormError] = useState(null);
  const [savingOffer, setSavingOffer] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [qrResult, setQrResult] = useState(null);
  const [verifyingQr, setVerifyingQr] = useState(false);
  const [shopName, setShopName] = useState(merchant?.name || "");
  const [shopAddress, setShopAddress] = useState(merchant?.address || "");
  const [shopHours, setShopHours] = useState(merchant?.openingHours || "");
  const [shopMsg, setShopMsg] = useState(null);

  if (!merchant) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">Fiche commerçant introuvable pour ce compte.</p>
        </div>
      </section>
    );
  }

  const paidOrders = orders.filter((o) => o.status === "paid");
  const completedOrders = orders.filter((o) => o.status === "picked_up");
  const totalRevenue = [...paidOrders, ...completedOrders].reduce(
    (s, o) => s + (Number(o?.totalAmount) || 0),
    0
  );

  const resetOfferForm = () => {
    setImageUrl("");
    setTitle("");
    setDescription("");
    setOriginalPrice("14.00");
    setDiscountedPrice("5.50");
    setQuantity("5");
    setWeightKg("0.8");
    setFormError(null);
  };

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (title.trim().length < 3) {
      setFormError("Le titre de l’offre doit contenir au moins 3 caractères.");
      return;
    }
    if (description.trim().length < 5) {
      setFormError("La description est requise (min. 5 caractères).");
      return;
    }
    const orig = Number(originalPrice);
    const disc = Number(discountedPrice);
    const qty = Number(quantity);
    if (Number.isNaN(orig) || Number.isNaN(disc) || disc <= 0 || disc >= orig) {
      setFormError("Le prix réduit doit être strictement inférieur au prix initial (> 0).");
      return;
    }
    if (Number.isNaN(qty) || qty < 1) {
      setFormError("La quantité initiale doit être d’au moins 1.");
      return;
    }
    setSavingOffer(true);
    try {
      await api.createOffer({
        title,
        description,
        category,
        offerType,
        originalPrice: orig,
        discountedPrice: disc,
        quantity: qty,
        weightKg: Number(weightKg),
        imageUrl: imageUrl.trim() || undefined,
        pickupStart,
        pickupEnd
      });
      resetOfferForm();
      onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de la publication.");
    } finally {
      setSavingOffer(false);
    }
  };

  const handleVerifyQr = async (code) => {
    if (!code.trim()) return;
    setVerifyingQr(true);
    setQrResult(null);
    try {
      const res = await api.verifyQr(code);
      setQrResult({
        ok: true,
        msg: `Commande ${res.order.pickupCode} validée pour ${res.order.studentName} (+${res.order.ecoPointsAwarded} EcoPoints attribués).`
      });
      setQrInput("");
      onRefresh();
    } catch (err) {
      setQrResult({
        ok: false,
        msg: err instanceof Error ? err.message : "Code QR invalide."
      });
    } finally {
      setVerifyingQr(false);
    }
  };

  const handleSaveShop = async (e) => {
    e.preventDefault();
    setShopMsg(null);
    try {
      await api.updateMyMerchant({
        name: shopName,
        address: shopAddress,
        openingHours: shopHours
      });
      setShopMsg("Informations de l’établissement enregistrées.");
      onRefresh();
    } catch (err) {
      setShopMsg(err instanceof Error ? err.message : "Erreur mise à jour.");
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-800">
            Espace Commerçant · Statut :{" "}
            {merchant.status === "approved"
              ? "Établissement validé"
              : merchant.status === "pending"
                ? "En attente de validation administrateur"
                : "Refusé"}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            {merchant.name}
          </h2>
        </div>

        {onOpenMyOffers && (
          <button
            type="button"
            onClick={onOpenMyOffers}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:border-emerald-700 hover:text-emerald-800 cursor-pointer shrink-0"
          >
            Gérer mes offres ({offers.length})
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {merchant.status !== "approved" && (
        <div
          className={`mt-6 rounded-xl border p-4 text-sm ${
            merchant.status === "rejected"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          {merchant.status === "rejected"
            ? "Votre établissement a été refusé par l’administrateur ESSECT. Contactez l’administration pour plus d’informations."
            : "Votre commerce est actuellement en attente d’approbation par l’administrateur ESSECT. Dès validation, vos offres apparaîtront dans le catalogue étudiant."}
        </div>
      )}

      {/* Merchant KPI strip */}
      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Chiffre d’affaires généré</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {Number(totalRevenue ?? 0).toFixed(2)} TND
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Retraits QR en attente</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {paidOrders.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Offres publiées</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {offers.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Portions sauvées</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {merchant.totalMealsSaved}
          </p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: QR Validator + Publish Offer Form + Shop Info */}
        <div className="space-y-6 lg:col-span-5">
          {/* QR Validator */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <QrCode className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold text-slate-900">
                Validation QR au comptoir
              </h3>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Scannez le QR code présenté par l’étudiant ou saisissez son code court (ex :{" "}
              <span className="font-mono font-semibold">CS-4928</span>).
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="CS-4928 ou jeton QR..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-700 focus:outline-none"
              />
              <button
                type="button"
                disabled={verifyingQr || !qrInput.trim()}
                onClick={() => handleVerifyQr(qrInput)}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {verifyingQr ? "Validation..." : "Valider"}
              </button>
            </div>
            <QrCameraScanner
              disabled={verifyingQr}
              onDetected={(decoded) => handleVerifyQr(decoded)}
            />
            {qrResult && (
              <div
                className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${
                  qrResult.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {qrResult.msg}
              </div>
            )}
          </div>

          {/* Publish Offer Form */}
          <form
            onSubmit={handleOfferSubmit}
            className="rounded-xl border border-slate-200 bg-white p-6 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Publier une nouvelle offre
              </h3>
              {onOpenMyOffers && (
                <button
                  type="button"
                  onClick={onOpenMyOffers}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Voir Mes Offres
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Titre du produit</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Assortiment Croissants & Pain"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Description</label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Composition du lot ou du panier surprise..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                >
                  <option value="Boulangerie">Boulangerie</option>
                  <option value="Cafétéria">Cafétéria</option>
                  <option value="Plats cuisinés">Plats cuisinés</option>
                  <option value="Sandwichs">Sandwichs</option>
                  <option value="Pâtisserie">Pâtisserie</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Format</label>
                <select
                  value={offerType}
                  onChange={(e) => setOfferType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                >
                  <option value="standard">Offre classique</option>
                  <option value="surprise">Panier Surprise</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Prix initial (TND)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  required
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Prix réduit (TND)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  required
                  value={discountedPrice}
                  onChange={(e) => setDiscountedPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Quantité</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Début retrait</label>
                <input
                  type="text"
                  required
                  value={pickupStart}
                  onChange={(e) => setPickupStart(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Fin retrait</label>
                <input
                  type="text"
                  required
                  value={pickupEnd}
                  onChange={(e) => setPickupEnd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                URL de la photo (optionnel)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... (image automatique par catégorie sinon)"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={savingOffer || merchant.status !== "approved"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {savingOffer ? "Enregistrement..." : "Publier l’offre"}
            </button>
          </form>

          {/* Shop Info Form */}
          <form
            onSubmit={handleSaveShop}
            className="rounded-xl border border-slate-200 bg-white p-6 space-y-3"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Store className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Fiche établissement
              </h3>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Nom commercial</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Adresse</label>
              <input
                type="text"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Horaires</label>
              <input
                type="text"
                value={shopHours}
                onChange={(e) => setShopHours(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
            {shopMsg && <p className="text-xs font-medium text-emerald-700">{shopMsg}</p>}
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 cursor-pointer"
            >
              Mettre à jour la fiche
            </button>
          </form>
        </div>

        {/* Right: Orders Queue (sans le catalogue dupliqué) */}
        <div className="space-y-8 lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Commandes à remettre ({orders.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">
                  Aucune commande reçue pour l’instant.
                </p>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-mono text-xs font-semibold text-slate-500">
                        {order.pickupCode || order.id} · {order.pickupWindow}
                      </p>
                      <p className="font-semibold text-slate-900">{order.studentName}</p>
                      <p className="text-xs text-slate-600">
                        {order.items.map((i) => `${i.quantity}× ${i.title}`).join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {Number(order?.totalAmount ?? 0).toFixed(2)} TND
                      </span>
                      {order.status === "paid" && order.pickupCode ? (
                        <button
                          type="button"
                          onClick={() => handleVerifyQr(order.pickupCode)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Valider retrait
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">
                          {order.status === "picked_up" ? "Remise effectuée" : order.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}