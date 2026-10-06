import { useState, useMemo } from "react";
import { useEmpleados } from "./uses/useEmpleados";
import { useUsuarios } from "./uses/useUsuarios";
import { useRoles } from "./uses/useRoles";
import type { Empleado, Usuario } from "../types/inventory";

// ── Shared UI (mismo patrón que AssetsModule.tsx / ClientsModule.tsx) ──────────

function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${active ? "bg-[#102c4d]" : "bg-gray-300"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${active ? "translate-x-4.5" : "translate-x-0.5"}`} />
    </button>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} my-4`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-[#102c4d] font-bold text-base" style={{ fontFamily: "Outfit, sans-serif" }}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
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
  return (
    <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
      {message}
    </div>
  );
}

function SuccessBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="text-emerald-700 text-xs bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 mb-4">
      {message}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d] focus:ring-2 focus:ring-[#102c4d]/10 transition-all";
const selectCls = inputCls + " bg-white";
const inputDisabledCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed";

function ActionBtn({ onClick, title, color = "gray", icon }: { onClick: () => void; title: string; color?: string; icon: React.ReactNode }) {
  const colors: Record<string, string> = {
    gray: "text-gray-400 hover:text-[#102c4d] hover:bg-gray-100",
    gold: "text-amber-500 hover:text-amber-700 hover:bg-amber-50",
    red: "text-red-400 hover:text-red-600 hover:bg-red-50",
  };
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded transition-colors ${colors[color]}`}>{icon}</button>
  );
}

const IcoEdit = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>;
const IcoPlus = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const IcoSearch = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const IcoFilter = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const IcoUser = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;
const IcoKey = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" /></svg>;
const IcoShield = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;

// ── Empleados ──────────────────────────────────────────────────────────────────

function EmpleadoModal({ onClose, initial, tieneUsuario, onSave }: {
  onClose: () => void;
  initial?: Empleado | null;
  tieneUsuario: boolean;
  onSave: (payload: { nombre: string; apellido: string; telefono: string | null; correo: string | null; dpi: string | null }) => Promise<{ error: string | null }>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    nombre: initial?.nombre ?? "",
    apellido: initial?.apellido ?? "",
    telefono: initial?.telefono ?? "",
    correo: initial?.correo ?? "",
    dpi: initial?.dpi ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function guardar() {
    if (!form.nombre.trim() || !form.apellido.trim()) {
      setError("Nombre y apellido son obligatorios.");
      return;
    }
    setSaving(true);
    const resultado = await onSave({
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      telefono: form.telefono || null,
      correo: form.correo || null,
      dpi: form.dpi || null,
    });
    setSaving(false);
    if (resultado.error) { setError(resultado.error); return; }
    onClose();
  }

  return (
    <Modal title={isEdit ? "Editar Empleado" : "Nuevo Empleado"} onClose={onClose} wide>
      <ErrorBanner message={error} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre">
          <input className={inputCls} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Juan" />
        </Field>
        <Field label="Apellido">
          <input className={inputCls} value={form.apellido} onChange={(e) => set("apellido", e.target.value)} placeholder="Ej. López" />
        </Field>
        <Field label="DPI">
          <input className={inputCls} value={form.dpi} onChange={(e) => set("dpi", e.target.value)} placeholder="0000 00000 0000" />
        </Field>
        <Field label="Teléfono">
          <input className={inputCls} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="Ej. 5555-1234" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Correo">
            {tieneUsuario ? (
              <>
                <input className={inputDisabledCls} value={form.correo} disabled />
                <p className="text-xs text-amber-600 mt-1.5">
                  Este correo no puede ser editado porque ya tiene una cuenta de usuario asociada
                  (es el correo con el que inicia sesión). Si necesita editarlo, contacte con soporte
                  técnico para actualizarlo.
                </p>
              </>
            ) : (
              <input type="email" className={inputCls} value={form.correo} onChange={(e) => set("correo", e.target.value)} placeholder="correo@empresa.com" />
            )}
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
        <button disabled={saving} onClick={guardar} className="px-5 py-2 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60" style={{ fontFamily: "Outfit, sans-serif" }}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear Empleado"}
        </button>
      </div>
    </Modal>
  );
}

function EmpleadosView() {
  const { empleados, loading, error, crear, editar, cambiarEstado } = useEmpleados();
  const { usuarios } = useUsuarios();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState<Empleado | null>(null);

  const idsConUsuario = useMemo(() => new Set(usuarios.map((u) => u.idempleado)), [usuarios]);

  const filtered = useMemo(
    () => empleados.filter((e) =>
      !search ||
      `${e.nombre} ${e.apellido}`.toLowerCase().includes(search.toLowerCase()) ||
      (e.dpi ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [empleados, search]
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Empleados</h2>
          <p className="text-gray-400 text-sm">{empleados.length} empleados registrados</p>
        </div>
        <button onClick={() => { setEditEmp(null); setShowModal(true); }} className="flex items-center gap-2 bg-[#ffbc07] text-[#102c4d] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#e5a800] transition-colors shadow-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
          <IcoPlus /> Nuevo Empleado
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium"><IcoFilter /> Buscar:</div>
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IcoSearch /></span>
            <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d]" placeholder="Buscar por nombre o DPI…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Nombre", "DPI", "Teléfono", "Correo", "Cuenta de sistema", "Estado", "Acciones"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Cargando…</td></tr>}
            {!loading && filtered.map((emp) => (
              <tr key={emp.idempleado} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <IcoUser />{emp.nombre} {emp.apellido}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-600">{emp.dpi ?? "—"}</td>
                <td className="px-4 py-3.5 text-xs text-gray-600">{emp.telefono ?? "—"}</td>
                <td className="px-4 py-3.5 text-xs text-gray-600">{emp.correo ?? "—"}</td>
                <td className="px-4 py-3.5">
                  {idsConUsuario.has(emp.idempleado)
                    ? <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">Sí tiene</span>
                    : <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">Sin cuenta</span>}
                </td>
                <td className="px-4 py-3.5">
                  <Toggle active={emp.estado} onChange={() => cambiarEstado(emp.idempleado, !emp.estado)} />
                </td>
                <td className="px-4 py-3.5">
                  <ActionBtn onClick={() => { setEditEmp(emp); setShowModal(true); }} title="Editar" color="gold" icon={<IcoEdit />} />
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map((emp) => (
          <div key={emp.idempleado} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <IcoUser />{emp.nombre} {emp.apellido}
              </div>
              <Toggle active={emp.estado} onChange={() => cambiarEstado(emp.idempleado, !emp.estado)} />
            </div>
            <div className="text-xs text-gray-500">{emp.correo ?? "Sin correo"} · {emp.telefono ?? "Sin teléfono"}</div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              {idsConUsuario.has(emp.idempleado)
                ? <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">Con cuenta</span>
                : <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">Sin cuenta</span>}
              <ActionBtn onClick={() => { setEditEmp(emp); setShowModal(true); }} title="Editar" color="gold" icon={<IcoEdit />} />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <EmpleadoModal
          onClose={() => setShowModal(false)}
          initial={editEmp}
          tieneUsuario={editEmp ? idsConUsuario.has(editEmp.idempleado) : false}
          onSave={(payload) => (editEmp ? editar(editEmp.idempleado, payload) : crear(payload))}
        />
      )}
    </div>
  );
}

// ── Usuarios ───────────────────────────────────────────────────────────────────

function UsuarioCrearModal({ onClose, empleadosDisponibles, roles, onSave }: {
  onClose: () => void;
  empleadosDisponibles: Empleado[];
  roles: { idrol: number; nombre: string }[];
  onSave: (payload: { idempleado: number; correo: string; pass: string; idrol: number; usuario: string }) => Promise<{ error: string | null }>;
}) {
  const [form, setForm] = useState({ idempleado: "", usuario: "", pass: "", idrol: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const empleadoSel = empleadosDisponibles.find((e) => String(e.idempleado) === form.idempleado);

  async function guardar() {
    if (!form.idempleado || !form.usuario.trim() || !form.pass || !form.idrol) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (!empleadoSel?.correo) {
      setError("El empleado seleccionado no tiene correo registrado. Edítalo primero en Empleados.");
      return;
    }
    if (form.pass.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setSaving(true);
    const resultado = await onSave({
      idempleado: Number(form.idempleado),
      correo: empleadoSel.correo,
      pass: form.pass,
      idrol: Number(form.idrol),
      usuario: form.usuario.trim(),
    });
    setSaving(false);
    if (resultado.error) { setError(resultado.error); return; }
    onClose();
  }

  return (
    <Modal title="Nuevo Usuario del Sistema" onClose={onClose} wide>
      <ErrorBanner message={error} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="Empleado">
            <select className={selectCls} value={form.idempleado} onChange={(e) => set("idempleado", e.target.value)}>
              <option value="">Seleccionar…</option>
              {empleadosDisponibles.map((e) => (
                <option key={e.idempleado} value={e.idempleado}>{e.nombre} {e.apellido}{e.correo ? "" : " — sin correo registrado"}</option>
              ))}
            </select>
          </Field>
          {empleadoSel && (
            <p className="text-xs text-gray-400 mt-1.5">
              El acceso quedará ligado al correo: <span className="font-semibold text-gray-600">{empleadoSel.correo ?? "— (registra un correo antes)"}</span>
            </p>
          )}
        </div>
        <Field label="Nombre de usuario">
          <input className={inputCls} value={form.usuario} onChange={(e) => set("usuario", e.target.value)} placeholder="Ej. juan.lopez" />
        </Field>
        <Field label="Rol">
          <select className={selectCls} value={form.idrol} onChange={(e) => set("idrol", e.target.value)}>
            <option value="">Seleccionar…</option>
            {roles.map((r) => <option key={r.idrol} value={r.idrol}>{r.nombre}</option>)}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Contraseña inicial">
            <input type="password" className={inputCls} value={form.pass} onChange={(e) => set("pass", e.target.value)} placeholder="Mínimo 8 caracteres" />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
        <button disabled={saving} onClick={guardar} className="px-5 py-2 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60" style={{ fontFamily: "Outfit, sans-serif" }}>
          {saving ? "Creando…" : "Crear Usuario"}
        </button>
      </div>
    </Modal>
  );
}

function UsuarioEditarModal({ onClose, usuario, roles, onSave }: {
  onClose: () => void;
  usuario: Usuario;
  roles: { idrol: number; nombre: string }[];
  onSave: (payload: { idrol: number; usuario: string }) => Promise<{ error: string | null }>;
}) {
  const [form, setForm] = useState({ usuario: usuario.usuario, idrol: String(usuario.idrol) });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function guardar() {
    if (!form.usuario.trim() || !form.idrol) { setError("Todos los campos son obligatorios."); return; }
    setSaving(true);
    const resultado = await onSave({ idrol: Number(form.idrol), usuario: form.usuario.trim() });
    setSaving(false);
    if (resultado.error) { setError(resultado.error); return; }
    onClose();
  }

  return (
    <Modal title="Editar Usuario" onClose={onClose}>
      <ErrorBanner message={error} />
      <div className="space-y-4">
        <Field label="Empleado">
          <input className={inputDisabledCls} value={`${usuario.empleado?.nombre ?? ""} ${usuario.empleado?.apellido ?? ""}`} disabled />
        </Field>
        <Field label="Nombre de usuario">
          <input className={inputCls} value={form.usuario} onChange={(e) => set("usuario", e.target.value)} />
        </Field>
        <Field label="Rol">
          <select className={selectCls} value={form.idrol} onChange={(e) => set("idrol", e.target.value)}>
            {roles.map((r) => <option key={r.idrol} value={r.idrol}>{r.nombre}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
        <button disabled={saving} onClick={guardar} className="px-5 py-2 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60" style={{ fontFamily: "Outfit, sans-serif" }}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ onClose, usuario, onReset }: {
  onClose: () => void;
  usuario: Usuario;
  onReset: (nuevaPass: string) => Promise<{ error: string | null }>;
}) {
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function guardar() {
    setError(null);
    if (pass.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (pass !== confirmPass) { setError("Las contraseñas no coinciden."); return; }
    setSaving(true);
    const resultado = await onReset(pass);
    setSaving(false);
    if (resultado.error) { setError(resultado.error); return; }
    setSuccess("Contraseña actualizada correctamente.");
    setPass("");
    setConfirmPass("");
  }

  return (
    <Modal title={`Restablecer contraseña — ${usuario.usuario}`} onClose={onClose}>
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Esta acción cambia la contraseña de <strong>{usuario.empleado?.nombre} {usuario.empleado?.apellido}</strong> de
          inmediato.
        </p>
        <Field label="Nueva contraseña">
          <input type="password" className={inputCls} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Mínimo 8 caracteres" />
        </Field>
        <Field label="Confirmar contraseña">
          <input type="password" className={inputCls} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cerrar</button>
        <button disabled={saving} onClick={guardar} className="px-5 py-2 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60" style={{ fontFamily: "Outfit, sans-serif" }}>
          {saving ? "Guardando…" : "Restablecer"}
        </button>
      </div>
    </Modal>
  );
}

function UsuariosView() {
  const { usuarios, loading, error, crear, editar, cambiarEstado, restablecerPassword } = useUsuarios();
  const { empleados } = useEmpleados();
  const { roles } = useRoles();
  const [search, setSearch] = useState("");
  const [showCrear, setShowCrear] = useState(false);
  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const [resetUser, setResetUser] = useState<Usuario | null>(null);

  const empleadosDisponibles = useMemo(() => {
    const idsConUsuario = new Set(usuarios.map((u) => u.idempleado));
    return empleados.filter((e) => e.estado && !idsConUsuario.has(e.idempleado));
  }, [empleados, usuarios]);

  const filtered = useMemo(
    () => usuarios.filter((u) =>
      !search ||
      u.usuario.toLowerCase().includes(search.toLowerCase()) ||
      `${u.empleado?.nombre ?? ""} ${u.empleado?.apellido ?? ""}`.toLowerCase().includes(search.toLowerCase())
    ),
    [usuarios, search]
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Usuarios</h2>
          <p className="text-gray-400 text-sm">{usuarios.length} cuentas de acceso al sistema</p>
        </div>
        <button onClick={() => setShowCrear(true)} className="flex items-center gap-2 bg-[#ffbc07] text-[#102c4d] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#e5a800] transition-colors shadow-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
          <IcoPlus /> Nuevo Usuario
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium"><IcoFilter /> Buscar:</div>
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IcoSearch /></span>
            <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d]" placeholder="Buscar por usuario o nombre…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Usuario", "Empleado", "Rol", "Estado", "Acciones"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Cargando…</td></tr>}
            {!loading && filtered.map((u) => (
              <tr key={u.idusuario} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs font-semibold text-[#102c4d] bg-blue-50 px-2 py-0.5 rounded">{u.usuario}</span>
                </td>
                <td className="px-4 py-3.5 text-gray-900 font-medium">{u.empleado?.nombre} {u.empleado?.apellido}</td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2 py-0.5 rounded-full font-medium">
                    <IcoShield />{u.rol?.nombre ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <Toggle active={u.estado} onChange={() => cambiarEstado(u.idusuario, !u.estado)} />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-0.5">
                    <ActionBtn onClick={() => setEditUser(u)} title="Editar" color="gold" icon={<IcoEdit />} />
                    <ActionBtn onClick={() => setResetUser(u)} title="Restablecer contraseña" color="gray" icon={<IcoKey />} />
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map((u) => (
          <div key={u.idusuario} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-[#102c4d] bg-blue-50 px-2 py-0.5 rounded">{u.usuario}</span>
              <Toggle active={u.estado} onChange={() => cambiarEstado(u.idusuario, !u.estado)} />
            </div>
            <div className="font-semibold text-gray-900">{u.empleado?.nombre} {u.empleado?.apellido}</div>
            <span className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2 py-0.5 rounded-full font-medium w-fit"><IcoShield />{u.rol?.nombre ?? "—"}</span>
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <ActionBtn onClick={() => setEditUser(u)} title="Editar" color="gold" icon={<IcoEdit />} />
              <ActionBtn onClick={() => setResetUser(u)} title="Restablecer contraseña" color="gray" icon={<IcoKey />} />
            </div>
          </div>
        ))}
      </div>

      {showCrear && (
        <UsuarioCrearModal
          onClose={() => setShowCrear(false)}
          empleadosDisponibles={empleadosDisponibles}
          roles={roles}
          onSave={crear}
        />
      )}
      {editUser && (
        <UsuarioEditarModal
          onClose={() => setEditUser(null)}
          usuario={editUser}
          roles={roles}
          onSave={(payload) => editar(editUser.idusuario, payload)}
        />
      )}
      {resetUser && (
        <ResetPasswordModal
          onClose={() => setResetUser(null)}
          usuario={resetUser}
          onReset={(nuevaPass) => restablecerPassword(resetUser.idusuario, nuevaPass)}
        />
      )}
    </div>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────────────────

type ConfigTab = "empleados" | "usuarios";

export default function ConfigModule() {
  const [tab, setTab] = useState<ConfigTab>("empleados");

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 md:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {([
            { id: "empleados", label: "Empleados" },
            { id: "usuarios", label: "Usuarios" },
          ] as { id: ConfigTab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${tab === t.id ? "border-[#ffbc07] text-[#102c4d]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "empleados" && <EmpleadosView />}
        {tab === "usuarios" && <UsuariosView />}
      </div>
    </div>
  );
}