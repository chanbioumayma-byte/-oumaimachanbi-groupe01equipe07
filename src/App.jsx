import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminDashboard } from "./components/AdminDashboard.jsx";
import { AuthModal } from "./components/AuthModal.jsx";
import { CampusRadarView } from "./components/CampusRadarView.jsx";
import { CartDrawer } from "./components/CartDrawer.jsx";
import { HeroSection } from "./components/HeroSection.jsx";
import { KonnectModal } from "./components/KonnectModal.jsx";
import { MarketplaceView } from "./components/MarketplaceView.jsx";
import { MerchantDashboard } from "./components/MerchantDashboard.jsx";
import { Navbar } from "./components/Navbar.jsx";
import { QrTicketModal } from "./components/QrTicketModal.jsx";
import { StudentDashboard } from "./components/StudentDashboard.jsx";
import { signOut } from "firebase/auth";
import { api } from "./lib/api.js";
import { auth } from "./lib/firebase.js";

export default function App() {
  const [section, setSection] = useState("offers");
  const [user, setUser] = useState(null);
  const [myMerchant, setMyMerchant] = useState(null);
  const [offers, setOffers] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");
  const [selectedMerchantId, setSelectedMerchantId] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [merchantOfferType, setMerchantOfferType] = useState("all");
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [merchantOffers, setMerchantOffers] = useState([]);
  const [adminMerchants, setAdminMerchants] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [konnectOrder, setKonnectOrder] = useState(null);
  const [qrOrder, setQrOrder] = useState(null);
  const [bannerMessage, setBannerMessage] = useState(null);

  const isStudentOrGuest = !user || user.role === "student";
  const isMerchant = user?.role === "merchant";

  const loadPublicData = useCallback(async () => {
    setLoadingOffers(true);
    try {
      const [offersRes, merchantsRes, statsRes] = await Promise.all([
        api.listOffers({
          q: searchQuery,
          category: selectedCategory,
          merchantId: selectedMerchantId,
          maxPrice,
          type: section === "surprise" ? "surprise" : "all"
        }),
        api.listMerchants(),
        api.getPlatformStats()
      ]);
      setOffers(offersRes.offers);
      setMerchants(merchantsRes.merchants);
      setStats(statsRes.stats);
    } finally {
      setLoadingOffers(false);
    }
  }, [searchQuery, selectedCategory, selectedMerchantId, maxPrice, section]);

  const loadAuthenticatedData = useCallback(async (currentUser) => {
    if (!currentUser) return;
    try {
      const [meRes, ordersRes, notifRes] = await Promise.all([
        api.me(),
        api.listOrders(),
        api.listNotifications()
      ]);
      setUser(meRes.user);
      setMyMerchant(meRes.merchant || null);
      setOrders(ordersRes.orders);
      setNotifications(notifRes.notifications);
      if (meRes.user.role !== "student") {
        setCart([]);
        setCartOpen(false);
        setCartError(null);
      }
      if (meRes.user.role === "merchant") {
        const myOffRes = await api.listMyOffers();
        setMerchantOffers(myOffRes.offers);
      } else if (meRes.user.role === "admin") {
        const [admMerchants, admUsers] = await Promise.all([
          api.adminListMerchants(),
          api.adminListUsers()
        ]);
        setAdminMerchants(admMerchants.merchants);
        setAdminUsers(admUsers.users);
      }
    } catch {
      // session expirée ou indisponible
    }
  }, []);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await auth.authStateReady();
      const fbUser = auth.currentUser;
      if (cancelled || !fbUser || !fbUser.emailVerified) return;
      try {
        const res = await api.me();
        if (cancelled) return;
        setUser(res.user);
        setMyMerchant(res.merchant || null);
        if (res.user.role !== "student") {
          setCart([]);
          setCartOpen(false);
        }
        await loadAuthenticatedData(res.user);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAuthenticatedData]);

  const refreshAll = useCallback(async () => {
    await loadPublicData();
    await loadAuthenticatedData(user);
  }, [loadPublicData, loadAuthenticatedData, user]);

  const handleAuthSuccess = async (loggedUser, merchant) => {
    setUser(loggedUser);
    setMyMerchant(merchant || null);
    if (loggedUser.role !== "student") {
      setCart([]);
      setCartOpen(false);
      setCartError(null);
      setSection("dashboard");
    }
    setBannerMessage(`Bienvenue, ${loggedUser.name}.`);
    await loadAuthenticatedData(loggedUser);
  };

  const handleLogout = () => {
    signOut(auth).catch(() => {});
    setUser(null);
    setMyMerchant(null);
    setMerchantOffers([]);
    setOrders([]);
    setNotifications([]);
    setCart([]);
    setCartOpen(false);
    setBannerMessage("Vous êtes déconnecté.");
    if (section === "dashboard") {
      setSection("offers");
    }
  };

  const handleAddToCart = (offer) => {
    setCartError(null);
    if (!user) {
      setAuthOpen(true);
      setBannerMessage("Connectez-vous en tant qu’étudiant pour réserver cette offre.");
      return;
    }
    if (user.role !== "student") {
      setBannerMessage("Seuls les comptes Étudiant peuvent réserver des repas.");
      return;
    }
    setCart((prev) => {
      if (prev.length > 0 && prev[0].offer.merchantId !== offer.merchantId) {
        setCartError(
          `Votre panier contient déjà un article de ${prev[0].offer.merchantName}. Finalisez ou videz votre panier d’abord.`
        );
        setCartOpen(true);
        return prev;
      }
      const existing = prev.find((i) => i.offer.id === offer.id);
      if (existing) {
        if (existing.quantity >= offer.quantity) return prev;
        return prev.map((i) =>
          i.offer.id === offer.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { offer, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const handleUpdateCartQty = (offerId, delta) => {
    setCartError(null);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.offer.id !== offerId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return { ...item, quantity: Math.min(nextQty, item.offer.quantity) };
        })
        .filter((x) => x !== null)
    );
  };

  const handleRemoveCartItem = (offerId) => {
    setCartError(null);
    setCart((prev) => prev.filter((i) => i.offer.id !== offerId));
  };

  const handleCheckout = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setCheckingOut(true);
    setCartError(null);
    try {
      const res = await api.createOrder(
        cart.map((i) => ({ offerId: i.offer.id, quantity: i.quantity }))
      );
      setCart([]);
      setCartOpen(false);
      setKonnectOrder(res.order);
      await refreshAll();
    } catch (err) {
      setCartError(err instanceof Error ? err.message : "Erreur lors de la réservation.");
    } finally {
      setCheckingOut(false);
    }
  };

const handleKonnectPaid = async (paidOrder) => {
    setKonnectOrder(null);
    setQrOrder(paidOrder);
    if (user?.role === "student") {
      setSection("dashboard");
    }
    setBannerMessage(
      `Paiement Konnect confirmé (${paidOrder.pickupCode}). Votre QR code est prêt !`
    );
    await refreshAll();
  };

  const handleUpdateOffer = async (offerId, payload) => {
    await api.updateOffer(offerId, payload);
    setBannerMessage("Offre mise à jour.");
    await refreshAll();
  };

  const handleDeleteOffer = async (offerId) => {
    await api.deleteOffer(offerId);
    setBannerMessage("Offre supprimée.");
    await refreshAll();
  };

  // Pour un commerçant connecté : filtrage local sur ses propres offres uniquement
  const filteredMerchantOffers = useMemo(() => {
    if (!isMerchant) return offers;
    const needle = searchQuery.trim().toLowerCase();
    const max = maxPrice ? Number(maxPrice) : null;

    return merchantOffers.filter((offer) => {
      if (myMerchant?.id && offer.merchantId !== myMerchant.id) return false;
      if (merchantOfferType !== "all" && offer.offerType !== merchantOfferType) return false;
      if (selectedCategory !== "Toutes" && offer.category !== selectedCategory) return false;
      if (max && !Number.isNaN(max) && offer.discountedPrice > max) return false;
      if (needle) {
        const hay = `${offer.title} ${offer.description} ${offer.category}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [
    isMerchant,
    offers,
    merchantOffers,
    myMerchant,
    merchantOfferType,
    selectedCategory,
    maxPrice,
    searchQuery
  ]);

  const displayedOffers = isMerchant ? filteredMerchantOffers : offers;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9F7] text-slate-900">
      <Navbar
        activeSection={section === "surprise" && isMerchant ? "offers" : section}
        onNavigate={(next) => {
          setSection(isMerchant && next === "surprise" ? "offers" : next);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        user={user}
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

      {bannerMessage && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-xs font-medium text-emerald-900">
          <span>{bannerMessage}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="ml-3 underline hover:text-emerald-700 cursor-pointer"
          >
            Masquer
          </button>
        </div>
      )}

      <main className="flex-1">
        {(section === "offers" || section === "surprise") && (
          <>
            {section === "offers" && !isMerchant && (
              <HeroSection
                stats={stats}
                onExploreOffers={() => {
                  document
                    .getElementById("catalogue-offres")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                onOpenRadar={() => setSection("radar")}
              />
            )}

            <MarketplaceView
              offers={displayedOffers}
              merchants={merchants}
              loading={loadingOffers}
              mode={section === "surprise" && !isMerchant ? "surprise" : "all"}
              user={user}
              currentMerchant={myMerchant}
              canReserve={isStudentOrGuest}
              cartCount={cartCount}
              onOpenCart={() => setCartOpen(true)}
              onAddToCart={handleAddToCart}
              onUpdateOffer={handleUpdateOffer}
              onDeleteOffer={handleDeleteOffer}
              offerTypeFilter={merchantOfferType}
              onOfferTypeChange={setMerchantOfferType}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedMerchantId={selectedMerchantId}
              onMerchantChange={setSelectedMerchantId}
              maxPrice={maxPrice}
              onMaxPriceChange={setMaxPrice}
            />
          </>
        )}

        {section === "radar" && (
          <CampusRadarView
            merchants={user?.role === "admin" && adminMerchants.length ? adminMerchants : merchants}
            offers={offers}
            user={user}
            currentMerchant={myMerchant}
            onSelectMerchantOffers={(merchantId) => {
              if (isMerchant) {
                setSection("offers");
                return;
              }
              setSelectedMerchantId(merchantId);
              setSection("offers");
            }}
          />
        )}

        {section === "dashboard" && (
          <>
            {!user ? (
              <section className="mx-auto max-w-3xl px-4 py-16 text-center">
                <div className="rounded-xl border border-slate-200 bg-white p-10">
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    Connectez-vous pour accéder à votre tableau de bord
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Accédez à vos tickets QR, EcoPoints, gestion de commerce ou console
                    administrateur ESSECT.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAuthOpen(true)}
                    className="mt-6 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                  >
                    Ouvrir la connexion
                  </button>
                </div>
              </section>
            ) : user.role === "student" ? (
              <StudentDashboard
                user={user}
                orders={orders}
                notifications={notifications}
                onRefresh={refreshAll}
                onUserUpdated={setUser}
                onOpenQr={(o) => setQrOrder(o)}
                onPayOrder={(o) => setKonnectOrder(o)}
              />
            ) : user.role === "merchant" ? (
              <MerchantDashboard
                merchant={myMerchant}
                offers={merchantOffers}
                orders={orders}
                onRefresh={refreshAll}
                onOpenMyOffers={() => setSection("offers")}
              />
            ) : user.role === "admin" ? (
              <AdminDashboard
                stats={stats}
                merchants={adminMerchants}
                users={adminUsers}
                orders={orders}
                onRefresh={refreshAll}
              />
            ) : null}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>CampusSave · Plateforme anti-gaspillage alimentaire autour de l’ESSECT Tunis</p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setSection("offers")}
              className="hover:text-slate-900 cursor-pointer"
            >
              {isMerchant ? "Mes Offres" : "Offres"}
            </button>
            {!isMerchant && (
              <button
                type="button"
                onClick={() => setSection("surprise")}
                className="hover:text-slate-900 cursor-pointer"
              >
                Paniers Surprise
              </button>
            )}
            <button
              type="button"
              onClick={() => setSection("radar")}
              className="hover:text-slate-900 cursor-pointer"
            >
              Campus Radar
            </button>
          </div>
        </div>
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {isStudentOrGuest && (
        <>
          <CartDrawer
            open={cartOpen}
            items={cart}
            onClose={() => setCartOpen(false)}
            onUpdateQty={handleUpdateCartQty}
            onRemove={handleRemoveCartItem}
            onCheckout={handleCheckout}
            submitting={checkingOut}
            error={cartError}
          />

          <KonnectModal
            order={konnectOrder}
            onClose={() => setKonnectOrder(null)}
            onPaid={handleKonnectPaid}
          />
        </>
      )}

      <QrTicketModal order={qrOrder} onClose={() => setQrOrder(null)} />
    </div>
  );
}