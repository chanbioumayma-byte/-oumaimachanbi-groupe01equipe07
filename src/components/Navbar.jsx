export function Navbar({
  activeSection,
  onNavigate,
  user,
  onOpenAuth,
  onLogout
}) {
  const isMerchant = user?.role === "merchant";

  const navItems = isMerchant
    ? [
        { id: "offers", label: "Mes Offres" },
        { id: "radar", label: "Campus Radar" },
        { id: "dashboard", label: "Tableau de bord" }
      ]
    : [
        { id: "offers", label: "Offres" },
        { id: "surprise", label: "Paniers Surprise" },
        { id: "radar", label: "Campus Radar" },
        { id: "dashboard", label: "Tableau de bord" }
      ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => onNavigate("offers")}
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          CampusSave
        </button>

        <nav className="hidden md:flex items-center gap-6" aria-label="Navigation principale">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                  isActive
                    ? "border-emerald-700 text-slate-900"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          {user ? (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              title={`Connecté en tant que ${user.name}`}
            >
              Déconnexion · {user.name.split(" ")[0]}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Connexion
            </button>
          )}
        </div>
      </div>

      <nav
        className="flex md:hidden items-center gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2"
        aria-label="Navigation mobile"
      >
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`text-xs font-medium whitespace-nowrap shrink-0 py-1 ${
                isActive ? "text-emerald-700 font-semibold" : "text-slate-600"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}