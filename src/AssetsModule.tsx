import { useState, useMemo } from "react";
import { useCategorias } from "./uses/useCategorias";
import { useActivos, useEstadosActivo } from "./uses/useActivos";
import { useTarifas } from "./uses/useTarifas";
import { useMantenimientos } from "./uses/useMantenimientos";
import type { Activo, Categoria } from "../types/inventory";
import { fmtQ, formatearFecha } from "../types/format";
import { QRCodeSVG } from "qrcode.react";

// ── Shared UI ──────────────────────────────────────────────────────────────────

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
const IcoQR = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zm-2 7a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zm8-12a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1zM9 9a1 1 0 000 2h1a1 1 0 100-2H9zm7 0a1 1 0 10-2 0v1h1a1 1 0 001-1zm-1 4a1 1 0 10-2 0 1 1 0 002 0zm-5 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>;
const IcoPlus = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const IcoFilter = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const IcoAlert = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const IcoSearch = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const IcoTag = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>;
const IcoCheck = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const IcoWrench = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-.992 0l-1.735-.992a1 1 0 01-.372-1.364z" clipRule="evenodd" /></svg>;

const estadoActivoColors: Record<string, { cls: string; dot: string }> = {
  Disponible: { cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Alquilado: { cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  "En Mantenimiento": { cls: "bg-red-100 text-red-700", dot: "bg-red-500" },
  Inactivo: { cls: "bg-gray-200 text-gray-600", dot: "bg-gray-400" },
};

function EstadoBadge({ nombre }: { nombre: string }) {
  const cfg = estadoActivoColors[nombre] ?? { cls: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {nombre}
    </span>
  );
}

// ── Helpers de fecha para el ciclo de mantenimiento (5 meses) ──────────────────

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function maintenanceDueIn(ultimaReferencia: string | null) {
  if (!ultimaReferencia) return null; // sin dato base, no se puede calcular
  const TARGET_DAYS = 150; // ~5 meses
  return TARGET_DAYS - daysSince(ultimaReferencia);
}

function maintBadge(dueIn: number | null) {
  if (dueIn === null) return null;
  if (dueIn <= 0) return { label: "¡Vencido!", cls: "bg-red-100 text-red-700 border border-red-300", dot: "bg-red-500" };
  if (dueIn <= 20) return { label: `${dueIn}d`, cls: "bg-red-100 text-red-700 border border-red-300", dot: "bg-red-500" };
  if (dueIn <= 45) return { label: `${dueIn}d`, cls: "bg-amber-100 text-amber-700 border border-amber-200", dot: "bg-amber-400" };
  return null;
}

// ── Categorías ─────────────────────────────────────────────────────────────────

function CategoriesView() {
  const { categorias, loading, error, crear, editar, cambiarEstado } = useCategorias();
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState<Categoria | null>(null);
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setFormName(""); setEditCat(null); setFormError(null); setShowModal(true); };
  const openEdit = (c: Categoria) => { setFormName(c.nombre); setEditCat(c); setFormError(null); setShowModal(true); };

  async function guardar() {
    if (!formName.trim()) { setFormError("El nombre es obligatorio."); return; }
    setSaving(true);
    const resultado = editCat
      ? await editar(editCat.idcategoria, formName.trim())
      : await crear(formName.trim());
    setSaving(false);
    if (resultado.error) { setFormError(resultado.error); return; }
    setShowModal(false);
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Categorías</h2>
          <p className="text-gray-400 text-sm">Clasificación de activos</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#ffbc07] text-[#102c4d] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#e5a800] transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
          <IcoPlus /> Nueva Categoría
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Nombre</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">Estado</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={3} className="text-center py-8 text-gray-400 text-sm">Cargando…</td></tr>
            )}
            {!loading && categorias.map((c) => (
              <tr key={c.idcategoria} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <IcoTag />
                    {c.nombre}
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <Toggle active={c.estado} onChange={() => cambiarEstado(c.idcategoria, !c.estado)} />
                </td>
                <td className="px-3 py-3.5">
                  <ActionBtn onClick={() => openEdit(c)} title="Editar" color="gold" icon={<IcoEdit />} />
                </td>
              </tr>
            ))}
            {!loading && categorias.length === 0 && (
              <tr><td colSpan={3} className="text-center py-8 text-gray-400 text-sm">Sin categorías registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editCat ? "Editar Categoría" : "Nueva Categoría"} onClose={() => setShowModal(false)}>
          <ErrorBanner message={formError} />
          <Field label="Nombre de la categoría">
            <input className={inputCls} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej. Andamio" autoFocus />
          </Field>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
            <button disabled={saving} onClick={guardar} className="px-5 py-2 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60" style={{ fontFamily: "Outfit, sans-serif" }}>
              {saving ? "Guardando…" : editCat ? "Guardar" : "Crear"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Activo Modal (crear/editar) ─────────────────────────────────────────────────

function AssetModal({ onClose, categorias, estados, initial, onSave }: {
  onClose: () => void;
  categorias: { idcategoria: number; nombre: string }[];
  estados: { idestadoactivo: number; nombre: string }[];
  initial?: Activo | null;
  onSave: (payload: {
    idcategoria: number;
    idestadoactivo: number;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    descripcion: string | null;
    fechacompra: string | null;
    codigoqr: string | null;
  }) => Promise<{ error: string | null }>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    nombre: initial?.nombre ?? "",
    idcategoria: initial?.idcategoria ? String(initial.idcategoria) : "",
    idestadoactivo: initial?.idestadoactivo ? String(initial.idestadoactivo) : "",
    marca: initial?.marca ?? "",
    modelo: initial?.modelo ?? "",
    descripcion: initial?.descripcion ?? "",
    fechacompra: initial?.fechacompra ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function guardar() {
    if (!form.nombre.trim() || !form.idcategoria || !form.idestadoactivo) {
      setError("Nombre, categoría y estado son obligatorios.");
      return;
    }

    setSaving(true);

    const resultado = await onSave({
      idcategoria: Number(form.idcategoria),
      idestadoactivo: Number(form.idestadoactivo),
      nombre: form.nombre.trim(),
      marca: form.marca || null,
      modelo: form.modelo || null,
      descripcion: form.descripcion || null,
      fechacompra: form.fechacompra || null,
      codigoqr: isEdit ? initial?.codigoqr ?? null : null,
    });

    setSaving(false);

    if (resultado.error) {
      setError(resultado.error);
      return;
    }

    onClose();
  }

  return (
    <Modal title={isEdit ? "Editar Activo" : "Nuevo Activo"} onClose={onClose} wide>
      <ErrorBanner message={error} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre del activo">
          <input className={inputCls} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Andamio Tubular 48mm" />
        </Field>
        <Field label="Categoría">
          <select className={selectCls} value={form.idcategoria} onChange={(e) => set("idcategoria", e.target.value)}>
            <option value="">Seleccionar…</option>
            {categorias.map((c) => (
              <option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select className={selectCls} value={form.idestadoactivo} onChange={(e) => set("idestadoactivo", e.target.value)}>
            <option value="">Seleccionar…</option>
            {estados.map((e) => (
              <option key={e.idestadoactivo} value={e.idestadoactivo}>{e.nombre}</option>
            ))}
          </select>
        </Field>
        <Field label="Marca">
          <input className={inputCls} value={form.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Ej. Layher" />
        </Field>
        <Field label="Modelo">
          <input className={inputCls} value={form.modelo} onChange={(e) => set("modelo", e.target.value)} placeholder="Ej. Allround R7" />
        </Field>
        <Field label="Fecha de compra">
          <input type="date" className={inputCls} value={form.fechacompra ?? ""} onChange={(e) => set("fechacompra", e.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Descripción">
            <textarea className={inputCls + " resize-none"} rows={2} value={form.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} placeholder="Detalles adicionales del activo…" />
          </Field>
        </div>
      </div>

      {isEdit && initial?.codigoqr && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h3
              className="text-sm font-bold text-[#102c4d]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Código QR del activo
            </h3>

            <QRCodeSVG
              value={initial.codigoqr}
              size={180}
              level="M"
              marginSize={4}
              title={`Código QR del activo ${initial.nombre}`}
            />

            <p className="text-sm font-semibold tracking-wide text-[#102c4d]">
              {initial.codigoqr}
            </p>

            <p className="text-center text-xs text-gray-500">
              Este código identifica permanentemente al activo.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
        <button disabled={saving} onClick={guardar} className="px-5 py-2 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60" style={{ fontFamily: "Outfit, sans-serif" }}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear Activo"}
        </button>
      </div>
    </Modal>
  );
}

// ── Lista de Activos ─────────────────────────────────────────────────────────────

function AssetsList() {
  const { activos, loading, error, crear, editar } = useActivos();
  const { categorias } = useCategorias();
  const { estados } = useEstadosActivo();

  const [filterCat, setFilterCat] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editAsset, setEditAsset] = useState<Activo | null>(null);

  const filtered = useMemo(
    () =>
      activos.filter(
        (a) =>
          (!filterCat || String(a.idcategoria) === filterCat) &&
          (!filterEstado || String(a.idestadoactivo) === filterEstado) &&
          (!filterSearch ||
            a.nombre.toLowerCase().includes(filterSearch.toLowerCase()) ||
            (a.codigoqr ?? "").toLowerCase().includes(filterSearch.toLowerCase()))
      ),
    [activos, filterCat, filterEstado, filterSearch]
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Activos</h2>
          <p className="text-gray-400 text-sm">{activos.length} equipos registrados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#ffbc07] text-[#102c4d] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#e5a800] transition-colors shadow-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
          <IcoPlus /> Nuevo Activo
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium"><IcoFilter /> Filtros:</div>
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IcoSearch /></span>
            <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d]" placeholder="Buscar por nombre o código…" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
          </div>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#102c4d] bg-white" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
          </select>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#102c4d] bg-white" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {estados.map((e) => <option key={e.idestadoactivo} value={e.idestadoactivo}>{e.nombre}</option>)}
          </select>
          {(filterCat || filterEstado || filterSearch) && (
            <button onClick={() => { setFilterCat(""); setFilterEstado(""); setFilterSearch(""); }} className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap">Limpiar</button>
          )}
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Código", "Nombre", "Categoría", "Marca / Modelo", "Estado", "Acciones"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">Cargando…</td></tr>}
            {!loading && filtered.map((asset) => (
              <tr key={asset.idactivo} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[#102c4d]"><IcoQR /></span>
                    <span className="font-mono text-xs font-semibold text-[#102c4d] bg-blue-50 px-2 py-0.5 rounded">{asset.codigoqr ?? "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-medium text-gray-900 max-w-[180px] truncate">{asset.nombre}</td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2 py-0.5 rounded-full font-medium">
                    <IcoTag />{asset.categoria?.nombre ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-600">{asset.marca ?? "—"} · {asset.modelo ?? "—"}</td>
                <td className="px-4 py-3.5"><EstadoBadge nombre={asset.estadoActivo?.nombre ?? "—"} /></td>
                <td className="px-4 py-3.5">
                  <ActionBtn onClick={() => setEditAsset(asset)} title="Editar" color="gold" icon={<IcoEdit />} />
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Sin resultados para los filtros seleccionados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map((asset) => (
          <div key={asset.idactivo} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs font-semibold text-[#102c4d] bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                  <IcoQR />{asset.codigoqr ?? "—"}
                </span>
                <div className="font-semibold text-gray-900 mt-1.5">{asset.nombre}</div>
                <div className="text-xs text-gray-500 mt-0.5">{asset.marca ?? "—"} · {asset.modelo ?? "—"}</div>
              </div>
              <EstadoBadge nombre={asset.estadoActivo?.nombre ?? "—"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2 py-0.5 rounded-full font-medium">
                <IcoTag />{asset.categoria?.nombre ?? "—"}
              </span>
              <ActionBtn onClick={() => setEditAsset(asset)} title="Editar" color="gold" icon={<IcoEdit />} />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <AssetModal
          onClose={() => setShowModal(false)}
          categorias={categorias}
          estados={estados}
          onSave={crear}
        />
      )}
      {editAsset && (
        <AssetModal
          onClose={() => setEditAsset(null)}
          categorias={categorias}
          estados={estados}
          initial={editAsset}
          onSave={(payload) => editar(editAsset.idactivo, payload)}
        />
      )}
    </div>
  );
}

// ── Tarifas ────────────────────────────────────────────────────────────────────

function RatesView() {
  const { tarifas, loading, error, crear, tieneVigente } = useTarifas();
  const { categorias } = useCategorias();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ idcategoria: "", preciosemana: "", preciomes: "", preciodiaunico: "", preciodiaextra: "", fechainicio: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function obtenerFechaHoy() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  }

  function cerrarModal() {
    setShowModal(false);
    setFormError(null);
    setForm({
      idcategoria: "",
      preciosemana: "",
      preciomes: "",
      preciodiaunico: "",
      preciodiaextra: "",
      fechainicio: "",
    });
    setSaving(false);
  }

  const hasActive = form.idcategoria ? tieneVigente(Number(form.idcategoria)) : false;

  async function guardar() {
    if (!form.idcategoria || !form.fechainicio || !form.preciosemana || !form.preciomes || !form.preciodiaunico || !form.preciodiaextra) {
      setFormError("Todos los campos son obligatorios.");
      return;
    }

    const precios = [
      { nombre: "Precio por semana", valor: form.preciosemana },
      { nombre: "Precio por mes", valor: form.preciomes },
      { nombre: "Precio por día único", valor: form.preciodiaunico },
      { nombre: "Precio por día extra", valor: form.preciodiaextra },
    ];

    const precioNegativo = precios.find(
      (p) => Number(p.valor) < 0
    );

    if (precioNegativo) {
      setFormError(`${precioNegativo.nombre} no puede ser negativo.`);
      return;
    }
    setSaving(true);
    const resultado = await crear({
      idcategoria: Number(form.idcategoria),
      preciosemana: Number(form.preciosemana),
      preciomes: Number(form.preciomes),
      preciodiaunico: Number(form.preciodiaunico),
      preciodiaextra: Number(form.preciodiaextra),
      fechainicio: form.fechainicio,
    });
    setSaving(false);
    if (resultado.error) { setFormError(resultado.error); return; }
    cerrarModal();
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Tarifas</h2>
          <p className="text-gray-400 text-sm">Precios por categoría (Quetzales) · Las tarifas anteriores se mantienen como históricas</p>
        </div>
        <button 
        onClick={() => {
          setForm({
            idcategoria: "",
            preciosemana: "",
            preciomes: "",
            preciodiaunico: "",
            preciodiaextra: "",
            fechainicio: obtenerFechaHoy(),
          });
          setFormError(null);
          setShowModal(true);
        }}
        className="flex items-center gap-2 bg-[#ffbc07] text-[#102c4d] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#e5a800] transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
          <IcoPlus /> Nueva Tarifa
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Categoría", "Semana", "Mes", "Día único", "Día extra", "Fecha inicio", "Fecha fin", "Estado"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">Cargando…</td></tr>}
            {!loading && tarifas.map((r) => (
              <tr key={r.idtarifaactivo} className={`transition-colors ${r.estado ? "hover:bg-gray-50/50" : "bg-gray-50/50 opacity-60"}`}>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2 py-0.5 rounded-full font-semibold">
                    <IcoTag />{r.categoria?.nombre ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-semibold text-gray-900">{fmtQ(r.preciosemana)}</td>
                <td className="px-4 py-3.5 font-semibold text-gray-900">{fmtQ(r.preciomes)}</td>
                <td className="px-4 py-3.5 font-semibold text-gray-900">{fmtQ(r.preciodiaunico)}</td>
                <td className="px-4 py-3.5 font-semibold text-gray-900">{fmtQ(r.preciodiaextra)}</td>
                <td className="px-4 py-3.5 text-xs text-gray-600">
                  {formatearFecha(r.fechainicio)}
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-600">
                  {r.fechafin
                    ? formatearFecha(r.fechafin)
                    : <span className="text-emerald-600 font-semibold">Vigente</span>}
                </td>
                <td className="px-4 py-3.5">
                  {r.estado
                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full"><IcoCheck />Activa</span>
                    : <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">Histórica</span>}
                </td>
              </tr>
            ))}
            {!loading && tarifas.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">Sin tarifas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {tarifas.map((r) => (
          <div key={r.idtarifaactivo} className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3 ${!r.estado ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2 py-0.5 rounded-full font-semibold"><IcoTag />{r.categoria?.nombre ?? "—"}</span>
              {r.estado
                ? <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">Activa</span>
                : <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">Histórica</span>}
            </div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              {[["Semana", fmtQ(r.preciosemana)], ["Mes", fmtQ(r.preciomes)], ["Día único", fmtQ(r.preciodiaunico)], ["Día extra", fmtQ(r.preciodiaextra)]].map(([k, v]) => (
                <div key={k}><div className="text-xs text-gray-400">{k}</div><div className="font-semibold text-gray-900">{v}</div></div>
              ))}
            </div>
            <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
              <span>Inicio: {r.fechainicio}</span>
              <span>Fin: {r.fechafin ?? <span className="text-emerald-600 font-semibold">Vigente</span>}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title="Nueva Tarifa" onClose={cerrarModal} wide>
          <ErrorBanner message={formError} />
          <div className="space-y-4">
            {hasActive && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <span className="text-amber-500 mt-0.5 flex-shrink-0"><IcoAlert /></span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Tarifa vigente existente</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Esa categoría ya tiene una tarifa activa. Al guardar, la anterior quedará marcada automáticamente como <strong>histórica</strong>.
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Categoría">
                  <select className={selectCls} value={form.idcategoria} onChange={(e) => setF("idcategoria", e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {categorias.map((c) => <option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Precio por semana (Q)"><input type="number" step="0.01" className={inputCls} value={form.preciosemana} onChange={(e) => setF("preciosemana", e.target.value)} placeholder="850.00" /></Field>
              <Field label="Precio por mes (Q)"><input type="number" step="0.01" className={inputCls} value={form.preciomes} onChange={(e) => setF("preciomes", e.target.value)} placeholder="2800.00" /></Field>
              <Field label="Precio día único (Q)"><input type="number" step="0.01" className={inputCls} value={form.preciodiaunico} onChange={(e) => setF("preciodiaunico", e.target.value)} placeholder="150.00" /></Field>
              <Field label="Precio día extra (Q)"><input type="number" step="0.01" className={inputCls} value={form.preciodiaextra} onChange={(e) => setF("preciodiaextra", e.target.value)} placeholder="120.00" /></Field>
              <div className="sm:col-span-2">
                <Field label="Fecha de inicio vigencia">
                  <input type="date" className={inputCls} value={form.fechainicio} onChange={(e) => setF("fechainicio", e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={cerrarModal}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button disabled={saving} onClick={guardar} className="px-5 py-2 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60" style={{ fontFamily: "Outfit, sans-serif" }}>
              {saving ? "Guardando…" : "Crear Tarifa"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Mantenimientos ─────────────────────────────────────────────────────────────

function MantenimientoModal({ onClose, activos, activoUrgentesIds, onSave }: {
  onClose: () => void;
  activos: Activo[];
  activoUrgentesIds: Set<number>;
  onSave: (payload: { idactivo: number; fecha: string; descripcion: string | null; costo: number }) => Promise<{ error: string | null }>;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ idactivo: "", fecha: hoy, descripcion: "", costo: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function guardar() {
    if (!form.idactivo || !form.fecha) { setError("Selecciona el activo y la fecha."); return; }
    setSaving(true);
    const resultado = await onSave({
      idactivo: Number(form.idactivo),
      fecha: form.fecha,
      descripcion: form.descripcion || null,
      costo: form.costo ? Number(form.costo) : 0,
    });
    setSaving(false);
    if (resultado.error) { setError(resultado.error); return; }
    onClose();
  }

  return (
    <Modal title="Registrar Mantenimiento" onClose={onClose} wide>
      <ErrorBanner message={error} />
      <div className="space-y-4">
        <Field label="Activo">
          <select className={selectCls} value={form.idactivo} onChange={(e) => set("idactivo", e.target.value)}>
            <option value="">Seleccionar activo…</option>
            {activos.map((a) => (
              <option key={a.idactivo} value={a.idactivo}>
                {activoUrgentesIds.has(a.idactivo) ? "⚠ " : ""}{a.codigoqr ?? a.idactivo} — {a.nombre}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha">
            <input type="date" className={inputCls} value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </Field>
          <Field label="Costo (Q)">
            <input type="number" step="0.01" className={inputCls} value={form.costo} onChange={(e) => set("costo", e.target.value)} placeholder="450.00" />
          </Field>
        </div>
        <Field label="Descripción del trabajo">
          <textarea className={inputCls + " resize-none"} rows={3} value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Describe el mantenimiento realizado…" />
        </Field>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
        <button disabled={saving} onClick={guardar} className="px-5 py-2 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60" style={{ fontFamily: "Outfit, sans-serif" }}>
          {saving ? "Guardando…" : "Guardar Registro"}
        </button>
      </div>
    </Modal>
  );
}

function MaintenancesView() {
  const { mantenimientos, loading, error, crear } = useMantenimientos();
  const { activos } = useActivos();
  const { estados } = useEstadosActivo();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Activos que sí pueden recibir mantenimiento: excluye "Inactivo"
  // (un activo dado de baja no debería seguir en el ciclo de revisión).
  const activosElegibles = useMemo(
    () => activos.filter((a) => a.estadoActivo?.nombre !== "Inactivo"),
    [activos]
  );

  // Última fecha de mantenimiento por activo (el primero que aparece
  // por idactivo, ya que la lista viene ordenada por fecha desc).
  const ultimaFechaPorActivo = useMemo(() => {
    const mapa = new Map<number, string>();
    mantenimientos.forEach((m) => {
      if (!mapa.has(m.idactivo)) mapa.set(m.idactivo, m.fecha);
    });
    return mapa;
  }, [mantenimientos]);

  // Para cada activo elegible: usa su último mantenimiento, o si
  // nunca tuvo uno, usa la fecha de compra como referencia base.
  const alertas = useMemo(() => {
    return activosElegibles
      .map((a) => {
        const referencia = ultimaFechaPorActivo.get(a.idactivo) ?? a.fechacompra;
        const dueIn = maintenanceDueIn(referencia);
        return { activo: a, dueIn, badge: maintBadge(dueIn) };
      })
      .filter((x) => x.badge !== null)
      .sort((a, b) => (a.dueIn ?? 0) - (b.dueIn ?? 0));
  }, [activosElegibles, ultimaFechaPorActivo]);

  const activoUrgentesIds = useMemo(
    () => new Set(alertas.filter((a) => (a.dueIn ?? 999) <= 20).map((a) => a.activo.idactivo)),
    [alertas]
  );

  const filtered = useMemo(
    () => mantenimientos.filter((m) =>
      !search ||
      (m.activo?.nombre ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (m.descripcion ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [mantenimientos, search]
  );

  async function handleGuardar(payload: { idactivo: number; fecha: string; descripcion: string | null; costo: number }) {
    const resultado = await crear(payload);
    if (resultado.error) return resultado;

    // Si el activo estaba "En Mantenimiento", regresarlo a "Disponible"
    // automáticamente -- tal como definimos en el flujo del sistema.
    const activo = activos.find((a) => a.idactivo === payload.idactivo);
    const disponible = estados.find((e) => e.nombre === "Disponible");
    if (activo?.estadoActivo?.nombre === "En Mantenimiento" && disponible) {
      const { supabase } = await import("../supabaseClient");
      await supabase.from("tbactivo").update({ idestadoactivo: disponible.idestadoactivo }).eq("idactivo", payload.idactivo);
    }

    return resultado;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Mantenimientos</h2>
          <p className="text-gray-400 text-sm">{mantenimientos.length} registros · ciclo de revisión: 5 meses</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#ffbc07] text-[#102c4d] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#e5a800] transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
          <IcoPlus /> Registrar Mantenimiento
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {alertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 mt-0.5 flex-shrink-0"><IcoWrench /></span>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800 mb-2">{alertas.length} activo(s) próximos a vencer ciclo de mantenimiento</p>
              <div className="flex flex-wrap gap-2">
                {alertas.map(({ activo, dueIn, badge }) => (
                  <span key={activo.idactivo} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${badge!.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge!.dot}`} />
                    {activo.codigoqr ?? activo.nombre} — {(dueIn ?? 0) <= 0 ? "¡Vencido!" : `${dueIn}d restantes`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IcoSearch /></span>
        <input className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#102c4d] shadow-sm" placeholder="Buscar por activo o descripción…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Activo", "Fecha", "Descripción", "Costo"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Cargando…</td></tr>}
            {!loading && filtered.map((m) => (
              <tr key={m.idmantenimiento} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#102c4d] bg-blue-50 px-2 py-0.5 rounded">{m.activo?.codigoqr ?? "—"}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.activo?.nombre ?? "—"}</div>
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">{formatearFecha(m.fecha)}</td>
                <td className="px-4 py-3.5 text-sm text-gray-700 max-w-xs">{m.descripcion ?? "—"}</td>
                <td className="px-4 py-3.5 font-semibold text-gray-900 whitespace-nowrap">{fmtQ(m.costo)}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && <tr><td colSpan={4} className="text-center py-12 text-gray-400 text-sm">Sin registros.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map((m) => (
          <div key={m.idmantenimiento} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2">
            <span className="font-mono text-xs font-semibold text-[#102c4d] bg-blue-50 px-2 py-0.5 rounded w-fit inline-block">{m.activo?.codigoqr ?? "—"}</span>
            <div className="text-sm font-medium text-gray-900">{m.activo?.nombre ?? "—"}</div>
            <div className="text-xs text-gray-600">{m.descripcion ?? "—"}</div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <span className="text-xs text-gray-400">{m.fecha}</span>
              <span className="font-bold text-[#102c4d] text-sm">{fmtQ(m.costo)}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <MantenimientoModal
          onClose={() => setShowModal(false)}
          activos={activosElegibles}
          activoUrgentesIds={activoUrgentesIds}
          onSave={handleGuardar}
        />
      )}
    </div>
  );
}

// ── Tab bar for Assets sub-module ─────────────────────────────────────────────

type AssetTab = "list" | "categories" | "rates" | "maintenances";

const assetTabs: { id: AssetTab; label: string }[] = [
  { id: "list", label: "Activos" },
  { id: "categories", label: "Categorías" },
  { id: "rates", label: "Tarifas" },
  { id: "maintenances", label: "Mantenimientos" },
];

export default function AssetsModule() {
  const [tab, setTab] = useState<AssetTab>("list");

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 md:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {assetTabs.map((t) => (
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
        {tab === "list" && <AssetsList />}
        {tab === "categories" && <CategoriesView />}
        {tab === "rates" && <RatesView />}
        {tab === "maintenances" && <MaintenancesView />}
      </div>
    </div>
  );
}