import { useState } from "react";
import {
  PackageCheck,
  Pencil,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  Utensils,
  X
} from "lucide-react";

const CATEGORIES = [
  "Toutes",
  "Boulangerie",
  "Plats cuisinés",
  "Sandwichs",
  "Cafétéria",
  "Pâtisserie"
];

function OfferCard({
  offer,
  onAddToCart,
  canReserve,
  isMerchantOwner,
  isAdmin,
  onEdit,
  onRequestDelete
}) {
  const [imgErr, setImgErr] = useState(false);
  const discountPct =
    offer.originalPrice > 0
      ? Math.round(((offer.originalPrice - offer.discountedPrice) / offer.originalPrice) * 100)
      : 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-sm">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {!imgErr && offer.imageUrl ? (
          <img
            src={offer.imageUrl}
            alt={offer.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-emerald-50 text-slate-500">
            <Utensils className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            <span className="mt-2 text-xs font-medium">{offer.category}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium text-emerald-800">
              {offer.offerType === "surprise" ? "Panier Surprise" : offer.category}
            </span>
            <span aria-hidden="true">·</span>
            <span>{offer.merchantName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{offer.distanceMeters} m</span>
          </div>

          <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-slate-900">
            {offer.title}
          </h3>

          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {offer.description}
          </p>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono tabular-nums">
              Retrait {offer.pickupStart} – {offer.pickupEnd}
            </span>
            <span className="font-mono tabular-nums">
              {offer.quantity > 0 ? `${offer.quantity} restants` : "Épuisé"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                {Number(offer?.discountedPrice ?? 0).toFixed(2)} TND
              </span>
              <span className="font-mono text-xs text-slate-400 line-through tabular-nums">
                {Number(offer?.originalPrice ?? 0).toFixed(2)} TND
              </span>
              <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                -{discountPct}%
              </span>
            </div>

            {canReserve && (
              <button
                type="button"
                disabled={offer.quantity <= 0}
                onClick={() => onAddToCart(offer)}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {offer.quantity > 0 ? "Réserver" : "Indisponible"}
              </button>
            )}

            {isMerchantOwner && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onEdit(offer)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDelete(offer)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Supprimer
                </button>
              </div>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => onRequestDelete(offer)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function MarketplaceView({
  offers,
  merchants,
  loading,
  mode,
  user = null,
  currentMerchant = null,
  canReserve = true,
  cartCount = 0,
  onOpenCart,
  onAddToCart,
  onUpdateOffer,
  onDeleteOffer,
  offerTypeFilter = "all",
  onOfferTypeChange,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedMerchantId,
  onMerchantChange,
  maxPrice,
  onMaxPriceChange
}) {
  const isMerchant = user?.role === "merchant";
  const isAdmin = user?.role === "admin";
  const showStudentCart = (!user || user.role === "student") && canReserve;

  const [editingOffer, setEditingOffer] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("Boulangerie");
  const [editOfferType, setEditOfferType] = useState("standard");
  const [editOrigPrice, setEditOrigPrice] = useState("");
  const [editDiscPrice, setEditDiscPrice] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editPickupStart, setEditPickupStart] = useState("");
  const [editPickupEnd, setEditPickupEnd] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editError, setEditError] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [offerToDelete, setOfferToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Isolation stricte côté frontend pour le commerçant
  const visibleOffers = isMerchant
    ? offers.filter((offer) => currentMerchant?.id && offer.merchantId === currentMerchant.id)
    : offers;

  const openEditModal = (offer) => {
    setEditingOffer(offer);
    setEditTitle(offer.title || "");
    setEditDesc(offer.description || "");
    setEditCategory(offer.category || "Boulangerie");
    setEditOfferType(offer.offerType || "standard");
    setEditOrigPrice(String(offer.originalPrice ?? ""));
    setEditDiscPrice(String(offer.discountedPrice ?? ""));
    setEditQty(String(offer.quantity ?? 0));
    setEditPickupStart(offer.pickupStart || "");
    setEditPickupEnd(offer.pickupEnd || "");
    setEditImageUrl(offer.imageUrl || "");
    setEditError(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingOffer || !onUpdateOffer) return;
    setEditError(null);

    const orig = Number(editOrigPrice);
    const disc = Number(editDiscPrice);
    const qty = Number(editQty);
    if (editTitle.trim().length < 3) {
      setEditError("Le titre doit contenir au moins 3 caractères.");
      return;
    }
    if (editDesc.trim().length < 5) {
      setEditError("La description doit contenir au moins 5 caractères.");
      return;
    }
    if (Number.isNaN(orig) || Number.isNaN(disc) || disc <= 0 || disc >= orig) {
      setEditError("Le prix réduit doit être strictement inférieur au prix initial (> 0).");
      return;
    }
    if (Number.isNaN(qty) || qty < 0) {
      setEditError("La quantité doit être supérieure ou égale à 0.");
      return;
    }

    setSavingEdit(true);
    try {
      await onUpdateOffer(editingOffer.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        category: editCategory,
        offerType: editOfferType,
        originalPrice: orig,
        discountedPrice: disc,
        quantity: Math.floor(qty),
        pickupStart: editPickupStart.trim(),
        pickupEnd: editPickupEnd.trim(),
        imageUrl: editImageUrl.trim() || undefined
      });
      setEditingOffer(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur lors de la modification.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!offerToDelete || !onDeleteOffer) return;
    setDeleting(true);
    try {
      await onDeleteOffer(offerToDelete.id);
      setOfferToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const eyebrow = isAdmin
    ? "Console administrateur · Modération du catalogue ESSECT"
    : isMerchant
      ? `Espace Commerçant · ${currentMerchant?.name || "Mon établissement"}`
      : mode === "surprise"
        ? "Sélection Surprise Basket · Invendus du jour"
        : "Catalogue en direct · Commerces partenaires ESSECT";

  const heading = isAdmin
    ? "Modération des offres publiées"
    : isMerchant
      ? "Mes Offres"
      : mode === "surprise"
        ? "Paniers Surprise anti-gaspillage"
        : "Offres disponibles aujourd’hui";

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" id="catalogue-offres">
      {/* Workspace Toolbar */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-800">{eyebrow}</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            {heading}
          </h2>
        </div>

        {showStudentCart && (
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:border-emerald-700 hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            Panier
            <span className="font-mono text-xs tabular-nums">({cartCount})</span>
          </button>
        )}
      </div>

      {/* Search & multi-criteria filters */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative md:col-span-5">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un produit, plat, boulangerie..."
            aria-label="Rechercher des offres"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
          />
        </div>

        <div className="md:col-span-4">
          {isMerchant ? (
            <select
              value={offerTypeFilter}
              onChange={(e) => onOfferTypeChange?.(e.target.value)}
              aria-label="Filtrer par format d'offre"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="all">Toutes (classiques et paniers surprise)</option>
              <option value="standard">Offres classiques</option>
              <option value="surprise">Paniers Surprise</option>
            </select>
          ) : (
            <select
              value={selectedMerchantId}
              onChange={(e) => onMerchantChange(e.target.value)}
              aria-label="Filtrer par commerce"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="">Tous les commerces partenaires</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.distanceMeters} m)
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="relative md:col-span-3">
          <SlidersHorizontal
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <select
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            aria-label="Prix maximal"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-10 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
          >
            <option value="">Tous les prix (TND)</option>
            <option value="5">Moins de 5.00 TND</option>
            <option value="7">Moins de 7.00 TND</option>
            <option value="10">Moins de 10.00 TND</option>
          </select>
        </div>
      </div>

      {/* Category segmented filter buttons */}
      <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Offer Grid */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : visibleOffers.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-12 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h3 className="mt-3 font-display text-lg font-semibold text-slate-900">
            Aucune offre ne correspond à vos critères
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {isMerchant
              ? "Aucune de vos offres ne correspond aux filtres sélectionnés."
              : "Essayez d’élargir votre budget maximal ou de sélectionner une autre catégorie."}
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onCategoryChange("Toutes");
              onMerchantChange("");
              onMaxPriceChange("");
              onOfferTypeChange?.("all");
            }}
            className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onAddToCart={onAddToCart}
              canReserve={showStudentCart}
              isMerchantOwner={isMerchant && offer.merchantId === currentMerchant?.id}
              isAdmin={isAdmin}
              onEdit={openEditModal}
              onRequestDelete={setOfferToDelete}
            />
          ))}
        </div>
      )}

      {/* Modale d'édition (Commerçant) */}
      {editingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Modifier l’offre
              </h3>
              <button
                type="button"
                onClick={() => setEditingOffer(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Titre</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={2}
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Catégorie</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {CATEGORIES.filter((c) => c !== "Toutes").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Format</label>
                  <select
                    value={editOfferType}
                    onChange={(e) => setEditOfferType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="standard">Offre classique</option>
                    <option value="surprise">Panier Surprise</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Prix initial</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={editOrigPrice}
                    onChange={(e) => setEditOrigPrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Prix réduit</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    required
                    value={editDiscPrice}
                    onChange={(e) => setEditDiscPrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Quantité</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Début retrait</label>
                  <input
                    type="text"
                    required
                    value={editPickupStart}
                    onChange={(e) => setEditPickupStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Fin retrait</label>
                  <input
                    type="text"
                    required
                    value={editPickupEnd}
                    onChange={(e) => setEditPickupEnd(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  URL de la photo (optionnel)
                </label>
                <input
                  type="text"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              {editError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOffer(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de confirmation de suppression (Commerçant & Admin) */}
      {offerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Supprimer cette offre ?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Voulez-vous vraiment supprimer{" "}
              <span className="font-semibold text-slate-900">« {offerToDelete.title} »</span> ?
              Cette action est irréversible.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setOfferToDelete(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}