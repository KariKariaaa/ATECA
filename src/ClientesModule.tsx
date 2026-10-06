import { useState, useMemo } from "react";
import { useEmpresas } from "./uses/useEmpresas";
import { useContactos } from "./uses/useContactos";
import type { Empresa, Contacto } from "../types/inventory";

// ── Shared UI (mismo patrón que AssetsModule.tsx) ───────────────────────────────

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

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d] focus:ring-2 focus:ring-[#102c4d]/10 transition-all";
const selectCls = inputCls + " bg-white";

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
const IcoBuilding = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 2a1 1 0 00-1 1v14a1 1 0 001 1h3v-3a1 1 0 011-1h4a1 1 0 011 1v3h3a1 1 0 001-1V3a1 1 0 00-1-1H4zm2 3a1 1 0 011-1h1a1 1 0 010 2H7a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2h-1zM6 9a1 1 0 011-1h1a1 1 0 010 2H7a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2h-1z" clipRule="evenodd" /></svg>;
const IcoUser = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;

// ── Empresas ───────────────────────────────────────────────────────────────────

function EmpresaModal({ onClose, initial, onSave }: {
  onClose: () => void;
  initial?: Empresa | null;
  onSave: (payload: { nombre: string; direccion: string | null; nit: string | null; telefono: string | null; correo: string | null }) => Promise<{ error: string | null }>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    nombre: initial?.nombre ?? "",
    direccion: initial?.direccion ?? "",
    nit: initial?.nit ?? "",
    telefono: initial?.telefono ?? "",
    correo: initial?.correo ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function guardar() {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio."); return; }
    setSaving(true);
    const resultado = await onSave({
      nombre: form.nombre.trim(),
      direccion: form.direccion || null,
      nit: form.nit || null,
      telefono: form.telefono || null,
      correo: form.correo || null,
    });
    setSaving(false);
    if (resultado.error) { setError(resultado.error); return; }
    onClose();
  }

  return (
    <Modal title={isEdit ? "Editar Empresa" : "Nueva Empresa"} onClose={onClose} wide>
      <ErrorBanner message={error} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="Nombre / Razón social">
            <input className={inputCls} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Constructora Vega S.A." />
          </Field>
        </div>
        <Field label="NIT">
          <input className={inputCls} value={form.nit} onChange={(e) => set("nit", e.target.value)} placeholder="Ej. 123456-7" />
        </Field>
        <Field label="Teléfono">
          <input className={inputCls} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="Ej. 5555-1234" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Correo">
            <input type="email" className={inputCls} value={form.correo} onChange={(e) => set("correo", e.target.value)} placeholder="contacto@empresa.com" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Dirección">
            <textarea className={inputCls + " resize-none"} rows={2} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Dirección física de la empresa…" />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
        <button disabled={saving} onClick={guardar} className="px-5 py-2 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60" style={{ fontFamily: "Outfit, sans-serif" }}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear Empresa"}
        </button>
      </div>
    </Modal>
  );
}

function EmpresasView({ onVerContactos }: { onVerContactos: (idempresa: number) => void }) {
  const { empresas, loading, error, crear, editar, cambiarEstado } = useEmpresas();
  const { contactos } = useContactos();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState<Empresa | null>(null);

  const contactosPorEmpresa = useMemo(() => {
    const mapa = new Map<number, number>();
    contactos.forEach((c) => {
      if (c.idempresa) mapa.set(c.idempresa, (mapa.get(c.idempresa) ?? 0) + 1);
    });
    return mapa;
  }, [contactos]);

  const filtered = useMemo(
    () => empresas.filter((e) =>
      !search ||
      e.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (e.nit ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [empresas, search]
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Empresas</h2>
          <p className="text-gray-400 text-sm">{empresas.length} empresas registradas</p>
        </div>
        <button onClick={() => { setEditEmp(null); setShowModal(true); }} className="flex items-center gap-2 bg-[#ffbc07] text-[#102c4d] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#e5a800] transition-colors shadow-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
          <IcoPlus /> Nueva Empresa
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium"><IcoFilter /> Buscar:</div>
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IcoSearch /></span>
            <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d]" placeholder="Buscar por nombre o NIT…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Nombre", "NIT", "Teléfono", "Correo", "Contactos", "Estado", "Acciones"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Cargando…</td></tr>}
            {!loading && filtered.map((emp) => (
              <tr key={emp.idempresa} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <IcoBuilding />{emp.nombre}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-600">{emp.nit ?? "—"}</td>
                <td className="px-4 py-3.5 text-xs text-gray-600">{emp.telefono ?? "—"}</td>
                <td className="px-4 py-3.5 text-xs text-gray-600">{emp.correo ?? "—"}</td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => onVerContactos(emp.idempresa)}
                    className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2 py-0.5 rounded-full font-semibold hover:bg-[#102c4d]/15 transition-colors"
                  >
                    <IcoUser />{contactosPorEmpresa.get(emp.idempresa) ?? 0}
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <Toggle active={emp.estado} onChange={() => cambiarEstado(emp.idempresa, !emp.estado)} />
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
          <div key={emp.idempresa} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <IcoBuilding />{emp.nombre}
              </div>
              <Toggle active={emp.estado} onChange={() => cambiarEstado(emp.idempresa, !emp.estado)} />
            </div>
            <div className="text-xs text-gray-500">{emp.nit ?? "Sin NIT"} · {emp.telefono ?? "Sin teléfono"}</div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <button
                onClick={() => onVerContactos(emp.idempresa)}
                className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2 py-0.5 rounded-full font-semibold"
              >
                <IcoUser />{contactosPorEmpresa.get(emp.idempresa) ?? 0} contacto(s)
              </button>
              <ActionBtn onClick={() => { setEditEmp(emp); setShowModal(true); }} title="Editar" color="gold" icon={<IcoEdit />} />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <EmpresaModal
          onClose={() => setShowModal(false)}
          initial={editEmp}
          onSave={(payload) => (editEmp ? editar(editEmp.idempresa, payload) : crear(payload))}
        />
      )}
    </div>
  );
}

// ── Contactos ──────────────────────────────────────────────────────────────────

function ContactoModal({ onClose, empresas, initial, onSave }: {
  onClose: () => void;
  empresas: { idempresa: number; nombre: string }[];
  initial?: Contacto | null;
  onSave: (payload: {
    idempresa: number | null;
    cargo: string | null;
    nombre: string;
    apellido: string;
    dpi: string | null;
    correo: string | null;
    telefono: string | null;
  }) => Promise<{ error: string | null }>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    nombre: initial?.nombre ?? "",
    apellido: initial?.apellido ?? "",
    cargo: initial?.cargo ?? "",
    idempresa: initial?.idempresa ? String(initial.idempresa) : "",
    dpi: initial?.dpi ?? "",
    correo: initial?.correo ?? "",
    telefono: initial?.telefono ?? "",
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
      idempresa: form.idempresa ? Number(form.idempresa) : null,
      cargo: form.cargo || null,
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      dpi: form.dpi || null,
      correo: form.correo || null,
      telefono: form.telefono || null,
    });
    setSaving(false);
    if (resultado.error) { setError(resultado.error); return; }
    onClose();
  }

  return (
    <Modal title={isEdit ? "Editar Contacto" : "Nuevo Contacto"} onClose={onClose} wide>
      <ErrorBanner message={error} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre">
          <input className={inputCls} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Marco" />
        </Field>
        <Field label="Apellido">
          <input className={inputCls} value={form.apellido} onChange={(e) => set("apellido", e.target.value)} placeholder="Ej. Vega" />
        </Field>
        <Field label="Cargo">
          <input className={inputCls} value={form.cargo} onChange={(e) => set("cargo", e.target.value)} placeholder="Ej. Gerente de Obra" />
        </Field>
        <Field label="Empresa (opcional)">
          <select className={selectCls} value={form.idempresa} onChange={(e) => set("idempresa", e.target.value)}>
            <option value="">Ninguna</option>
            {empresas.map((emp) => (
              <option key={emp.idempresa} value={emp.idempresa}>{emp.nombre}</option>
            ))}
          </select>
        </Field>
        <Field label="DPI">
          <input className={inputCls} value={form.dpi} onChange={(e) => set("dpi", e.target.value)} placeholder="0000 00000 0000" />
        </Field>
        <Field label="Teléfono">
          <input className={inputCls} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="Ej. 5555-1234" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Correo">
            <input type="email" className={inputCls} value={form.correo} onChange={(e) => set("correo", e.target.value)} placeholder="correo@ejemplo.com" />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
        <button disabled={saving} onClick={guardar} className="px-5 py-2 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60" style={{ fontFamily: "Outfit, sans-serif" }}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear Contacto"}
        </button>
      </div>
    </Modal>
  );
}

function ContactosView({ filtroEmpresaInicial }: { filtroEmpresaInicial: number | null }) {
  const { contactos, loading, error, crear, editar, cambiarEstado } = useContactos();
  const { empresas } = useEmpresas();
  const [search, setSearch] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState(filtroEmpresaInicial ? String(filtroEmpresaInicial) : "");
  const [showModal, setShowModal] = useState(false);
  const [editCt, setEditCt] = useState<Contacto | null>(null);

  const filtered = useMemo(
    () => contactos.filter((c) =>
      (!filterEmpresa || String(c.idempresa) === filterEmpresa) &&
      (!search ||
        `${c.nombre} ${c.apellido}`.toLowerCase().includes(search.toLowerCase()) ||
        (c.dpi ?? "").toLowerCase().includes(search.toLowerCase()))
    ),
    [contactos, filterEmpresa, search]
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Contactos</h2>
          <p className="text-gray-400 text-sm">{contactos.length} contactos registrados</p>
        </div>
        <button onClick={() => { setEditCt(null); setShowModal(true); }} className="flex items-center gap-2 bg-[#ffbc07] text-[#102c4d] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#e5a800] transition-colors shadow-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
          <IcoPlus /> Nuevo Contacto
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium"><IcoFilter /> Filtros:</div>
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IcoSearch /></span>
            <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d]" placeholder="Buscar por nombre o DPI…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#102c4d] bg-white" value={filterEmpresa} onChange={(e) => setFilterEmpresa(e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map((emp) => <option key={emp.idempresa} value={emp.idempresa}>{emp.nombre}</option>)}
          </select>
          {(search || filterEmpresa) && (
            <button onClick={() => { setSearch(""); setFilterEmpresa(""); }} className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap">Limpiar</button>
          )}
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Nombre", "Cargo", "Empresa", "Teléfono", "Correo", "Estado", "Acciones"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Cargando…</td></tr>}
            {!loading && filtered.map((c) => (
              <tr key={c.idcontacto} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <IcoUser />{c.nombre} {c.apellido}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-600">{c.cargo ?? "—"}</td>
                <td className="px-4 py-3.5">
                  {c.empresa?.nombre
                    ? <span className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2 py-0.5 rounded-full font-medium"><IcoBuilding />{c.empresa.nombre}</span>
                    : <span className="text-xs text-gray-400">Sin empresa</span>}
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-600">{c.telefono ?? "—"}</td>
                <td className="px-4 py-3.5 text-xs text-gray-600">{c.correo ?? "—"}</td>
                <td className="px-4 py-3.5">
                  <Toggle active={c.estado} onChange={() => cambiarEstado(c.idcontacto, !c.estado)} />
                </td>
                <td className="px-4 py-3.5">
                  <ActionBtn onClick={() => { setEditCt(c); setShowModal(true); }} title="Editar" color="gold" icon={<IcoEdit />} />
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
        {filtered.map((c) => (
          <div key={c.idcontacto} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <IcoUser />{c.nombre} {c.apellido}
              </div>
              <Toggle active={c.estado} onChange={() => cambiarEstado(c.idcontacto, !c.estado)} />
            </div>
            <div className="text-xs text-gray-500">{c.cargo ?? "Sin cargo"}</div>
            {c.empresa?.nombre
              ? <span className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2 py-0.5 rounded-full font-medium w-fit"><IcoBuilding />{c.empresa.nombre}</span>
              : <span className="text-xs text-gray-400">Sin empresa</span>}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs text-gray-500">
              <span>{c.telefono ?? "—"}</span>
              <ActionBtn onClick={() => { setEditCt(c); setShowModal(true); }} title="Editar" color="gold" icon={<IcoEdit />} />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ContactoModal
          onClose={() => setShowModal(false)}
          empresas={empresas}
          initial={editCt}
          onSave={(payload) => (editCt ? editar(editCt.idcontacto, payload) : crear(payload))}
        />
      )}
    </div>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────────────────

type ClientTab = "empresas" | "contactos";

export default function ClientsModule() {
  const [tab, setTab] = useState<ClientTab>("empresas");
  const [filtroEmpresa, setFiltroEmpresa] = useState<number | null>(null);

  const irAContactosDe = (idempresa: number) => {
    setFiltroEmpresa(idempresa);
    setTab("contactos");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 md:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {([
            { id: "empresas", label: "Empresas" },
            { id: "contactos", label: "Contactos" },
          ] as { id: ClientTab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id === "empresas") setFiltroEmpresa(null); }}
              className={`flex-shrink-0 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${tab === t.id ? "border-[#ffbc07] text-[#102c4d]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "empresas" && <EmpresasView onVerContactos={irAContactosDe} />}
        {tab === "contactos" && <ContactosView filtroEmpresaInicial={filtroEmpresa} />}
      </div>
    </div>
  );
}