import { useState } from "react";
import AssetsModule from "./AssetsModule";
import QuotesModule from "./QuotesModule";
import RentalsModule from "./RentalsModule";
import ClientsModule from "./ClientesModule";
import UsuariosModule from"./UsuariosModule";

// ── Icons ──────────────────────────────────────────────────────────────────────

const Icon = {
  Construction: () => (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="8" fill="#ffbc07" />
      <path d="M8 30h24M14 30V18l6-6 6 6v12" stroke="#102c4d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="17" y="22" width="6" height="8" rx="1" stroke="#102c4d" strokeWidth="2" />
      <path d="M10 18l4-4M30 18l-4-4" stroke="#102c4d" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="11" r="2.5" stroke="#102c4d" strokeWidth="2" />
    </svg>
  ),
  Dashboard: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M2 3a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm9 0a1 1 0 011-1h5a1 1 0 011 1v3a1 1 0 01-1 1h-5a1 1 0 01-1-1V3zm0 7a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1h-5a1 1 0 01-1-1v-7zM2 12a1 1 0 011-1h6a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5z" />
    </svg>
  ),
  Quotes: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
    </svg>
  ),
  Rentals: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-5h2.038A2 2 0 0115 11.293V10h.5a.5.5 0 00.354-.854l-3-3A.5.5 0 0012.5 6H11V5a1 1 0 00-1-1H3z" />
    </svg>
  ),
  Assets: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
    </svg>
  ),
  Clients: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
    </svg>
  ),
  Maintenance: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  ),
  Reports: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  ),
  Hamburger: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  ),
  Toggle: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12 6 6 0 010 12z" />
      <path d="M10 6a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  QR: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zm-2 7a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zm8-12a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1zM9 9a1 1 0 000 2h1a1 1 0 100-2H9zm7 0a1 1 0 10-2 0v1h1a1 1 0 001-1zm-1 4a1 1 0 10-2 0 1 1 0 002 0zm-5 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  ),
  Lock: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  ),
};

// ── Data ───────────────────────────────────────────────────────────────────────

const kpis = [
  {
    label: "Activos Disponibles",
    value: 142,
    sub: "de 218 en total",
    color: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
    textColor: "text-emerald-700",
    icon: "assets",
  },
  {
    label: "Activos Alquilados",
    value: 61,
    sub: "28% del inventario",
    color: "bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
    textColor: "text-blue-700",
    icon: "rentals",
  },
  {
    label: "En Mantenimiento",
    value: 15,
    sub: "3 programados hoy",
    color: "bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
    textColor: "text-amber-700",
    icon: "maintenance",
  },
  {
    label: "Cotizaciones del Mes",
    value: 34,
    sub: "12 pendientes de respuesta",
    color: "bg-purple-50 border-purple-200",
    dot: "bg-purple-500",
    textColor: "text-purple-700",
    icon: "quotes",
  },
  {
    label: "Alquileres Activos",
    value: 48,
    sub: "↑ 6 vs mes anterior",
    color: "bg-navy-50 border-navy-200",
    dot: "bg-[#102c4d]",
    textColor: "text-[#102c4d]",
    icon: "rentals2",
  },
];

const upcomingReturns = [
  { id: "ALQ-0091", client: "Constructora Vega S.A.", contact: "Marco Vega", assets: "4× Andamio Tubular", returnDate: "2026-08-28", status: "En tiempo", statusColor: "bg-emerald-100 text-emerald-700" },
  { id: "ALQ-0087", client: "Inmobiliaria del Norte", contact: "Sofía Ramos", assets: "2× Plataforma Elevadora", returnDate: "2026-08-29", status: "En tiempo", statusColor: "bg-emerald-100 text-emerald-700" },
  { id: "ALQ-0083", client: "Ingeniería Cantera Ltda.", contact: "Roberto Cantera", assets: "6× Puntal Metálico", returnDate: "2026-08-30", status: "Parcial", statusColor: "bg-blue-100 text-blue-700" },
  { id: "ALQ-0079", client: "Obras Civiles del Sur", contact: "Ana Fuentes", assets: "3× Andamio + 2× Rodo", returnDate: "2026-09-01", status: "En tiempo", statusColor: "bg-emerald-100 text-emerald-700" },
  { id: "ALQ-0075", client: "Grupo Constructivo Merino", contact: "Luis Merino", assets: "8× Andamio Colgante", returnDate: "2026-09-03", status: "Próximo vencer", statusColor: "bg-amber-100 text-amber-700" },
  { id: "ALQ-0071", client: "Pavimentos y Rellenos S.A.", contact: "Clara Ibáñez", assets: "1× Plataforma Tijera", returnDate: "2026-09-05", status: "En tiempo", statusColor: "bg-emerald-100 text-emerald-700" },
];

const maintenanceAlerts = [
  { asset: "AND-0034 — Andamio Tubular 48mm", lastMaint: "2026-03-12", dueIn: 13, urgent: true },
  { asset: "ROD-0011 — Jgo. Rodos Industriales", lastMaint: "2026-03-18", dueIn: 19, urgent: true },
  { asset: "PUN-0028 — Puntal Metálico 3m", lastMaint: "2026-04-02", dueIn: 34, urgent: false },
  { asset: "PLT-0007 — Plataforma Tijera 6m", lastMaint: "2026-04-15", dueIn: 47, urgent: false },
];

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "Dashboard" },
  { id: "quotes", label: "Cotizaciones", icon: "Quotes" },
  { id: "rentals", label: "Alquileres", icon: "Rentals" },
  { id: "assets", label: "Activos", icon: "Assets" },
  { id: "clients", label: "Clientes", icon: "Clients" },
  { id: "maintenance", label: "Mantenimientos", icon: "Maintenance" },
  { id: "reports", label: "Reportes", icon: "Reports" },
  { id: "settings", label: "Configuración", icon: "Settings" },
  { id: "usuarios", label: "Usuarios", icon: "Clients" },
];

// ── Login Screen ───────────────────────────────────────────────────────────────

function LoginScreen() {
  const { signIn } = useAuth();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user || !pass) {
      setError("Por favor ingresa usuario y contraseña.");
      return;
    }
    setLoading(true);
    const { error } = await signIn(user, pass);
    setLoading(false);
    if (error) setError(error);
    // si no hay error, onAuthStateChange ya actualiza `session`
    // automáticamente y App re-renderiza solo -- no necesitas
    // navegar manualmente.
  };

  return (
    <div className="min-h-screen bg-[#102c4d] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-[#ffbc07] translate-x-1/3 translate-y-1/3" />
      </div>
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.5) 39px,rgba(255,255,255,0.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.5) 39px,rgba(255,255,255,0.5) 40px)" }} />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-[#102c4d] px-8 pt-8 pb-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4">
              <Icon.Construction />
            </div>
            <h1 className="text-white text-2xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>
              MaquilaRent
            </h1>
            <p className="text-blue-200 text-sm mt-1">Sistema de Gestión de Maquinaria</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#102c4d] uppercase tracking-wider mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon.User />
                </span>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="nombre.apellido"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d] focus:ring-2 focus:ring-[#102c4d]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#102c4d] uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon.Lock />
                </span>
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d] focus:ring-2 focus:ring-[#102c4d]/10 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ffbc07] hover:bg-[#e5a800] text-[#102c4d] font-bold py-3.5 rounded-lg text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-70 shadow-md hover:shadow-lg"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Verificando...
                </span>
              ) : "Ingresar al Sistema"}
            </button>

            <p className="text-center text-xs text-gray-400">
              ¿Olvidaste tu contraseña?{" "}
              <span className="text-[#102c4d] font-medium cursor-pointer hover:underline">
                Contacta al administrador
              </span>
            </p>
          </form>
        </div>

        <p className="text-center text-blue-300/60 text-xs mt-6">
          © 2026 MaquilaRent · Sistema Interno · v2.4.1
        </p>
      </div>
    </div>
  );
}

// ── Sidebar Nav Item ───────────────────────────────────────────────────────────

function NavItem({
  item,
  active,
  onClick,
  collapsed = false,
}: {
  item: (typeof navItems)[0];
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
}) {
  const IconComp = Icon[item.icon as keyof typeof Icon] as React.FC;

  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
        ${active
          ? "bg-[#ffbc07] text-[#102c4d]"
          : "text-blue-200 hover:bg-white/10 hover:text-white"
        }`}
      style={{ fontFamily: "Outfit, sans-serif" }}
    >
      <span className="flex-shrink-0">
        <IconComp />
      </span>
      {!collapsed && <span>{item.label}</span>}
      {active && !collapsed && (
        <span className="ml-auto">
          <Icon.ChevronRight />
        </span>
      )}
    </button>
  );
}

import { PerfilUsuario } from "./uses/useAuth";
// ── Sidebar ────────────────────────────────────────────────────────────────────

function Sidebar({
  active,
  onNav,
  mobile = false,
  onClose,
  perfil,
  onSignOut
}: {
  active: string;
  onNav: (id: string) => void;
  mobile?: boolean;
  onClose?: () => void;
  perfil: PerfilUsuario | null;
  onSignOut: () => Promise<void>;
}) {
  return (
    <aside
      className={`bg-[#102c4d] flex flex-col h-full ${mobile ? "w-72" : "w-60"}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 flex-shrink-0">
          <Icon.Construction />
        </div>
        <div>
          <div className="text-white font-bold text-lg leading-none" style={{ fontFamily: "Outfit, sans-serif" }}>
            MaquilaRent
          </div>
          <div className="text-blue-300 text-xs mt-0.5">Gestión de Maquinaria</div>
        </div>
        {mobile && onClose && (
          <button onClick={onClose} className="ml-auto text-blue-300 hover:text-white">
            <Icon.Close />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-blue-400 text-[10px] font-semibold uppercase tracking-widest px-4 mb-3">Principal</p>
        {navItems.slice(0, 6).map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={active === item.id}
            onClick={() => { onNav(item.id); onClose?.(); }}
          />
        ))}
        <p className="text-blue-400 text-[10px] font-semibold uppercase tracking-widest px-4 mt-5 mb-3">Sistema</p>
        {navItems.slice(6).map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={active === item.id}
            onClick={() => { onNav(item.id); onClose?.(); }}
          />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#ffbc07] flex items-center justify-center text-[#102c4d] font-bold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
            JL
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold truncate" style={{ fontFamily: "Outfit, sans-serif" }}>{perfil?.nombreCompleto}</div>
            <div className="text-blue-300 text-xs">{perfil?.rol}</div>
          </div>
          <button
            onClick={onSignOut}
            className="text-blue-300 hover:text-white transition-colors"
            title="Cerrar sesión"
          >
            <Icon.Logout />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Topbar ─────────────────────────────────────────────────────────────────────

function Topbar({ onMenuOpen, pageTitle, perfil }: { onMenuOpen: () => void; pageTitle: string; perfil: PerfilUsuario | null }) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0">
      <button
        onClick={onMenuOpen}
        className="md:hidden text-[#102c4d] hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
      >
        <Icon.Hamburger />
      </button>

      <div className="flex-1">
        <h2 className="text-[#102c4d] font-bold text-base" style={{ fontFamily: "Outfit, sans-serif" }}>
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <Icon.Bell />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-7 h-7 rounded-full bg-[#102c4d] flex items-center justify-center text-white text-xs font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>
            JL
          </div>
          <div className="text-right">
            <div className="text-[#102c4d] text-sm font-semibold leading-none" style={{ fontFamily: "Outfit, sans-serif" }}>{perfil?.nombreCompleto}</div>
            <div className="text-gray-400 text-xs">{perfil?.rol}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: (typeof kpis)[0] }) {
  return (
    <div className={`bg-white rounded-xl border ${kpi.color} p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${kpi.dot}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-3xl font-bold ${kpi.textColor}`} style={{ fontFamily: "Outfit, sans-serif" }}>
          {kpi.value}
        </div>
        <div className="text-[#102c4d] text-sm font-semibold mt-0.5">{kpi.label}</div>
        <div className="text-gray-400 text-xs mt-1">{kpi.sub}</div>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

function Dashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* KPIs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#102c4d] font-bold text-lg" style={{ fontFamily: "Outfit, sans-serif" }}>
            Resumen del Sistema
          </h3>
          <span className="text-gray-400 text-xs">Actualizado: 27 ago 2026 · 09:14</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upcoming returns */}
        <section className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon.Calendar />
                <h3 className="text-[#102c4d] font-bold text-base" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Próximas Devoluciones
                </h3>
              </div>
              <button className="text-xs text-[#102c4d] font-semibold hover:text-[#ffbc07] transition-colors">
                Ver todos →
              </button>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Alquiler</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">Cliente</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">Activos</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">Devolución</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">Estado</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {upcomingReturns.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold text-[#102c4d] bg-blue-50 px-2 py-1 rounded">
                          {r.id}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="font-medium text-gray-900 text-xs">{r.client}</div>
                        <div className="text-gray-400 text-xs">{r.contact}</div>
                      </td>
                      <td className="px-3 py-3.5 text-xs text-gray-600">{r.assets}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <Icon.Calendar />
                          {r.returnDate}
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.statusColor}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#102c4d] transition-colors" title="Ver">
                            <Icon.Eye />
                          </button>
                          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#102c4d] transition-colors" title="Editar">
                            <Icon.Edit />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {upcomingReturns.map((r) => (
                <div key={r.id} className="px-4 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#102c4d] bg-blue-50 px-2 py-0.5 rounded">
                      {r.id}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.statusColor}`}>
                      {r.status}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{r.client}</div>
                    <div className="text-gray-400 text-xs">{r.contact}</div>
                  </div>
                  <div className="text-xs text-gray-600">{r.assets}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Icon.Calendar />
                      Devolución: {r.returnDate}
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Icon.Eye /></button>
                      <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Icon.Edit /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Maintenance alerts */}
        <section>
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
              <span className="text-amber-600"><Icon.Alert /></span>
              <h3 className="text-amber-800 font-bold text-base" style={{ fontFamily: "Outfit, sans-serif" }}>
                Mantenimientos Próximos
              </h3>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-4">
                Activos que requieren mantenimiento en los próximos 60 días (ciclo: 5 meses).
              </p>
              <div className="space-y-3">
                {maintenanceAlerts.map((m) => (
                  <div
                    key={m.asset}
                    className={`rounded-lg p-3.5 border ${m.urgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900 leading-tight">{m.asset}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Último: {m.lastMaint}
                        </div>
                      </div>
                      <div className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${m.urgent ? "bg-red-500 text-white" : "bg-amber-400 text-amber-900"}`}>
                        {m.dueIn}d
                      </div>
                    </div>
                    {m.urgent && (
                      <div className="mt-2 text-[10px] font-semibold text-red-600 uppercase tracking-wider">
                        ⚠ Vence en menos de 20 días
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full text-center text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors">
                Ver todos los mantenimientos →
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Quick actions bar */}
      <section>
        <div className="bg-[#102c4d] rounded-xl p-5 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <div className="text-white font-bold text-base" style={{ fontFamily: "Outfit, sans-serif" }}>Acciones Rápidas</div>
            <div className="text-blue-300 text-xs mt-0.5">Operaciones frecuentes del sistema</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Nueva Cotización", icon: "Quotes" },
              { label: "Nuevo Alquiler", icon: "Rentals" },
              { label: "Escanear QR", icon: "QR" },
              { label: "Registrar Activo", icon: "Assets" },
            ].map((a) => {
              const Ic = Icon[a.icon as keyof typeof Icon] as React.FC;
              return (
                <button
                  key={a.label}
                  className="flex items-center gap-2 bg-white/10 hover:bg-[#ffbc07] hover:text-[#102c4d] text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all duration-150"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Ic />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Placeholder Content ────────────────────────────────────────────────────────

function PlaceholderContent({ page }: { page: string }) {
  const labels: Record<string, string> = {
    quotes: "Cotizaciones",
    rentals: "Alquileres",
    assets: "Activos",
    maintenance: "Mantenimientos",
    reports: "Reportes",
    settings: "Configuración",
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#102c4d]/10 flex items-center justify-center mx-auto mb-4 text-[#102c4d]">
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
          </svg>
        </div>
        <h3 className="text-[#102c4d] font-bold text-lg mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
          Módulo: {labels[page] ?? page}
        </h3>
        <p className="text-gray-400 text-sm max-w-xs">
          Esta pantalla es parte del prototipo. El módulo <strong>{labels[page]}</strong> se implementará aquí con sus listas, filtros, modales y CRUD completo.
        </p>
        <button className="mt-5 inline-flex items-center gap-2 bg-[#ffbc07] text-[#102c4d] font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-[#e5a800] transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
          + Agregar registro
        </button>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────

import { AuthProvider, useAuth } from "./uses/useAuth";

const pageTitles: Record<string, string> = {
  dashboard: "Dashboard",
  quotes: "Cotizaciones",
  rentals: "Alquileres",
  assets: "Activos",
  clients: "Clientes",
  maintenance: "Mantenimientos",
  reports: "Reportes",
  settings: "Configuración",
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { session, perfil, loading, signOut } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#102c4d] text-white">
        Cargando...
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#f5f7fa]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0 h-full">
        <Sidebar
          active={activePage}
          onNav={setActivePage}
          perfil={perfil}
          onSignOut={signOut}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 h-full">
            <Sidebar
              active={activePage}
              onNav={setActivePage}
              mobile
              onClose={() => setMobileMenuOpen(false)}
              perfil={perfil}
              onSignOut={signOut}
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onMenuOpen={() => setMobileMenuOpen(true)}
          pageTitle={pageTitles[activePage] ?? activePage}
          perfil={perfil}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {activePage === "dashboard" && <Dashboard />}
          {activePage === "assets" && <AssetsModule />}
          {activePage === "quotes" && <QuotesModule />}
          {activePage === "rentals" && <RentalsModule />}
          {activePage === "clients" && <ClientsModule />}
          {activePage === "usuarios" && <UsuariosModule />}
          {activePage !== "dashboard" && activePage !== "assets" && activePage !== "quotes" && activePage !== "rentals" && (
            <PlaceholderContent page={activePage} />
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-2 z-40">
        {navItems.slice(0, 5).map((item) => {
          const Ic = Icon[item.icon as keyof typeof Icon] as React.FC;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${isActive ? "text-[#102c4d]" : "text-gray-400"}`}
            >
              <span className={`p-1 rounded-lg ${isActive ? "bg-[#ffbc07]" : ""}`}>
                <Ic />
              </span>
              <span className="text-[9px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                {item.label.length > 8 ? item.label.slice(0, 7) + "…" : item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-gray-400"
        >
          <span className="p-1"><Icon.Hamburger /></span>
          <span className="text-[9px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>Más</span>
        </button>
      </nav>
    </div>
  );
}
