import { useState, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./uses/useAuth";
import { useContactos } from "./uses/useContactos";
import { useEmpleados } from "./uses/useEmpleados";
import { useActivos, useEstadosActivo } from "./uses/useActivos";
import { useTarifas } from "./uses/useTarifas";
import { useCotizaciones } from "./uses/useCotizaciones";
import { useEstadosCotizacion } from "./uses/useEstadosCotizacion";
import { useAlquileres } from "./uses/useAlquileres";
import { useEstadosAlquiler } from "./uses/useEstadosAlquiler";
import type { Activo, Contacto, Empleado, TarifaActivo, DetalleAlquiler } from "../types/inventory";

// ── Helpers de formato y fecha ──────────────────────────────────────────────────

const fmt = (n: number) => "Q " + n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function totalDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  return Math.max(1, Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000));
}

function durationParts(days: number) {
  const months = Math.floor(days / 30);
  const weeks = Math.floor((days % 30) / 7);
  return { months, weeks, days: days % 7 };
}

function durationLabel(startDate: string, endDate: string) {
  const p = durationParts(totalDays(startDate, endDate));
  const labels = [
    p.months ? `${p.months} ${p.months === 1 ? "mes" : "meses"}` : "",
    p.weeks ? `${p.weeks} ${p.weeks === 1 ? "semana" : "semanas"}` : "",
    p.days ? `${p.days} ${p.days === 1 ? "día" : "días"}` : "",
  ].filter(Boolean);
  return labels.length ? labels.join(", ") : "1 día";
}

// Misma fórmula que usamos en Cotizaciones -- pendiente de
// confirmar en la reunión que mencionaste, la dejo igual en
// ambos módulos por consistencia mientras tanto.
function calcularSubtotal(tarifa: { preciosemana: number; preciomes: number; preciodiaunico: number; preciodiaextra: number }, startDate: string, endDate: string, descuento: number) {
  const days = totalDays(startDate, endDate);
  const { months, weeks, days: rem } = durationParts(days);
  const dayCost = days === 1
    ? tarifa.preciodiaunico
    : months === 0 && weeks === 0
      ? tarifa.preciodiaunico + (days - 1) * tarifa.preciodiaextra
      : rem * tarifa.preciodiaextra;
  const bruto = months * tarifa.preciomes + weeks * tarifa.preciosemana + dayCost;
  return Math.max(0, bruto - descuento);
}

function relatedOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function displayContact(c: Contacto) {
  return { id: c.idcontacto, name: `${c.nombre} ${c.apellido}`.trim(), company: c.empresa?.nombre ?? "—", phone: c.telefono ?? "—" };
}
function displayEmployee(e: Pick<Empleado, "nombre" | "apellido">) {
  return `${e.nombre} ${e.apellido}`.trim();
}

type RentalStatusLabel = "Iniciado" | "Parcial" | "Completado" | "Cancelado";
function statusLabel(nombre: string | undefined): RentalStatusLabel {
  const n = (nombre ?? "").toLowerCase();
  if (n === "parcial") return "Parcial";
  if (n === "completado") return "Completado";
  if (n === "cancelado") return "Cancelado";
  return "Iniciado";
}

const STATUS_CFG: Record<RentalStatusLabel, { cls: string; dot: string }> = {
  Iniciado:   { cls: "bg-blue-100 text-blue-700",       dot: "bg-blue-500" },
  Parcial:    { cls: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
  Completado: { cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Cancelado:  { cls: "bg-red-100 text-red-700",         dot: "bg-red-500" },
};

function RentalBadge({ status }: { status: RentalStatusLabel }) {
  const c = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function LineBadge({ estadoDevuelto }: { estadoDevuelto: boolean | null }) {
  if (estadoDevuelto === null) return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Pendiente</span>;
  if (estadoDevuelto) return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Devuelto</span>;
  return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">Dañado</span>;
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, size = "lg" }: {
  title: string; onClose: () => void; children: React.ReactNode; size?: "lg" | "xl" | "full";
}) {
  const sizeMap = { lg: "max-w-lg", xl: "max-w-2xl", full: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 md:p-6 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeMap[size]} my-4`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-[#102c4d] font-bold text-base" style={{ fontFamily: "Outfit, sans-serif" }}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d] focus:ring-2 focus:ring-[#102c4d]/10 transition-all bg-white";

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

// ── Return Modal ───────────────────────────────────────────────────────────────

function ReturnModal({ linea, fechaInicioAlquiler, onClose, onSave }: {
  linea: DetalleAlquiler;
  fechaInicioAlquiler: string;
  onClose: () => void;
  onSave: (fecha: string, bien: boolean, descripcion: string, costo: number) => Promise<{ error: string | null }>;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [estado, setEstado] = useState<"Bien" | "Dañado">("Bien");
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lateBy = Math.round((Date.parse(date) - Date.parse(linea.tarifa ? fechaInicioAlquiler : fechaInicioAlquiler)) / 86400000);
  void lateBy; // (se deja disponible el cálculo por si se muestra más adelante)

  async function guardar() {
    if (estado === "Dañado" && !desc.trim()) { setError("Describe el daño encontrado."); return; }
    setSaving(true);
    setError(null);
    const resultado = await onSave(date, estado === "Bien", desc, estado === "Dañado" ? Number(cost) || 0 : 0);
    setSaving(false);
    if (resultado.error) { setError(resultado.error); return; }
    onClose();
  }

  return (
    <Modal title="Registrar Devolución" onClose={onClose}>
      <ErrorBanner message={error} />
      <div className="flex items-center gap-3 bg-[#102c4d]/5 rounded-xl p-4 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#102c4d] flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#ffbc07]"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" /></svg>
        </div>
        <div>
          <div className="font-semibold text-[#102c4d] text-sm">{linea.activo?.nombre}</div>
          <div className="text-xs text-gray-500">{linea.activo?.codigoqr} · {linea.activo?.categoria?.nombre}</div>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Fecha de devolución">
          <input type="date" className={inputCls} value={date} min={fechaInicioAlquiler} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Estado del activo al devolver">
          <div className="grid grid-cols-2 gap-3 mt-1">
            {(["Bien", "Dañado"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setEstado(opt)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${estado === opt
                  ? opt === "Bien" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-500 bg-red-50 text-red-700"
                  : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
              >
                {opt === "Bien" ? "✓ En buen estado" : "⚠ Con daños"}
              </button>
            ))}
          </div>
        </Field>

        {estado === "Dañado" && (
          <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Detalle del daño</p>
            <Field label="Descripción del daño">
              <textarea className={inputCls + " resize-none border-red-200 focus:border-red-400 focus:ring-red-100"} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe el tipo y extensión del daño…" autoFocus />
            </Field>
            <Field label="Costo del daño (Q)">
              <input type="number" step="0.01" className={inputCls + " border-red-200 focus:border-red-400 focus:ring-red-100"} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
            </Field>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
        <button
          disabled={saving}
          onClick={guardar}
          className={`px-5 py-2 text-sm font-bold rounded-lg transition-colors disabled:opacity-60 ${estado === "Dañado" ? "bg-red-500 text-white hover:bg-red-600" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {saving ? "Guardando…" : estado === "Bien" ? "✓ Confirmar devolución" : "⚠ Registrar con daño"}
        </button>
      </div>
    </Modal>
  );
}

// ── Rental Detail ──────────────────────────────────────────────────────────────

function RentalDetail({ idalquiler, onBack }: { idalquiler: number; onBack: () => void }) {
  const { alquileres, lineasDe, registrarDevolucion } = useAlquileres();
  const [returnLine, setReturnLine] = useState<DetalleAlquiler | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const rental = alquileres.find((r) => r.idalquiler === idalquiler);
  const lineas = lineasDe(idalquiler);

  if (!rental) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm">
        <button onClick={onBack} className="text-[#102c4d] font-semibold mb-4">← Volver</button>
        <p>No se encontró el alquiler.</p>
      </div>
    );
  }

  const status = statusLabel(rental.estado?.estadoalquiler);
  const pendingCount = lineas.filter((l) => l.estadodevuelto === null).length;
  const totalDanios = lineas.reduce((s) => s, 0); // los daños se ven en tbregistrodanio; costo se refleja en totalreal

  async function handleReturn(fecha: string, bien: boolean, desc: string, costo: number) {
    if (!returnLine) return { error: "Selecciona una línea." };
    const tarifa = returnLine.tarifa;
    const nuevoSubtotal = tarifa
      ? calcularSubtotal(tarifa, rental!.fechainicio, fecha, returnLine.descuento)
      : returnLine.subtotal;
    const resultado = await registrarDevolucion(returnLine.iddetallealquiler, fecha, bien, nuevoSubtotal, !bien ? { descripcion: desc, costo } : undefined);
    if (resultado.error) setActionError(resultado.error);
    return resultado;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <button onClick={onBack} className="self-start p-2 rounded-lg hover:bg-gray-200 text-[#102c4d] transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>ALQ-{String(rental.idalquiler).padStart(4, "0")}</h2>
            <RentalBadge status={status} />
            {rental.idcotizacion && <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-mono">Origen: COT-{String(rental.idcotizacion).padStart(4, "0")}</span>}
          </div>
          <p className="text-gray-400 text-sm mt-0.5">{rental.empleado ? displayEmployee(rental.empleado) : "—"} · Iniciado {rental.fechainicio}</p>
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {status === "Completado" && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="white" className="w-5 h-5"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </div>
          <div>
            <p className="font-bold text-emerald-800" style={{ fontFamily: "Outfit, sans-serif" }}>¡Alquiler completado!</p>
            <p className="text-sm text-emerald-700">Todos los activos han sido devueltos.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contacto</p>
            <div className="font-semibold text-gray-900">{rental.contacto?.nombre} {rental.contacto?.apellido}</div>
            <div className="text-sm text-gray-500">{rental.contacto?.empresa?.nombre ?? "—"}</div>
            <div className="text-xs text-gray-400 mt-1">{rental.contacto?.telefono ?? "—"}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fechas</p>
            {[["Inicio", rental.fechainicio], ["Fin estimado", rental.fechafinestimada], ["Fin real", rental.fechafinreal ?? "—"]].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{k}</span>
                <span className="text-xs font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Totales</p>
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Estimado</span>
              <span className="text-sm font-bold text-[#102c4d]">{fmt(rental.totalestimado)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Real (a la fecha)</span>
              <span className="text-sm font-bold text-emerald-700">{fmt(rental.totalreal)}</span>
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
              <p className="text-xs text-blue-800 font-medium"><strong>{pendingCount}</strong> activo(s) pendientes de devolución</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[#102c4d] font-bold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>Líneas del alquiler</h3>
              <span className="text-xs text-gray-400">{lineas.length} equipo(s)</span>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Activo", "Categoría", "Devol. real", "Subtotal", "Estado", ""].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineas.map((line) => (
                    <tr key={line.iddetallealquiler} className="hover:bg-gray-50/30">
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-xs font-semibold text-[#102c4d] bg-blue-50 px-2 py-0.5 rounded inline-block">{line.activo?.codigoqr ?? "—"}</div>
                        <div className="text-xs text-gray-500 mt-0.5 max-w-[140px] truncate">{line.activo?.nombre}</div>
                      </td>
                      <td className="px-4 py-3.5"><span className="text-xs bg-[#102c4d]/8 text-[#102c4d] px-2 py-0.5 rounded-full font-semibold">{line.activo?.categoria?.nombre ?? "—"}</span></td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                        {line.fechadevolucion
                          ? <span className={line.estadodevuelto === false ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold"}>{line.fechadevolucion}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5"><div className="font-bold text-[#102c4d] text-sm">{fmt(line.subtotal)}</div></td>
                      <td className="px-4 py-3.5"><LineBadge estadoDevuelto={line.estadodevuelto} /></td>
                      <td className="px-4 py-3.5">
                        {line.estadodevuelto === null && (
                          <button onClick={() => setReturnLine(line)} className="flex items-center gap-1.5 text-xs font-semibold bg-[#102c4d] text-white px-3 py-1.5 rounded-lg hover:bg-[#1a3d6b] transition-colors whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Registrar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {lineas.map((line) => (
                <div key={line.iddetallealquiler} className="px-4 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-semibold text-[#102c4d] bg-blue-50 px-2 py-0.5 rounded">{line.activo?.codigoqr ?? "—"}</span>
                      <div className="text-sm font-medium text-gray-900 mt-1">{line.activo?.nombre}</div>
                      <div className="text-xs text-gray-400">{line.activo?.categoria?.nombre}</div>
                    </div>
                    <LineBadge estadoDevuelto={line.estadodevuelto} />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="font-bold text-[#102c4d]">{fmt(line.subtotal)}</div>
                    {line.estadodevuelto === null && (
                      <button onClick={() => setReturnLine(line)} className="flex items-center gap-1.5 text-xs font-semibold bg-[#102c4d] text-white px-3 py-1.5 rounded-lg hover:bg-[#1a3d6b] transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Registrar devolución
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#102c4d] px-5 py-4 flex items-center justify-between">
              <span className="text-blue-200 text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>Total estimado / real</span>
              <div className="text-right">
                <span className="text-white font-bold text-lg" style={{ fontFamily: "Outfit, sans-serif" }}>{fmt(rental.totalestimado)}</span>
                <span className="text-blue-300 text-sm ml-2">/ {fmt(rental.totalreal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {returnLine && (
        <ReturnModal
          linea={returnLine}
          fechaInicioAlquiler={rental.fechainicio}
          onClose={() => setReturnLine(null)}
          onSave={handleReturn}
        />
      )}
    </div>
  );
}

// ── Create Rental Wizard ───────────────────────────────────────────────────────

interface WizardLine {
  id: string;
  idactivo: number;
  codigoqr: string | null;
  nombreActivo: string;
  idcategoria: number;
  categoria: string;
  idtarifaactivo: number;
  descuento: number;
  iddetallecotizacion: number | null;
}

function CreateRentalWizard({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { perfil } = useAuth();
  const { contactos } = useContactos();
  const { empleados } = useEmpleados();
  const { activos } = useActivos();
  const { estados: estadosActivo } = useEstadosActivo();
  const { tarifas } = useTarifas();
  const { cotizaciones, lineasDe: lineasCotizacionDe } = useCotizaciones();
  const { estados: estadosCotizacion } = useEstadosCotizacion();
  const { crear } = useAlquileres();
  const { estados: estadosAlquiler } = useEstadosAlquiler();

  const [origin, setOrigin] = useState<"quote" | "direct" | null>(null);
  const [step, setStep] = useState(1);
  const [quoteId, setQuoteId] = useState("");
  const [contactId, setContactId] = useState("");
  const [employeeId, setEmployeeId] = useState(String(perfil?.idempleado ?? ""));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lines, setLines] = useState<WizardLine[]>([]);
  const [shortages, setShortages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contacts = useMemo(() => contactos.filter((c) => c.estado).map(displayContact), [contactos]);
  const activeEmployees = useMemo(() => empleados.filter((e) => e.estado), [empleados]);
  const activeTariffs = useMemo(() => tarifas.filter((t) => t.estado), [tarifas]);
  const quotesPending = useMemo(
    () => cotizaciones.filter((q) => (q.estado?.estadocotizacion ?? "").toLowerCase() === "cotizado"),
    [cotizaciones]
  );
  const disponibles = useMemo(
    () => activos.filter((a) => a.estadoActivo?.nombre === "Disponible"),
    [activos]
  );

  const usedAssetIds = useMemo(() => new Set(lines.map((l) => l.idactivo)), [lines]);
  const availableForCategory = (idcategoria: number) =>
    disponibles.filter((a) => a.idcategoria === idcategoria && !usedAssetIds.has(a.idactivo));
  const categoriesConAsignable = useMemo(() => {
    const cats = new Map<number, string>();
    disponibles.forEach((a) => { if (!usedAssetIds.has(a.idactivo)) cats.set(a.idcategoria, a.categoria?.nombre ?? "Categoría"); });
    return Array.from(cats.entries());
  }, [disponibles, usedAssetIds]);

  const quoteRef = quotesPending.find((q) => String(q.idcotizacion) === quoteId);
  const ct = contacts.find((c) => String(c.id) === contactId);

  function tarifaVigentePara(idcategoria: number) {
    return activeTariffs.find((t) => t.idcategoria === idcategoria);
  }

  // ── Origen: elegir cotización -> auto-asignar activos ─────────
  function cargarDesdeCotizacion(idcotStr: string) {
    setQuoteId(idcotStr);
    const q = quotesPending.find((x) => String(x.idcotizacion) === idcotStr);
    if (!q) { setLines([]); setShortages([]); return; }
    setContactId(String(q.idcontacto));
    setStartDate(q.fechainicio);
    setEndDate(q.fechafin);

    const detalles = lineasCotizacionDe(q.idcotizacion);
    const nuevasLineas: WizardLine[] = [];
    const advertencias: string[] = [];
    const yaUsados = new Set<number>();

    detalles.forEach((d) => {
      const idcategoria = d.tarifa?.idcategoria;
      const nombreCategoria = d.tarifa?.categoria?.nombre ?? "Categoría";
      if (!idcategoria) return;
      const candidatos = disponibles.filter((a) => a.idcategoria === idcategoria && !yaUsados.has(a.idactivo));
      const asignar = candidatos.slice(0, d.cantidad);
      asignar.forEach((a) => {
        yaUsados.add(a.idactivo);
        nuevasLineas.push({
          id: `q-${d.iddetallecotizacion}-${a.idactivo}`,
          idactivo: a.idactivo,
          codigoqr: a.codigoqr,
          nombreActivo: a.nombre,
          idcategoria,
          categoria: nombreCategoria,
          idtarifaactivo: d.idtarifaactivo, // se honra la tarifa con la que se cotizó
          descuento: 0,
          iddetallecotizacion: d.iddetallecotizacion,
        });
      });
      if (asignar.length < d.cantidad) {
        advertencias.push(`${nombreCategoria}: se pidieron ${d.cantidad}, solo se pudieron asignar ${asignar.length} disponible(s). El requerimiento no se cumplirá completo.`);
      }
    });

    setLines(nuevasLineas);
    setShortages(advertencias);
  }

  function addLine() {
    const [idcategoria, nombreCategoria] = categoriesConAsignable[0] ?? [];
    if (!idcategoria) return;
    const activo = availableForCategory(idcategoria)[0];
    const tarifa = tarifaVigentePara(idcategoria);
    if (!activo || !tarifa) return;
    setLines((prev) => [...prev, {
      id: `manual-${Date.now()}`,
      idactivo: activo.idactivo,
      codigoqr: activo.codigoqr,
      nombreActivo: activo.nombre,
      idcategoria,
      categoria: nombreCategoria,
      idtarifaactivo: tarifa.idtarifaactivo,
      descuento: 0,
      iddetallecotizacion: null,
    }]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function changeLineCategoria(id: string, idcategoria: number, nombreCategoria: string) {
    const activo = availableForCategory(idcategoria)[0];
    const tarifa = tarifaVigentePara(idcategoria);
    if (!activo || !tarifa) return;
    setLines((prev) => prev.map((l) => l.id === id ? {
      ...l, idcategoria, categoria: nombreCategoria, idactivo: activo.idactivo, codigoqr: activo.codigoqr, nombreActivo: activo.nombre, idtarifaactivo: tarifa.idtarifaactivo,
    } : l));
  }

  function changeLineActivo(id: string, idactivo: number) {
    const activo = activos.find((a: Activo) => a.idactivo === idactivo);
    if (!activo) return;
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, idactivo: activo.idactivo, codigoqr: activo.codigoqr, nombreActivo: activo.nombre } : l));
  }

  function updateDescuento(id: string, val: number) {
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, descuento: val } : l));
  }

  const tariffById = useMemo(() => new Map(tarifas.map((t) => [t.idtarifaactivo, t])), [tarifas]);
  const pricedLines = lines.map((l) => {
    const tarifa = tariffById.get(l.idtarifaactivo);
    const subtotal = tarifa ? calcularSubtotal(tarifa, startDate, endDate, l.descuento) : 0;
    return { ...l, subtotal };
  });
  const total = pricedLines.reduce((s, l) => s + l.subtotal, 0);

  const step1Valid = origin && startDate && endDate && endDate >= startDate && employeeId && (origin === "direct" ? contactId : quoteId);

  async function handleSave() {
    if (!pricedLines.length) { setError("Asigna al menos un activo."); return; }
    const idestadoInicial = estadosAlquiler.find((e) => e.estadoalquiler.toLowerCase() === "iniciado")?.idestadoalquiler;
    if (!idestadoInicial) { setError("No se encontró el estado 'iniciado' en tbestadoalquiler."); return; }

    setSaving(true);
    setError(null);

    const resultado = await crear(
      {
        idempleado: Number(employeeId),
        idcontacto: Number(contactId),
        idcotizacion: origin === "quote" ? Number(quoteId) : null,
        idestadoalquiler: idestadoInicial,
        fechainicio: startDate,
        fechafinestimada: endDate,
        totalestimado: total,
      },
      pricedLines.map((l) => ({
        idactivo: l.idactivo,
        idtarifaactivo: l.idtarifaactivo,
        iddetallecotizacion: l.iddetallecotizacion,
        descuento: l.descuento,
        subtotal: l.subtotal,
      }))
    );

    if (resultado.error) { setSaving(false); setError(resultado.error); return; }

    // Si viene de una cotización, esa cotización pasa a "alquilado"
    if (origin === "quote" && quoteRef) {
      const idestadoAlquilado = estadosCotizacion.find((e) => e.estadocotizacion.toLowerCase() === "alquilado")?.idestadocotizacion;
      if (idestadoAlquilado) {
        await supabase.from("tbcotizacion").update({ idestadocotizacion: idestadoAlquilado }).eq("idcotizacion", quoteRef.idcotizacion);
      }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <Modal title="Nuevo Alquiler" onClose={onClose} size="full">
      <ErrorBanner message={error} />
      <div className="flex items-center gap-0 mb-6">
        {[{ n: 1, label: "Origen y datos" }, { n: 2, label: "Activos físicos" }].map((s, i) => (
          <div key={s.n} className="flex items-center gap-0 flex-1">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.n ? "bg-[#102c4d] text-white" : "bg-gray-200 text-gray-400"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                {step > s.n ? <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : s.n}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${step === s.n ? "text-[#102c4d]" : "text-gray-400"}`} style={{ fontFamily: "Outfit, sans-serif" }}>{s.label}</span>
            </div>
            {i < 1 && <div className={`flex-1 h-0.5 mx-3 ${step > 1 ? "bg-[#102c4d]" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <Field label="Origen del alquiler">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { val: "quote" as const, label: "Desde cotización", sub: "Precarga contacto, fechas y asigna activos automáticamente" },
                { val: "direct" as const, label: "Alquiler directo", sub: "Sin cotización previa" },
              ]).map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => { setOrigin(opt.val); setLines([]); setShortages([]); setQuoteId(""); setContactId(""); }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${origin === opt.val ? "border-[#102c4d] bg-[#102c4d]/5" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <div>
                    <div className={`text-sm font-bold ${origin === opt.val ? "text-[#102c4d]" : "text-gray-700"}`} style={{ fontFamily: "Outfit, sans-serif" }}>{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </Field>

          {origin === "quote" && (
            <Field label="Cotización de origen">
              <select className={inputCls} value={quoteId} onChange={(e) => cargarDesdeCotizacion(e.target.value)}>
                <option value="">Seleccionar cotización…</option>
                {quotesPending.map((q) => (
                  <option key={q.idcotizacion} value={q.idcotizacion}>
                    COT-{String(q.idcotizacion).padStart(4, "0")} — {q.contacto?.nombre} {q.contacto?.apellido}
                  </option>
                ))}
              </select>
              {quotesPending.length === 0 && <p className="text-xs text-amber-600 mt-1.5">No hay cotizaciones en estado "cotizado" disponibles para convertir.</p>}
              {shortages.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1">
                  {shortages.map((s, i) => (
                    <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {s}
                    </p>
                  ))}
                </div>
              )}
            </Field>
          )}

          {origin === "direct" && (
            <Field label="Contacto">
              <select className={inputCls} value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">Seleccionar contacto…</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
              </select>
            </Field>
          )}

          {ct && (
            <div className="flex items-center gap-3 bg-[#102c4d]/5 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-[#102c4d] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{ct.name.slice(0, 2).toUpperCase()}</div>
              <div className="text-sm"><div className="font-semibold text-[#102c4d]">{ct.name}</div><div className="text-gray-500 text-xs">{ct.company} · {ct.phone}</div></div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fecha inicio">
              <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={origin === "quote"} />
            </Field>
            <Field label="Fecha fin estimada">
              <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} disabled={origin === "quote"} />
            </Field>
          </div>
          {origin === "quote" && <p className="text-xs text-gray-400 -mt-3">Las fechas vienen de la cotización de origen.</p>}

          {totalDays(startDate, endDate) > 0 && (
            <div className="flex items-center gap-2 text-sm text-[#102c4d] bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
              Duración estimada: <strong>{durationLabel(startDate, endDate)}</strong>
            </div>
          )}

          <Field label="Empleado responsable">
            <select className={inputCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {activeEmployees.map((e) => <option key={e.idempleado} value={e.idempleado}>{displayEmployee(e)}</option>)}
            </select>
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 flex flex-wrap gap-3">
            <span><strong className="text-gray-900">{ct?.name}</strong> · {ct?.company}</span>
            <span className="text-gray-300">|</span>
            <span>{startDate} → {endDate}</span>
            {quoteRef && <><span className="text-gray-300">|</span><span className="font-mono text-[#102c4d]">COT-{String(quoteRef.idcotizacion).padStart(4, "0")}</span></>}
          </div>

          {shortages.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1">
              {shortages.map((s, i) => <p key={i} className="text-xs text-amber-800">{s}</p>)}
            </div>
          )}

          <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
            Cada línea es <strong>un activo físico específico</strong>. Puedes cambiar cuál activo va en cada línea, o agregar más.
          </p>

          <div className="space-y-3">
            {pricedLines.map((line, idx) => {
              const opcionesActivo = [
                ...(activos.find((a) => a.idactivo === line.idactivo) ? [activos.find((a) => a.idactivo === line.idactivo)!] : []),
                ...availableForCategory(line.idcategoria),
              ];
              return (
                <div key={line.id} className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                  <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Línea {idx + 1} {line.iddetallecotizacion ? "· desde cotización" : ""}</span>
                    <button onClick={() => removeLine(line.id)} className="p-1 rounded text-gray-300 hover:text-red-500">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Field label="Categoría">
                      <select
                        className={inputCls}
                        value={line.idcategoria}
                        onChange={(e) => {
                          const idcategoria = Number(e.target.value);
                          const nombre = categoriesConAsignable.find(([id]) => id === idcategoria)?.[1] ?? line.categoria;
                          changeLineCategoria(line.id, idcategoria, nombre);
                        }}
                      >
                        <option value={line.idcategoria}>{line.categoria}</option>
                        {categoriesConAsignable.filter(([id]) => id !== line.idcategoria).map(([id, nombre]) => (
                          <option key={id} value={id}>{nombre}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Activo físico">
                      <select className={inputCls} value={line.idactivo} onChange={(e) => changeLineActivo(line.id, Number(e.target.value))}>
                        {opcionesActivo.map((a) => <option key={a.idactivo} value={a.idactivo}>{a.codigoqr ?? a.idactivo} · {a.nombre}</option>)}
                      </select>
                    </Field>
                    <Field label="Descuento (Q)">
                      <input type="number" min={0} step="0.01" className={inputCls} value={line.descuento} onChange={(e) => updateDescuento(line.id, Math.max(0, +e.target.value))} />
                    </Field>
                    <Field label="Subtotal estimado">
                      <div className={inputCls + " bg-[#102c4d]/5 font-bold text-[#102c4d] flex items-center"}>{fmt(line.subtotal)}</div>
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={addLine}
            disabled={categoriesConAsignable.length === 0}
            className="flex items-center gap-2 text-sm font-semibold text-[#102c4d] border-2 border-dashed border-gray-300 hover:border-[#102c4d] rounded-xl px-4 py-3 w-full justify-center transition-colors hover:bg-[#102c4d]/5 disabled:opacity-50"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {categoriesConAsignable.length ? "Agregar activo" : "No hay más activos disponibles para agregar"}
          </button>

          <div className="bg-[#102c4d] rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-blue-300 text-xs uppercase tracking-wider">Total estimado</div>
              <div className="text-white text-2xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>{fmt(total)}</div>
            </div>
            <div className="text-right text-blue-300 text-xs">{lines.length} activo(s)</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <button onClick={step === 1 ? onClose : () => setStep(1)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          {step === 1 ? "Cancelar" : "Anterior"}
        </button>
        {step === 1 ? (
          <button disabled={!step1Valid} onClick={() => setStep(2)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[#102c4d] text-white rounded-lg hover:bg-[#1a3d6b] disabled:opacity-40 transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
            Continuar
          </button>
        ) : (
          <button disabled={saving || !lines.length} onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] disabled:opacity-40 transition-colors shadow-md" style={{ fontFamily: "Outfit, sans-serif" }}>
            {saving ? "Creando…" : "Crear Alquiler"}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── QR Scanner View ────────────────────────────────────────────────────────────

function QRScannerView() {
  const [code, setCode] = useState("");
  const [resultado, setResultado] = useState<{
    activo: Activo;
    alquilerActivo: { numero: string; contacto: string; empresa: string | null; fechainicio: string; fechafinestimada: string; costoAcumulado: number } | null;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { activos } = useActivos();

  async function search(q: string) {
    const codigo = q.trim().toUpperCase();
    if (!codigo) return;
    setBuscando(true);
    setNotFound(false);
    setResultado(null);

    const { data: activo, error } = await supabase
      .from("tbactivo")
      .select(`idactivo, idcategoria, idestadoactivo, nombre, marca, modelo, descripcion, fechacompra, codigoqr, categoria:tbcategoria(nombre), estadoActivo:tbestadoactivo(nombre)`)
      .eq("codigoqr", codigo)
      .maybeSingle();

    if (error || !activo) { setNotFound(true); setBuscando(false); return; }

    const activoTyped = { ...activo, categoria: relatedOne(activo.categoria), estadoActivo: relatedOne(activo.estadoActivo) } as unknown as Activo;

    let alquilerActivo = null;
    if (activoTyped.estadoActivo?.nombre === "Alquilado") {
      const { data: detalle } = await supabase
        .from("tbdetallealquiler")
        .select(`
          idalquiler, descuento,
          tarifa:tbtarifaactivo ( preciosemana, preciomes, preciodiaunico, preciodiaextra ),
          alquiler:tbalquiler ( idalquiler, fechainicio, fechafinestimada, contacto:tbcontacto ( nombre, apellido, empresa:tbempresa(nombre) ) )
        `)
        .eq("idactivo", activoTyped.idactivo)
        .is("fechadevolucion", null)
        .maybeSingle();

      if (detalle) {
        const alquiler = relatedOne(detalle.alquiler as any);
        const tarifa = relatedOne(detalle.tarifa as any);
        const contacto = alquiler ? relatedOne((alquiler as any).contacto) : null;
        if (alquiler && tarifa) {
          const hoy = new Date().toISOString().slice(0, 10);
          const costo = calcularSubtotal(tarifa as any, (alquiler as any).fechainicio, hoy, (detalle as any).descuento ?? 0);
          alquilerActivo = {
            numero: `ALQ-${String((alquiler as any).idalquiler).padStart(4, "0")}`,
            contacto: contacto ? `${(contacto as any).nombre} ${(contacto as any).apellido}` : "—",
            empresa: contacto ? relatedOne((contacto as any).empresa)?.nombre ?? null : null,
            fechainicio: (alquiler as any).fechainicio,
            fechafinestimada: (alquiler as any).fechafinestimada,
            costoAcumulado: costo,
          };
        }
      }
    }

    setResultado({ activo: activoTyped, alquilerActivo });
    setBuscando(false);
  }

  const statusColor: Record<string, string> = {
    Disponible: "bg-emerald-100 border-emerald-300 text-emerald-800",
    Alquilado: "bg-amber-100 border-amber-300 text-amber-800",
    "En Mantenimiento": "bg-red-100 border-red-300 text-red-800",
    Inactivo: "bg-gray-100 border-gray-300 text-gray-600",
  };

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#102c4d] flex items-center justify-center mx-auto mb-3">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-[#ffbc07]"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zm-2 7a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zm8-12a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1zM9 9a1 1 0 000 2h1a1 1 0 100-2H9zm7 0a1 1 0 10-2 0v1h1a1 1 0 001-1zm-1 4a1 1 0 10-2 0 1 1 0 002 0zm-5 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
        </div>
        <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Consulta de Activo por QR</h2>
        <p className="text-gray-400 text-sm mt-1">Escanea o ingresa el código del activo para ver su estado en tiempo real</p>
      </div>

      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-6 space-y-4">
        <div className="relative">
          <input
            ref={inputRef}
            className="w-full pl-4 pr-24 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#102c4d] focus:ring-2 focus:ring-[#102c4d]/10 uppercase"
            placeholder="AND-0034"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setNotFound(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") search(code); }}
            autoFocus
          />
          <button onClick={() => search(code)} disabled={buscando} className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#102c4d] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1a3d6b] transition-colors disabled:opacity-60" style={{ fontFamily: "Outfit, sans-serif" }}>
            {buscando ? "Buscando…" : "Buscar"}
          </button>
        </div>

        {activos.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Prueba con:</p>
            <div className="flex flex-wrap gap-2">
              {activos.slice(0, 5).filter((a) => a.codigoqr).map((a) => (
                <button key={a.idactivo} onClick={() => { setCode(a.codigoqr ?? ""); search(a.codigoqr ?? ""); }} className="text-xs font-mono bg-gray-100 hover:bg-[#102c4d] hover:text-white text-gray-700 px-2.5 py-1 rounded-lg transition-colors">
                  {a.codigoqr}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {notFound && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-center">
          <p className="text-red-700 font-semibold text-sm">No se encontró ningún activo con el código <span className="font-mono">{code}</span>.</p>
        </div>
      )}

      {resultado && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
            <div className="bg-[#102c4d] px-5 py-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-[#ffbc07] font-bold text-lg">{resultado.activo.codigoqr}</div>
                <div className="text-blue-200 text-sm">{resultado.activo.nombre}</div>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusColor[resultado.activo.estadoActivo?.nombre ?? ""] ?? ""}`}>
                {resultado.activo.estadoActivo?.nombre ?? "—"}
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-gray-400">Categoría</div><div className="text-sm font-semibold text-gray-900 mt-0.5">{resultado.activo.categoria?.nombre ?? "—"}</div></div>
                <div><div className="text-xs text-gray-400">Estado actual</div><div className="text-sm font-semibold text-gray-900 mt-0.5">{resultado.activo.estadoActivo?.nombre ?? "—"}</div></div>
              </div>

              {resultado.alquilerActivo && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Actualmente alquilado</span>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500 text-xs">Alquiler</span><span className="font-mono text-xs font-bold text-[#102c4d]">{resultado.alquilerActivo.numero}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-xs">Cliente</span><span className="text-xs font-semibold">{resultado.alquilerActivo.contacto}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-xs">Empresa</span><span className="text-xs text-gray-700">{resultado.alquilerActivo.empresa ?? "—"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-xs">Inicio</span><span className="text-xs font-semibold">{resultado.alquilerActivo.fechainicio}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-xs">Devol. est.</span><span className="text-xs font-semibold">{resultado.alquilerActivo.fechafinestimada}</span></div>
                  </div>
                  <div className="bg-white border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between mt-2">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider">Costo acumulado</div>
                      <div className="text-xs text-gray-400">desde {resultado.alquilerActivo.fechainicio}</div>
                    </div>
                    <div className="text-2xl font-bold text-[#102c4d]" style={{ fontFamily: "Outfit, sans-serif" }}>{fmt(resultado.alquilerActivo.costoAcumulado)}</div>
                  </div>
                </div>
              )}

              {resultado.activo.estadoActivo?.nombre === "Disponible" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 font-medium">Activo disponible para alquiler</div>
              )}
              {resultado.activo.estadoActivo?.nombre === "En Mantenimiento" && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 font-medium">Activo en mantenimiento — no disponible</div>
              )}
            </div>
          </div>

          <button onClick={() => { setResultado(null); setCode(""); setNotFound(false); inputRef.current?.focus(); }} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-2">
            ← Consultar otro activo
          </button>
        </div>
      )}
    </div>
  );
}

// ── Module root ────────────────────────────────────────────────────────────────

type RentalTab = "list" | "scanner";

export default function RentalsModule() {
  const [tab, setTab] = useState<RentalTab>("list");
  const { alquileres, loading, error } = useAlquileres();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const rows = useMemo(() => alquileres.map((r) => ({ r, status: statusLabel(r.estado?.estadoalquiler) })), [alquileres]);

  const filtered = useMemo(() =>
    rows.filter(({ r, status }) => {
      if (filterStatus && status !== filterStatus) return false;
      if (filterFrom && r.fechainicio < filterFrom) return false;
      if (filterTo && r.fechainicio > filterTo) return false;
      return true;
    }), [rows, filterStatus, filterFrom, filterTo]);

  if (detailId !== null) {
    return <RentalDetail idalquiler={detailId} onBack={() => setDetailId(null)} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 md:px-6">
        <div className="flex gap-1">
          {([{ id: "list", label: "Alquileres" }, { id: "scanner", label: "Consulta QR" }] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-shrink-0 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${tab === t.id ? "border-[#ffbc07] text-[#102c4d]" : "border-transparent text-gray-400 hover:text-gray-600"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "scanner" && <QRScannerView />}
        {tab === "list" && (
          <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Alquileres</h2>
                <p className="text-gray-400 text-sm">{alquileres.length} registros · {rows.filter((x) => x.status === "Iniciado" || x.status === "Parcial").length} activos</p>
              </div>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#ffbc07] text-[#102c4d] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#e5a800] transition-colors shadow-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                Nuevo Alquiler
              </button>
            </div>

            {error && <ErrorBanner message={error} />}
            {loading && <p className="text-sm text-gray-500">Cargando alquileres…</p>}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
                <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#102c4d]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Todos los estados</option>
                  {(["Iniciado", "Parcial", "Completado", "Cancelado"] as RentalStatusLabel[]).map((s) => <option key={s}>{s}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Inicio entre</span>
                  <input type="date" className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#102c4d]" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
                  <span className="text-gray-400 text-xs">y</span>
                  <input type="date" className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#102c4d]" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
                </div>
                {(filterStatus || filterFrom || filterTo) && <button onClick={() => { setFilterStatus(""); setFilterFrom(""); setFilterTo(""); }} className="text-xs text-red-500 font-medium">Limpiar</button>}
              </div>
            </div>

            <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["N° Alquiler", "Contacto", "Inicio", "Fin estimado", "Fin real", "Total est.", "Total real", "Estado", ""].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!loading && filtered.map(({ r, status }) => (
                    <tr key={r.idalquiler} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailId(r.idalquiler)}>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-xs font-bold text-[#102c4d] bg-blue-50 px-2 py-1 rounded inline-block">ALQ-{String(r.idalquiler).padStart(4, "0")}</div>
                        {r.idcotizacion && <div className="text-[10px] text-gray-400 mt-0.5">← COT-{String(r.idcotizacion).padStart(4, "0")}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-gray-900 text-sm">{r.contacto?.nombre} {r.contacto?.apellido}</div>
                        <div className="text-xs text-gray-400">{r.contacto?.empresa?.nombre ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">{r.fechainicio}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">{r.fechafinestimada}</td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap">{r.fechafinreal ? <span className="text-emerald-600 font-semibold">{r.fechafinreal}</span> : <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3.5 font-semibold text-gray-900 whitespace-nowrap">{fmt(r.totalestimado)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap"><span className="font-bold text-emerald-700">{fmt(r.totalreal)}</span></td>
                      <td className="px-4 py-3.5"><RentalBadge status={status} /></td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setDetailId(r.idalquiler)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#102c4d]">Ver</button>
                      </td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && <tr><td colSpan={9} className="text-center py-14 text-gray-400 text-sm">Sin alquileres para los filtros seleccionados.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {!loading && filtered.map(({ r, status }) => (
                <div key={r.idalquiler} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3" onClick={() => setDetailId(r.idalquiler)}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#102c4d] bg-blue-50 px-2 py-1 rounded">ALQ-{String(r.idalquiler).padStart(4, "0")}</span>
                    <RentalBadge status={status} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{r.contacto?.nombre} {r.contacto?.apellido}</div>
                    <div className="text-xs text-gray-400">{r.contacto?.empresa?.nombre ?? "—"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><div className="text-gray-400">Inicio</div><div className="font-semibold text-gray-700">{r.fechainicio}</div></div>
                    <div><div className="text-gray-400">Fin est.</div><div className="font-semibold text-gray-700">{r.fechafinestimada}</div></div>
                    <div><div className="text-gray-400">Total est.</div><div className="font-bold text-[#102c4d]">{fmt(r.totalestimado)}</div></div>
                    <div><div className="text-gray-400">Total real</div><div className="font-bold text-emerald-700">{fmt(r.totalreal)}</div></div>
                  </div>
                </div>
              ))}
              {!loading && filtered.length === 0 && <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border">Sin resultados.</div>}
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateRentalWizard onClose={() => setShowCreate(false)} onSaved={() => setShowCreate(false)} />}
    </div>
  );
}