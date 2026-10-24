import { useState } from "react";
import { useMiPerfil, type MiPerfil } from "./uses/useMiPerfil";
import {
  validarDpi,
  validarTelefono,
  normalizarDigitos,
  DPI_DIGITOS,
  TELEFONO_DIGITOS,
} from "./lib/validators";

// ── UI compartida (mismo patrón que ConfigModule.tsx) ──────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-[#102c4d] font-bold text-base" style={{ fontFamily: "Outfit, sans-serif" }}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors" title="Cerrar">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#102c4d] uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{message}</div>;
}

function SuccessBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="text-emerald-700 text-xs bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 mb-4">{message}</div>;
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d] focus:ring-2 focus:ring-[#102c4d]/10 transition-all";
const inputErrorCls = " border-red-300 focus:border-red-400 focus:ring-red-100";
const inputDisabledCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed";
const btnPrimaryCls = "px-5 py-2 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60";
const btnGhostCls = "px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors";

// ── Modal 1: datos personales ──────────────────────────────────────────────────

function PerfilDatosModal({ perfil, onClose, onSave }: {
  perfil: MiPerfil;
  onClose: () => void;
  onSave: (payload: { nombre: string; apellido: string; telefono: string | null; dpi: string | null }) => Promise<{ error: string | null }>;
}) {
  const [form, setForm] = useState({
    nombre: perfil.nombre,
    apellido: perfil.apellido,
    telefono: perfil.telefono ?? "",
    dpi: perfil.dpi ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ dpi?: string; telefono?: string }>({});
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((e) => ({ ...e, [k]: undefined }));
    setSuccess(null);
  };

  async function guardar() {
    setError(null);
    setSuccess(null);

    if (!form.nombre.trim() || !form.apellido.trim()) {
      setError("Nombre y apellido son obligatorios.");
      return;
    }

    const errores = {
      dpi: validarDpi(form.dpi) ?? undefined,
      telefono: validarTelefono(form.telefono) ?? undefined,
    };
    if (errores.dpi || errores.telefono) {
      setFieldErrors(errores);
      return;
    }

    setSaving(true);
    const resultado = await onSave({
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      telefono: normalizarDigitos(form.telefono),
      dpi: normalizarDigitos(form.dpi),
    });
    setSaving(false);

    if (resultado.error) { setError(resultado.error); return; }
    setSuccess("Tus datos se guardaron correctamente.");
  }

  return (
    <Modal title="Mis datos personales" onClose={onClose}>
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <div className="flex items-center gap-2 mb-5 text-xs text-gray-500">
        <span className="font-mono font-semibold text-[#102c4d] bg-blue-50 px-2 py-0.5 rounded">{perfil.usuario}</span>
        <span className="bg-[#102c4d]/10 text-[#102c4d] px-2 py-0.5 rounded-full font-medium">{perfil.rol}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre">
          <input className={inputCls} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
        </Field>
        <Field label="Apellido">
          <input className={inputCls} value={form.apellido} onChange={(e) => set("apellido", e.target.value)} />
        </Field>
        <Field label="DPI">
          <input
            className={inputCls + (fieldErrors.dpi ? inputErrorCls : "")}
            value={form.dpi}
            onChange={(e) => set("dpi", e.target.value)}
            inputMode="numeric"
            maxLength={15}
            placeholder={`${DPI_DIGITOS} dígitos`}
          />
          {fieldErrors.dpi && <p className="text-xs text-red-600 mt-1">{fieldErrors.dpi}</p>}
        </Field>
        <Field label="Teléfono">
          <input
            className={inputCls + (fieldErrors.telefono ? inputErrorCls : "")}
            value={form.telefono}
            onChange={(e) => set("telefono", e.target.value)}
            inputMode="tel"
            maxLength={20}
            placeholder={`${TELEFONO_DIGITOS} dígitos`}
          />
          {fieldErrors.telefono && <p className="text-xs text-red-600 mt-1">{fieldErrors.telefono}</p>}
        </Field>
        <div className="md:col-span-2">
          <Field label="Correo">
            <input className={inputDisabledCls} value={perfil.correo ?? ""} disabled />
            <p className="text-xs text-amber-600 mt-1.5">
              El correo es con el que inicias sesión y no se puede editar aquí. Si necesitas cambiarlo, contacta al administrador.
            </p>
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className={btnGhostCls}>Cerrar</button>
        <button disabled={saving} onClick={guardar} className={btnPrimaryCls} style={{ fontFamily: "Outfit, sans-serif" }}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal 2: contraseña ────────────────────────────────────────────────────────

// Ajusta aquí si tus reglas de contraseña cambian. La Edge Function
// "cambiar-mi-password" valida el mínimo también en el servidor.
const PASSWORD_MIN = 8;

function PerfilPasswordModal({ onClose, onChange }: {
  onClose: () => void;
  onChange: (passActual: string, passNueva: string) => Promise<{ error: string | null }>;
}) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reglas = [
    { ok: nueva.length >= PASSWORD_MIN, texto: `Mínimo ${PASSWORD_MIN} caracteres` },
    { ok: nueva.length > 0 && nueva !== actual, texto: "Distinta de la contraseña actual" },
    { ok: nueva.length > 0 && nueva === confirmar, texto: "Coincide con la confirmación" },
  ];
  const valido = actual.length > 0 && reglas.every((r) => r.ok);

  async function guardar() {
    setError(null);
    setSuccess(null);
    if (!valido) {
      setError("Completa todos los campos y cumple los requisitos de la nueva contraseña.");
      return;
    }
    setSaving(true);
    const resultado = await onChange(actual, nueva);
    setSaving(false);
    if (resultado.error) { setError(resultado.error); return; }
    setSuccess("Contraseña actualizada correctamente.");
    setActual("");
    setNueva("");
    setConfirmar("");
  }

  return (
    <Modal title="Cambiar contraseña" onClose={onClose}>
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <div className="space-y-4">
        <Field label="Contraseña actual">
          <input type="password" autoComplete="current-password" className={inputCls} value={actual} onChange={(e) => setActual(e.target.value)} />
        </Field>
        <Field label="Nueva contraseña">
          <input type="password" autoComplete="new-password" className={inputCls} value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder={`Mínimo ${PASSWORD_MIN} caracteres`} />
        </Field>
        <Field label="Confirmar nueva contraseña">
          <input type="password" autoComplete="new-password" className={inputCls} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        </Field>

        <ul className="space-y-1">
          {reglas.map((r) => (
            <li key={r.texto} className={`flex items-center gap-2 text-xs ${r.ok ? "text-emerald-700" : "text-gray-400"}`}>
              <span className={`inline-flex w-4 h-4 items-center justify-center rounded-full text-[10px] font-bold ${r.ok ? "bg-emerald-100" : "bg-gray-100"}`}>
                {r.ok ? "✓" : "·"}
              </span>
              {r.texto}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className={btnGhostCls}>Cerrar</button>
        <button disabled={saving || !valido} onClick={guardar} className={btnPrimaryCls} style={{ fontFamily: "Outfit, sans-serif" }}>
          {saving ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </div>
    </Modal>
  );
}

// ── Contenedor: lo único que App.tsx necesita importar ─────────────────────────

export type PerfilModalTipo = "datos" | "password";

export default function PerfilModals({ tipo, onClose, onDatosGuardados }: {
  tipo: PerfilModalTipo;
  onClose: () => void;
  /** Se llama tras guardar datos personales (útil para refrescar el nombre del sidebar). */
  onDatosGuardados?: () => void;
}) {
  const { perfil, loading, error, actualizarDatos, cambiarPassword } = useMiPerfil();

  if (tipo === "password") {
    return <PerfilPasswordModal onClose={onClose} onChange={cambiarPassword} />;
  }

  if (loading || !perfil) {
    return (
      <Modal title="Mis datos personales" onClose={onClose}>
        {error ? <ErrorBanner message={error} /> : <p className="text-sm text-gray-400 text-center py-6">Cargando…</p>}
      </Modal>
    );
  }

  return (
    <PerfilDatosModal
      perfil={perfil}
      onClose={onClose}
      onSave={async (payload) => {
        const r = await actualizarDatos(payload);
        if (!r.error) onDatosGuardados?.();
        return r;
      }}
    />
  );
}