import { useState } from "react";
import { X } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { api } from "../lib/api.js";
import { auth } from "../lib/firebase.js";

// Seules les adresses Gmail réelles sont acceptées à l'inscription.
const GMAIL_RE = /^[a-z0-9._%+-]+@gmail\.com$/i;

function firebaseErrorMessage(err) {
  switch (err?.code) {
    case "auth/email-already-in-use":
      return "Un compte existe déjà avec cette adresse e-mail. Connectez-vous.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Identifiants incorrects.";
    case "auth/weak-password":
      return "Le mot de passe doit contenir au moins 6 caractères.";
    case "auth/invalid-email":
      return "Adresse e-mail invalide.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Patientez quelques minutes puis réessayez.";
    case "auth/network-request-failed":
      return "Connexion au serveur impossible. Vérifiez votre connexion internet.";
    case "auth/user-disabled":
      return "Compte désactivé par l’administration.";
    default:
      return err instanceof Error ? err.message : "Erreur d’authentification.";
  }
}

export function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+216 ");
  const [studentCardId, setStudentCardId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCategory, setBusinessCategory] = useState("Caf\xE9t\xE9ria");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  // Compte Firebase créé / connecté mais dont l'e-mail n'est pas encore confirmé.
  const [pendingUser, setPendingUser] = useState(null);
  if (!open) return null;

  const handleClose = async () => {
    if (pendingUser) {
      await signOut(auth).catch(() => {});
      setPendingUser(null);
    }
    setError(null);
    setInfo(null);
    setPassword("");
    onClose();
  };

  // Récupère le profil CampusSave (rôle, commerce) une fois l'e-mail confirmé.
  const finishLogin = async () => {
    try {
      const res = await api.me();
      setPendingUser(null);
      onSuccess(res.user, res.merchant);
      onClose();
    } catch (err) {
      await signOut(auth).catch(() => {});
      setPendingUser(null);
      setError(
        err.code === "profile_missing"
          ? "Aucun profil CampusSave pour ce compte. Utilisez « S’inscrire »."
          : err.message
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const cleanEmail = email.trim().toLowerCase();
    if (mode === "register" && !GMAIL_RE.test(cleanEmail)) {
      setError("Seules les adresses Gmail (@gmail.com) sont acceptées.");
      return;
    }
    if (!cleanEmail.includes("@")) {
      setError("Veuillez saisir une adresse e-mail valide.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caract\xE8res.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        if (!cred.user.emailVerified) {
          setPendingUser(cred.user);
          return;
        }
        await finishLogin();
     } else {
        if (name.trim().length < 2) {
          setError("Le nom complet est requis (min. 2 caractères).");
          return;
        }
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 8) {
          setError("Veuillez saisir un numéro de téléphone valide (min. 8 chiffres).");
          return;
        }
        if (role === "merchant") {
          if (businessName.trim().length < 2) {
            setError("Le nom du commerce est requis.");
            return;
          }
          if (businessAddress.trim().length < 4) {
            setError("L’adresse du commerce est requise.");
            return;
          }
        }
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        
        try {
          await api.register({
            name,
            role,
            phone,
            studentCardId: role === "student" ? studentCardId : void 0,
            businessName: role === "merchant" ? businessName : void 0,
            businessAddress: role === "merchant" ? businessAddress : void 0,
            businessCategory: role === "merchant" ? businessCategory : void 0
          });
        } catch (err) {
          // Profil refusé : on supprime le compte Firebase pour permettre une nouvelle tentative.
          await deleteUser(cred.user).catch(() => {});
          throw err;
        }
        await sendEmailVerification(cred.user).catch(() => {});
        setPendingUser(cred.user);
      }
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await pendingUser.reload();
      if (!pendingUser.emailVerified) {
        setError("Votre adresse n’est pas encore confirmée. Cliquez sur le lien reçu par e-mail.");
        return;
      }
      await pendingUser.getIdToken(true); // rafraîchit le jeton avec email_verified = true
      await finishLogin();
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    try {
      await sendEmailVerification(pendingUser);
      setInfo("E-mail de vérification renvoyé. Pensez à vérifier le dossier Spam.");
    } catch (err) {
      setError(firebaseErrorMessage(err));
    }
  };

  return <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    role="dialog"
    aria-modal="true"
    aria-labelledby="auth-modal-title"
  >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 id="auth-modal-title" className="font-display text-xl font-bold text-slate-900">
              {mode === "login" ? "Connexion \xE0 CampusSave" : "Cr\xE9er un compte CampusSave"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Accès sécurisé selon votre rôle (Étudiant ESSECT, Commerçant ou Administrateur).
            </p>
          </div>
          <button
    type="button"
    onClick={handleClose}
    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
    aria-label="Fermer"
  >
            <X className="h-5 w-5" />
          </button>
        </div>

        {pendingUser ? <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Vérifiez votre adresse e-mail</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                Un e-mail de confirmation a été envoyé à <strong>{pendingUser.email}</strong>. Ouvrez
                votre boîte Gmail (pensez au dossier <em>Spam</em>), cliquez sur le lien, puis revenez
                ici.
              </p>
            </div>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </div>}
            {info && <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                {info}
              </div>}
            <button
    type="button"
    disabled={loading}
    onClick={handleCheckVerified}
    className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer"
  >
              {loading ? "Vérification..." : "J’ai confirmé mon e-mail"}
            </button>
            <button
    type="button"
    onClick={handleResend}
    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:border-emerald-700 cursor-pointer"
  >
              Renvoyer l’e-mail de vérification
            </button>
            <button
    type="button"
    onClick={handleClose}
    className="w-full text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
  >
              Annuler
            </button>
          </div> : <>
        {
    /* Mode switch */
  }
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button
    type="button"
    onClick={() => {
      setMode("login");
      setError(null);
    }}
    className={`rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${mode === "login" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"}`}
  >
            Se connecter
          </button>
          <button
    type="button"
    onClick={() => {
      setMode("register");
      setError(null);
    }}
    className={`rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${mode === "register" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"}`}
  >
            S’inscrire
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === "register" && <>
              <div>
                <label className="block text-xs font-medium text-slate-700">Type de compte</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
    type="button"
    onClick={() => setRole("student")}
    className={`rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer ${role === "student" ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`}
  >
                    Étudiant ESSECT
                  </button>
                  <button
    type="button"
    onClick={() => setRole("merchant")}
    className={`rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer ${role === "merchant" ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`}
  >
                    Commerçant Partenaire
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Nom complet</label>
                  <input
    type="text"
    required
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Amine Mansouri"
    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Téléphone</label>
                  <input
    type="tel"
    required
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
  />
                </div>
              </div>

              {role === "student" ? <div>
                  <label className="block text-xs font-medium text-slate-700">
                    N° Carte Étudiant ESSECT
                  </label>
                  <input
    type="text"
    value={studentCardId}
    onChange={(e) => setStudentCardId(e.target.value)}
    placeholder="ESSECT-2026-1024"
    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
  />
                </div> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Nom du commerce
                    </label>
                    <input
    type="text"
    required
    value={businessName}
    onChange={(e) => setBusinessName(e.target.value)}
    placeholder="Boulangerie Montfleury"
    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
  />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Catégorie</label>
                    <select
    value={businessCategory}
    onChange={(e) => setBusinessCategory(e.target.value)}
    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
  >
                      <option value="Boulangerie">Boulangerie</option>
                      <option value="Cafétéria">Cafétéria</option>
                      <option value="Plats cuisinés">Plats cuisinés</option>
                      <option value="Sandwichs">Sandwichs</option>
                      <option value="Pâtisserie">Pâtisserie</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Adresse près de l’ESSECT
                    </label>
                    <input
    type="text"
    required
    value={businessAddress}
    onChange={(e) => setBusinessAddress(e.target.value)}
    placeholder="12 Rue Abou Kacem Chebbi, Montfleury"
    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
  />
                  </div>
                </div>}
            </>}

          <div>
            <label className="block text-xs font-medium text-slate-700">Adresse e-mail</label>
            <input
    type="email"
    required
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="nom@gmail.com"
    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
  />
            {mode === "register" && <p className="mt-1 text-[11px] text-slate-500">
                Adresse Gmail réelle requise : un e-mail de confirmation vous sera envoyé.
              </p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Mot de passe</label>
            <input
    type="password"
    required
    minLength={6}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="••••••••"
    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
  />
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>}

          <button
    type="submit"
    disabled={loading}
    className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer"
  >
            {loading ? "Traitement en cours..." : mode === "login" ? "Se connecter" : "Cr\xE9er mon compte"}
          </button>
        </form>
          </>}
      </div>
    </div>;
}
