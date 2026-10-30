import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "./uses/useAuth";
import { useContactos } from "./uses/useContactos";
import { useEmpleados } from "./uses/useEmpleados";
import { useTarifas } from "./uses/useTarifas";
import { useCotizaciones } from "./uses/useCotizaciones";
import { useEstadosCotizacion } from "./uses/useEstadosCotizacion";
import type { Contacto, Empleado, TarifaActivo } from "../types/inventory";
import { formatearFecha } from "../types/format";

// ── Types (solo de UI, no son tablas) ───────────────────────────────────────────

type QuoteStatus = "Cotizado" | "Alquilado" | "Cancelado" | "Completado";

interface Contact {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
}

interface QuoteLine {
  id: string; // id real (iddetallecotizacion) si ya existe, o "new-x" si es nueva
  tariffId: number;
  category: string;
  rateWeek: number;
  rateMonth: number;
  rateDayUnique: number;
  rateDayExtra: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

interface Quote {
  id: string; // "" si aún no existe en la base
  number: string;
  contactId: string;
  employeeId: string;
  employee: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  status: QuoteStatus;
  lines: QuoteLine[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) => "Q " + n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function durationDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  return Math.max(1, Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000));
}

function durationParts(days: number) {
  const months = Math.floor(days / 30);
  const weeks = Math.floor((days % 30) / 7);
  const extraDays = (days % 30) % 7;

  return {
    months,
    weeks,
    days: extraDays,
  };
}

function durationLabel(startDate: string, endDate: string) {
  const parts = durationParts(durationDays(startDate, endDate));
  const labels = [
    parts.months ? `${parts.months} ${parts.months === 1 ? "mes" : "meses"}` : "",
    parts.weeks ? `${parts.weeks} ${parts.weeks === 1 ? "semana" : "semanas"}` : "",
    parts.days ? `${parts.days} ${parts.days === 1 ? "día" : "días"}` : "",
  ].filter(Boolean);
  return labels.length ? labels.join(", ") : "1 día";
}

function quoteTotal(lines: QuoteLine[]) {
  return lines.reduce((sum, l) => sum + l.subtotal, 0);
}

function displayContact(c: Contacto): Contact {
  return {
    id: String(c.idcontacto),
    name: `${c.nombre} ${c.apellido}`.trim(),
    company: c.empresa?.nombre ?? "—",
    phone: c.telefono ?? "—",
    email: c.correo ?? "—",
  };
}

function displayEmployee(e: Pick<Empleado, "nombre" | "apellido">) {
  return `${e.nombre} ${e.apellido}`.trim();
}

const STATUS_CFG: Record<QuoteStatus, { cls: string; dot: string; text: string }> = {
  Cotizado:   { cls: "bg-blue-100 text-blue-700",    dot: "bg-blue-500",    text: "Cotizado" },
  Alquilado:  { cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", text: "Alquilado" },
  Cancelado:  { cls: "bg-red-100 text-red-700",      dot: "bg-red-500",     text: "Cancelado" },
  Completado: { cls: "bg-gray-100 text-gray-600",    dot: "bg-gray-400",    text: "Completado" },
};

function statusLabel(nombre: string | undefined): QuoteStatus {
  const n = (nombre ?? "").toLowerCase();
  if (n === "alquilado") return "Alquilado";
  if (n === "cancelado") return "Cancelado";
  if (n === "completado") return "Completado";
  return "Cotizado";
}

function StatusBadge({ status }: { status: QuoteStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.text}
    </span>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, size = "lg" }: {
  title: string; onClose: () => void; children: React.ReactNode; size?: "lg" | "xl" | "full";
}) {
  const sizeMap = { lg: "max-w-xl", xl: "max-w-3xl", full: "max-w-5xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 md:p-6 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeMap[size]} my-4`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-[#102c4d] font-bold text-base" style={{ fontFamily: "Outfit, sans-serif" }}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#102c4d] uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d] focus:ring-2 focus:ring-[#102c4d]/10 transition-all bg-white";
const selectCls = inputCls;

// Searchable contact dropdown
function ContactSelect({
  value, onChange, contacts,
}: {
  value: string; onChange: (id: string) => void; contacts: Contact[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = contacts.find((c) => c.id === value);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = contacts.filter(
    (c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.company.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} text-left flex items-center justify-between`}
      >
        {selected ? (
          <span>
            <span className="font-medium">{selected.name}</span>
            <span className="text-gray-400 ml-2 text-xs">{selected.company}</span>
          </span>
        ) : (
          <span className="text-gray-400">Seleccionar contacto…</span>
        )}
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
              </span>
              <input
                autoFocus
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#102c4d]"
                placeholder="Buscar por nombre o empresa…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false); setQ(""); }}
                className="w-full text-left px-4 py-3 hover:bg-[#102c4d]/5 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">{c.name}</div>
                <div className="text-xs text-gray-400">{c.company} · {c.phone}</div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-center py-6 text-sm text-gray-400">Sin resultados</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Wizard ─────────────────────────────────────────────────────────────────────

interface WizardProps {
  onClose: () => void;
  onSave: (q: Quote) => Promise<string | null>;
  contacts: Contact[];
  employees: Empleado[];
  tariffs: TarifaActivo[]; // ya filtradas a "vigentes" por el módulo
  defaultEmployeeId: string;
  setupIssues: string[];
  initial?: Quote;
}

function lineFromTariff(tariff: TarifaActivo, id = `new-${Date.now()}`): QuoteLine {
  return {
    id,
    tariffId: tariff.idtarifaactivo,
    category: tariff.categoria?.nombre ?? "Categoría",
    rateWeek: Number(tariff.preciosemana),
    rateMonth: Number(tariff.preciomes),
    rateDayUnique: Number(tariff.preciodiaunico),
    rateDayExtra: Number(tariff.preciodiaextra),
    quantity: 1,
    discount: 0,
    subtotal: 0,
  };
}

function calculateLineGross(
  line: QuoteLine,
  startDate: string,
  endDate: string
) {
  const totalDays = durationDays(startDate, endDate);
  const { months, weeks, days } = durationParts(totalDays);

  // El día único solo aplica cuando el alquiler dura exactamente 1 día.
  const dayCost =
    totalDays === 1
      ? line.rateDayUnique
      : days * line.rateDayExtra;

  return (
    months * line.rateMonth +
    weeks * line.rateWeek +
    dayCost
  ) * line.quantity;
}

function calculateLineSubtotal(line: QuoteLine, startDate: string, endDate: string) {
  return Math.max(0, calculateLineGross(line, startDate, endDate) - line.discount);
}

function QuoteWizard({ onClose, onSave, contacts, employees, tariffs, defaultEmployeeId, setupIssues, initial }: WizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Step 1
  const [contactId, setContactId] = useState(initial?.contactId ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? defaultEmployeeId);

  // Step 2 -- IMPORTANTE: ya no toma tariffs[0] como respaldo si no
  // hay ninguna vigente (eso podía precargar una tarifa histórica).
  // Si no hay tarifas vigentes, empieza sin líneas.
  const firstActiveTariff = tariffs[0];
  const [lines, setLines] = useState<QuoteLine[]>(initial?.lines ?? (firstActiveTariff ? [lineFromTariff(firstActiveTariff, "new-0")] : []));

  const tariffById = useMemo(() => new Map(tariffs.map((t) => [t.idtarifaactivo, t])), [tariffs]);
  const usedCategories = useMemo(
    () => new Set(lines.map((line) => tariffById.get(line.tariffId)?.idcategoria)),
    [lines, tariffById]
  );
  const unusedTariffs = useMemo(
    () => tariffs.filter((t) => !lines.some((l) => l.tariffId === t.idtarifaactivo) && !usedCategories.has(t.idcategoria)),
    [tariffs, lines, usedCategories]
  );

  const addLine = () => {
    if (unusedTariffs[0]) setLines((prev) => [...prev, lineFromTariff(unusedTariffs[0])]);
  };
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));
  const updateLine = (id: string, key: keyof QuoteLine, val: number | string) =>
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (key === "tariffId") {
          const tariff = tariffById.get(Number(val));
          return tariff ? { ...lineFromTariff(tariff, l.id), quantity: l.quantity, discount: l.discount } : l;
        }
        return { ...l, [key]: val };
      })
    );

  const pricedLines = lines.map((line) => {
    const discount = Math.min(line.discount, calculateLineGross(line, startDate, endDate));
    return { ...line, discount, subtotal: calculateLineSubtotal({ ...line, discount }, startDate, endDate) };
  });
  const total = quoteTotal(pricedLines);
  const step1Valid = contactId && startDate && endDate && endDate >= startDate && employeeId;

  const handleSave = async () => {
    if (!pricedLines.length) { setSaveError("Agrega al menos una categoría con tarifa vigente."); return; }
    setSaving(true);
    setSaveError(null);
    const q: Quote = {
      id: initial?.id ?? "",
      number: initial?.number ?? "",
      contactId,
      employeeId,
      employee: displayEmployee(employees.find((e) => String(e.idempleado) === employeeId) ?? employees[0]),
      createdAt: initial?.createdAt ?? new Date().toISOString().slice(0, 10),
      startDate,
      endDate,
      status: initial?.status ?? "Cotizado",
      lines: pricedLines,
    };
    const error = await onSave(q);
    setSaving(false);
    if (error) setSaveError(error);
  };

  return (
    <Modal title={initial ? `Editar ${initial.number}` : "Nueva Cotización"} onClose={onClose} size="full">
      {setupIssues.length > 0 && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupIssues.join(" ")}
        </div>
      )}
      {/* Progress stepper */}
      <div className="flex items-center gap-0 mb-6">
        {[{ n: 1, label: "Datos generales" }, { n: 2, label: "Líneas de detalle" }].map((s, i) => (
          <div key={s.n} className="flex items-center gap-0 flex-1">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s.n ? "bg-[#102c4d] text-white" : "bg-gray-200 text-gray-400"}`}
                style={{ fontFamily: "Outfit, sans-serif" }}>
                {step > s.n ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                ) : s.n}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${step === s.n ? "text-[#102c4d]" : "text-gray-400"}`} style={{ fontFamily: "Outfit, sans-serif" }}>{s.label}</span>
            </div>
            {i < 1 && <div className={`flex-1 h-0.5 mx-3 ${step > 1 ? "bg-[#102c4d]" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="space-y-5">
          <Field label="Contacto">
            <ContactSelect value={contactId} onChange={setContactId} contacts={contacts} />
          </Field>

          {contactId && (() => {
            const ct = contacts.find((c) => c.id === contactId)!;
            return (
              <div className="flex items-center gap-3 bg-[#102c4d]/5 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-[#102c4d] flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {ct.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-[#102c4d]">{ct.name}</div>
                  <div className="text-gray-500 text-xs">{ct.company} · {ct.email} · {ct.phone}</div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fecha inicio alquiler">
              <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Fecha fin alquiler">
              <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
            </Field>
          </div>

          {durationDays(startDate, endDate) > 0 && (
            <div className="flex items-center gap-2 text-sm text-[#102c4d] bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-400 flex-shrink-0"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
              Duración calculada: <strong>{durationLabel(startDate, endDate)}</strong>
            </div>
          )}

          <Field label="Empleado responsable">
            <select className={selectCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {employees.map((e) => <option key={e.idempleado} value={e.idempleado}>{displayEmployee(e)}</option>)}
            </select>
          </Field>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="space-y-4">
          {contactId && (
            <div className="flex flex-wrap items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600">
              <span><strong className="text-gray-900">{contacts.find((c) => c.id === contactId)?.name}</strong></span>
              <span className="text-gray-300">|</span>
              <span>{formatearFecha(startDate)} → {formatearFecha(endDate)}</span>
              <span className="text-gray-300">|</span>
              <span>{displayEmployee(employees.find((e) => String(e.idempleado) === employeeId) ?? employees[0])}</span>
              <span className="text-gray-300">|</span>
              <span>{durationLabel(startDate, endDate)}</span>
            </div>
          )}

          {/* Lines — desktop */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Categoría", "Tarifas", "Cantidad", "Descuento (Q)", "Subtotal", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pricedLines.map((line) => {
                  // El desplegable siempre incluye la tarifa ya
                  // seleccionada en ESTA línea, más las vigentes de
                  // categorías que ninguna OTRA línea esté usando.
                  const opciones = tariffs.filter(
                    (t) => t.idtarifaactivo === line.tariffId ||
                      !lines.some((other) => other.id !== line.id && tariffById.get(other.tariffId)?.idcategoria === t.idcategoria)
                  );
                  return (
                    <tr key={line.id} className="hover:bg-gray-50/30">
                      <td className="px-3 py-2.5 min-w-[130px]">
                        <select
                          className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-[#102c4d] w-full"
                          value={line.tariffId}
                          onChange={(e) => updateLine(line.id, "tariffId", Number(e.target.value))}
                        >
                          {opciones.map((t) => <option key={t.idtarifaactivo} value={t.idtarifaactivo}>{t.categoria?.nombre ?? "Categoría"}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="bg-[#102c4d]/5 rounded-lg px-3 py-2 min-w-[150px] text-[10px] text-[#102c4d]">
                          <div>Mes {fmt(line.rateMonth)} · sem {fmt(line.rateWeek)}</div>
                          <div className="text-gray-500">Día {fmt(line.rateDayUnique)} · extra {fmt(line.rateDayExtra)}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 min-w-[70px]">
                        <input
                          type="number" min={1}
                          className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-center w-16 focus:outline-none focus:border-[#102c4d]"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, "quantity", Math.max(1, +e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2.5 min-w-[110px]">
                        <input
                          type="number" min={0} step="0.01"
                          className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-center w-24 focus:outline-none focus:border-[#102c4d]"
                          value={line.discount}
                          onChange={(e) => updateLine(line.id, "discount", Math.max(0, +e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2.5 min-w-[110px]">
                        <div className="font-bold text-[#102c4d] text-sm">{fmt(line.subtotal)}</div>
                        <div className="text-[10px] text-gray-500">{durationLabel(startDate, endDate)}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => removeLine(line.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                          disabled={lines.length === 1}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lines — mobile */}
          <div className="md:hidden space-y-3">
            {pricedLines.map((line, idx) => {
              const opciones = tariffs.filter(
                (t) => t.idtarifaactivo === line.tariffId ||
                  !lines.some((other) => other.id !== line.id && tariffById.get(other.tariffId)?.idcategoria === t.idcategoria)
              );
              return (
                <div key={line.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Línea {idx + 1}</span>
                    <button onClick={() => removeLine(line.id)} disabled={lines.length === 1} className="p-1.5 rounded text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                  <Field label="Categoría">
                    <select className={selectCls} value={line.tariffId} onChange={(e) => updateLine(line.id, "tariffId", Number(e.target.value))}>
                      {opciones.map((t) => <option key={t.idtarifaactivo} value={t.idtarifaactivo}>{t.categoria?.nombre ?? "Categoría"}</option>)}
                    </select>
                  </Field>
                  <div className="flex items-center gap-2 bg-[#102c4d]/5 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-600">Mes {fmt(line.rateMonth)} · semana {fmt(line.rateWeek)}</span>
                  </div>
                  <div className="text-xs text-gray-500">Día único {fmt(line.rateDayUnique)} · día extra {fmt(line.rateDayExtra)}</div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Cantidad">
                      <input type="number" min={1} className={inputCls + " text-center"} value={line.quantity} onChange={(e) => updateLine(line.id, "quantity", Math.max(1, +e.target.value))} />
                    </Field>
                    <Field label="Desc. (Q)">
                      <input type="number" min={0} step="0.01" className={inputCls + " text-center"} value={line.discount} onChange={(e) => updateLine(line.id, "discount", Math.max(0, +e.target.value))} />
                    </Field>
                    <Field label="Duración"><div className={inputCls + " bg-gray-50 text-gray-600"}>{durationLabel(startDate, endDate)}</div></Field>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">Subtotal</span>
                    <div className="text-right">
                      <div className="font-bold text-[#102c4d]">{fmt(line.subtotal)}</div>
                      {line.discount > 0 && <div className="text-[10px] text-gray-400">Descuento: {fmt(line.discount)}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={addLine}
            disabled={!unusedTariffs.length}
            className="flex items-center gap-2 text-sm font-semibold text-[#102c4d] border-2 border-dashed border-gray-300 hover:border-[#102c4d] rounded-xl px-4 py-3 w-full justify-center transition-colors hover:bg-[#102c4d]/5 disabled:opacity-50"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#ffbc07]"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            {unusedTariffs.length ? "Agregar categoría" : "Ya agregaste todas las categorías con tarifa vigente"}
          </button>

          <div className="bg-[#102c4d] rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Total cotización</div>
              <div className="text-white text-2xl font-bold mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>{fmt(total)}</div>
            </div>
            <div className="text-right">
              <div className="text-blue-300 text-xs">{lines.length} línea(s)</div>
              <div className="text-blue-300 text-xs mt-0.5">{lines.reduce((a, l) => a + l.quantity, 0)} equipos totales</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        {saveError && <p className="mr-4 text-sm text-red-600">{saveError}</p>}
        <button onClick={step === 1 ? onClose : () => setStep(1)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          {step === 2 && <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>}
          {step === 1 ? "Cancelar" : "Paso anterior"}
        </button>
        {step === 1 ? (
          <button
            disabled={!step1Valid}
            onClick={() => setStep(2)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[#102c4d] text-white rounded-lg hover:bg-[#1a3d6b] disabled:opacity-40 transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Continuar
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving || !lines.length}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors shadow-md disabled:opacity-60"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear cotización"}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── Quote Detail ───────────────────────────────────────────────────────────────

function QuoteDetail({ quote, contacts, onBack, onEdit, onCancel }: {
  quote: Quote;
  contacts: Contact[];
  onBack: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const ct = contacts.find((c) => c.id === quote.contactId);
  const total = quoteTotal(quote.lines);
  // IMPORTANTE: Editar, igual que Cancelar y Convertir, solo se
  // permite mientras la cotización sigue en estado "Cotizado".
  const isEditable = quote.status === "Cotizado";
  const isCancelable = quote.status === "Cotizado";
  const isConvertible = quote.status === "Cotizado";

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <button onClick={onBack} className="self-start p-2 rounded-lg hover:bg-gray-200 text-[#102c4d] transition-colors flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>{quote.number}</h2>
            <StatusBadge status={quote.status} />
          </div>
          <p className="text-gray-400 text-sm mt-0.5">Creado el {(formatearFecha(quote.createdAt))} · {quote.employee}</p>
        </div>

        <div className="flex flex-wrap gap-2 self-start">
          {isCancelable && (
            <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              Cancelar
            </button>
          )}
          {isEditable && (
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#102c4d] border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
              Editar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contacto</p>
            {ct ? (
              <div className="space-y-1">
                <div className="font-semibold text-gray-900">{ct.name}</div>
                <div className="text-sm text-gray-500">{ct.company}</div>
                <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                  <div>{ct.email}</div>
                  <div>{ct.phone}</div>
                </div>
              </div>
            ) : <p className="text-sm text-gray-400">—</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Período de alquiler</p>
            <div className="space-y-2">
              {[["Inicio", formatearFecha(quote.startDate)], ["Fin", formatearFecha(quote.endDate)], ["Duración", durationLabel(quote.startDate, quote.endDate)]].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-xs text-gray-400">{k}</span>
                  <span className="text-xs font-semibold text-gray-900">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-[#102c4d] font-bold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>Líneas de cotización</h3>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Categoría", "Tarifas", "Cant.", "Descuento", "Subtotal"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quote.lines.map((line) => (
                    <tr key={line.id} className="hover:bg-gray-50/30">
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2.5 py-1 rounded-full font-semibold">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                          {line.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">Mes {fmt(line.rateMonth)} · Sem. {fmt(line.rateWeek)}<br />Día {fmt(line.rateDayUnique)} · Extra {fmt(line.rateDayExtra)}</td>
                      <td className="px-4 py-3.5 font-semibold text-gray-900">{line.quantity}</td>
                      <td className="px-4 py-3.5">
                        {line.discount > 0 ? (
                          <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{fmt(line.discount)}</span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[#102c4d]">{fmt(line.subtotal)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {quote.lines.map((line) => (
                <div key={line.id} className="px-4 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs bg-[#102c4d]/8 text-[#102c4d] px-2.5 py-1 rounded-full font-semibold">{line.category}</span>
                    {line.discount > 0 && <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{fmt(line.discount)}</span>}
                  </div>
                  <div className="grid grid-cols-2 text-xs text-gray-500 gap-2">
                    <div><div>Mes / semana</div><div className="font-semibold text-gray-800">{fmt(line.rateMonth)} / {fmt(line.rateWeek)}</div></div>
                    <div><div>Día único / extra</div><div className="font-semibold text-gray-800">{fmt(line.rateDayUnique)} / {fmt(line.rateDayExtra)}</div></div>
                    <div><div>Cantidad</div><div className="font-semibold text-gray-800">{line.quantity}</div></div>
                    <div><div>Duración</div><div className="font-semibold text-gray-800">{durationLabel(quote.startDate, quote.endDate)}</div></div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <span className="text-xs text-gray-400">Subtotal</span>
                    <div className="font-bold text-[#102c4d]">{fmt(line.subtotal)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#102c4d] px-5 py-4 flex items-center justify-between">
              <span className="text-blue-200 text-sm font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                Total — {quote.lines.reduce((a, l) => a + l.quantity, 0)} equipos
              </span>
              <span className="text-white text-xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Confirm modal ──────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, confirmCls, onConfirm, onClose }: {
  title: string; message: string; confirmLabel: string; confirmCls: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-gray-600">{message}</p>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
        <button onClick={() => { onConfirm(); onClose(); }} className={`px-5 py-2 text-sm font-bold rounded-lg transition-colors ${confirmCls}`} style={{ fontFamily: "Outfit, sans-serif" }}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

// ── Quotes module ──────────────────────────────────────────────────────────────
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import { FileDown } from "lucide-react";

export default function QuotesModule() {
  const { perfil } = useAuth();
  const { contactos, loading: contactsLoading, error: contactsError } = useContactos();
  const { empleados, loading: employeesLoading, error: employeesError } = useEmpleados();
  const { tarifas, loading: tariffsLoading, error: tariffsError } = useTarifas();
  const { cotizaciones, loading: quotesLoading, error: quotesError, crear, editar, cambiarEstado, lineasDe } = useCotizaciones();
  const { estados: estadosCotizacion } = useEstadosCotizacion();

  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [editQuote, setEditQuote] = useState<Quote | null>(null);
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Quote | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const contacts = useMemo(() => contactos.filter((c) => c.estado).map(displayContact), [contactos]);
  const activeEmployees = useMemo(() => empleados.filter((e) => e.estado), [empleados]);
  const defaultEmployeeId = String(
    activeEmployees.some((e) => e.idempleado === perfil?.idempleado)
      ? perfil?.idempleado
      : activeEmployees[0]?.idempleado ?? ""
  );
  // Solo tarifas VIGENTES -- esto es lo que se ofrece para armar
  // líneas nuevas (una cotización histórica puede seguir
  // mostrando una tarifa ya cerrada en sus líneas ya guardadas,
  // pero no se puede elegir una tarifa cerrada para una línea nueva).
  const activeTariffs = useMemo(() => tarifas.filter((t) => t.estado), [tarifas]);

  const statusIdByName = useMemo(
    () => new Map(estadosCotizacion.map((s) => [s.estadocotizacion.toLowerCase(), s.idestadocotizacion])),
    [estadosCotizacion]
  );

  const setupIssues = [
    contacts.length ? "" : "No hay contactos activos. Activa o registra uno en Clientes.",
    activeEmployees.length ? "" : "No hay empleados activos para asignar.",
    activeTariffs.length ? "" : "No hay tarifas vigentes; registra una en Activos > Tarifas.",
    statusIdByName.has("cotizado") ? "" : "Falta el estado 'cotizado' en tbestadocotizacion.",
  ].filter(Boolean);

  const wizardLoading = contactsLoading || employeesLoading || tariffsLoading;

  const quotes = useMemo<Quote[]>(() => cotizaciones.map((c) => ({
    id: String(c.idcotizacion),
    number: `COT-${String(c.idcotizacion).padStart(4, "0")}`,
    contactId: String(c.idcontacto),
    employeeId: String(c.idempleado),
    employee: c.empleado ? displayEmployee(c.empleado) : "—",
    createdAt: c.fechacreacion,
    startDate: c.fechainicio,
    endDate: c.fechafin,
    status: statusLabel(c.estado?.estadocotizacion),
    lines: lineasDe(c.idcotizacion).map((d) => ({
      id: String(d.iddetallecotizacion),
      tariffId: d.idtarifaactivo,
      category: d.tarifa?.categoria?.nombre ?? "Categoría",
      rateWeek: Number(d.tarifa?.preciosemana ?? 0),
      rateMonth: Number(d.tarifa?.preciomes ?? 0),
      rateDayUnique: Number(d.tarifa?.preciodiaunico ?? 0),
      rateDayExtra: Number(d.tarifa?.preciodiaextra ?? 0),
      quantity: d.cantidad,
      discount: Number(d.descuento),
      subtotal: Number(d.subtotal),
    })),
  })), [cotizaciones, lineasDe]);

  const filtered = useMemo(() =>
    quotes.filter((q) => {
      if (filterStatus && q.status !== filterStatus) return false;
      if (filterFrom && q.createdAt < filterFrom) return false;
      if (filterTo && q.createdAt > filterTo) return false;
      return true;
    }), [quotes, filterStatus, filterFrom, filterTo]);

  const tableRef = useRef<HTMLDivElement | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: tableRef,
    documentTitle: "Reporte_de_Cotizaciones",
    pageStyle: `
      @page {
        size: landscape;
        margin: 10mm;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          border: 1px solid #ddd;
          padding: 6px;
        }

        tr {
          page-break-inside: avoid;
        }
      }
    `,
  });



  const exportarExcel = () => {
    if (filtered.length === 0) {
      alert("No hay cotizaciones para exportar.");
      return;
    }

    const datos = filtered.map((q) => {
      const contacto = contactos.find(
        (c) => String(c.idcontacto) === q.contactId
      );

      return {
        "N.º Cotización": q.number,
        "Contacto": contacto ? displayContact(contacto) : "—",
        "Empleado": q.employee,
        "Fecha de creación": q.createdAt,
        "Fecha de inicio": q.startDate,
        "Fecha de fin": q.endDate,
        "Cantidad de líneas": q.lines.length,
        "Total cotización (Q)": q.lines.reduce(
          (total, linea) => total + linea.subtotal,
          0
        ),
        "Estado": q.status,
      };
    });

    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(libro, hoja, "Cotizaciones");
    XLSX.writeFile(libro, "Reporte_de_Cotizaciones.xlsx");
  };

  async function handleSave(q: Quote): Promise<string | null> {
    const lineasPayload = q.lines.map((l) => ({
      idtarifaactivo: l.tariffId,
      cantidad: l.quantity,
      descuento: l.discount,
      subtotal: l.subtotal,
    }));

    if (q.id) {
      const resultado = await editar(
        Number(q.id),
        { idempleado: Number(q.employeeId), idcontacto: Number(q.contactId), fechainicio: q.startDate, fechafin: q.endDate },
        lineasPayload
      );
      if (resultado.error) return resultado.error;
      setShowWizard(false);
      setEditQuote(null);
      if (detailQuote) setDetailQuote({ ...q });
      return null;
    }

    const idestadoInicial = statusIdByName.get("cotizado");
    if (!idestadoInicial) return "No se encontró el estado 'cotizado' en tbestadocotizacion.";

    const resultado = await crear(
      { idempleado: Number(q.employeeId), idcontacto: Number(q.contactId), idestadocotizacion: idestadoInicial, fechainicio: q.startDate, fechafin: q.endDate },
      lineasPayload
    );
    if (resultado.error) return resultado.error;
    setShowWizard(false);
    setEditQuote(null);
    return null;
  }

  async function cancelarCotizacion(quote: Quote) {
    const idestado = statusIdByName.get("cancelado");
    if (!idestado) { setActionError("No se encontró el estado 'cancelado' en tbestadocotizacion."); return; }
    const resultado = await cambiarEstado(Number(quote.id), idestado);
    if (resultado.error) { setActionError(resultado.error); return; }
    setDetailQuote((d) => d ? { ...d, status: "Cancelado" } : d);
  }

  if (detailQuote) {
    const live = quotes.find((q) => q.id === detailQuote.id) ?? detailQuote;
    return (
      <>
        <QuoteDetail
          quote={live}
          contacts={contacts}
          onBack={() => setDetailQuote(null)}
          onEdit={() => setEditQuote(live)}
          onCancel={() => setCancelTarget(live)}
        />
        {actionError && <p className="mx-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{actionError}</p>}
        {editQuote && (
          <QuoteWizard
            onClose={() => setEditQuote(null)}
            onSave={handleSave}
            contacts={contacts}
            employees={activeEmployees}
            tariffs={activeTariffs}
            defaultEmployeeId={defaultEmployeeId}
            setupIssues={setupIssues}
            initial={editQuote}
          />
        )}
        {cancelTarget && (
          <ConfirmModal
            title="Cancelar cotización"
            message={`¿Confirmas que deseas cancelar la cotización ${cancelTarget.number}? Esta acción cambiará su estado a "Cancelado".`}
            confirmLabel="Sí, cancelar"
            confirmCls="bg-red-500 text-white hover:bg-red-600"
            onConfirm={() => { void cancelarCotizacion(cancelTarget); }}
            onClose={() => setCancelTarget(null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Cotizaciones</h2>
          <p className="text-gray-400 text-sm">{quotes.length} cotizaciones · {quotes.filter((q) => q.status === "Cotizado").length} pendientes</p>
        </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePrint}
                  disabled={wizardLoading || filtered.length === 0}
                  className="flex items-center gap-2 border border-[#102c4d] text-[#102c4d] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" />
                  Exportar PDF
                </button>

                <button
                  onClick={exportarExcel}
                  disabled={wizardLoading || filtered.length === 0}
                  className="flex items-center gap-2 border border-emerald-600 text-emerald-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" />
                  Exportar Excel
                </button>

        <button
          onClick={() => setShowWizard(true)}
          disabled={wizardLoading}
          title={wizardLoading ? "Cargando datos para cotizar" : undefined}
          className="flex items-center gap-2 bg-[#ffbc07] text-[#102c4d] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#e5a800] disabled:cursor-wait disabled:opacity-60 transition-colors shadow-sm"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
          {wizardLoading ? "Cargando datos…" : "Nueva Cotización"}
        </button>
              </div>
      </div>

      {(quotesError || contactsError || employeesError || tariffsError || actionError) && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {quotesError ?? contactsError ?? employeesError ?? tariffsError ?? actionError}
        </p>
      )}
      {quotesLoading && <p className="text-sm text-gray-500">Cargando cotizaciones…</p>}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
            Filtros:
          </div>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#102c4d] bg-white" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            <option>Cotizado</option>
            <option>Alquilado</option>
            <option>Cancelado</option>
            <option>Completado</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Creado entre</span>
            <input type="date" className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#102c4d]" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            <span className="text-gray-400 text-xs">y</span>
            <input type="date" className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#102c4d]" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          </div>
          {(filterStatus || filterFrom || filterTo) && (
            <button onClick={() => { setFilterStatus(""); setFilterFrom(""); setFilterTo(""); }} className="text-xs text-red-500 hover:text-red-700 font-medium">Limpiar</button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["Cotizado", "Alquilado", "Cancelado", "Completado"] as QuoteStatus[]).map((s) => {
          const count = quotes.filter((q) => q.status === s).length;
          const c = STATUS_CFG[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${filterStatus === s ? `${c.cls} ring-2 ring-offset-1 ring-current` : `${c.cls} opacity-70 hover:opacity-100`}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
              {s} <span className="ml-0.5 font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={tableRef}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:!block print:!border-0 print:!shadow-none"
      > 
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">
            Reporte de Cotizaciones
          </h1>

          <p className="text-center text-sm text-gray-600 mt-1">
            ALQUILERES ATECA
          </p>

          <div className="mt-5 border-b border-gray-300 pb-3 text-sm space-y-1">
            <p>
              <strong>Estado:</strong>{" "}
              {filterStatus || "Todos los estados"}
            </p>

            <p>
              <strong>Fecha desde:</strong>{" "}
              {formatearFecha(filterFrom) || "Sin fecha inicial"}
            </p>

            <p>
              <strong>Fecha hasta:</strong>{" "}
              {formatearFecha(filterTo) || "Sin fecha final"}
            </p>

            <p>
              <strong>Total de cotizaciones:</strong>{" "}
              {filtered.length}
            </p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["N° Cotización", "Contacto / Empresa", "Empleado", "Creación", "Período alquiler", "Total", "Estado", ""].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!quotesLoading && filtered.map((q) => {
              const ct = contacts.find((c) => c.id === q.contactId);
              const total = quoteTotal(q.lines);
              return (
                <tr key={q.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailQuote(q)}>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-bold text-[#102c4d] bg-blue-50 px-2 py-1 rounded">{q.number}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-gray-900 text-sm">{ct?.name ?? "—"}</div>
                    <div className="text-xs text-gray-400">{ct?.company}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-600">{q.employee}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">{formatearFecha(q.createdAt)}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                    {formatearFecha(q.startDate)} <span className="text-gray-300 mx-1">→</span> {formatearFecha(q.endDate)}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-[#102c4d] whitespace-nowrap">{fmt(total)}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={q.status} /></td>
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetailQuote(q)} title="Ver detalle" className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#102c4d] transition-colors">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                      </button>
                      {q.status === "Cotizado" && (
                        <button onClick={() => setEditQuote(q)} title="Editar" className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!quotesLoading && filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-14 text-gray-400 text-sm">Sin cotizaciones para los filtros seleccionados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {!quotesLoading && filtered.map((q) => {
          const ct = contacts.find((c) => c.id === q.contactId);
          const total = quoteTotal(q.lines);
          return (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3" onClick={() => setDetailQuote(q)}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs font-bold text-[#102c4d] bg-blue-50 px-2 py-1 rounded">{q.number}</span>
                <StatusBadge status={q.status} />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{ct?.name ?? "—"}</div>
                <div className="text-xs text-gray-400">{ct?.company}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div><div>Creado</div><div className="font-medium text-gray-700">{q.createdAt}</div></div>
                <div><div>Período</div><div className="font-medium text-gray-700">{q.startDate} → {q.endDate}</div></div>
                <div><div>Empleado</div><div className="font-medium text-gray-700">{q.employee}</div></div>
                <div><div>Total</div><div className="font-bold text-[#102c4d]">{fmt(total)}</div></div>
              </div>
            </div>
          );
        })}
        {!quotesLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border">Sin resultados.</div>
        )}
      </div>

      {showWizard && (
        <QuoteWizard
          onClose={() => setShowWizard(false)}
          onSave={handleSave}
          contacts={contacts}
          employees={activeEmployees}
          tariffs={activeTariffs}
          defaultEmployeeId={defaultEmployeeId}
          setupIssues={setupIssues}
        />
      )}
      {editQuote && !detailQuote && (
        <QuoteWizard
          onClose={() => setEditQuote(null)}
          onSave={handleSave}
          contacts={contacts}
          employees={activeEmployees}
          tariffs={activeTariffs}
          defaultEmployeeId={defaultEmployeeId}
          setupIssues={setupIssues}
          initial={editQuote}
        />
      )}
      {cancelTarget && (
        <ConfirmModal
          title="Cancelar cotización"
          message={`¿Confirmas cancelar la cotización ${cancelTarget.number}?`}
          confirmLabel="Sí, cancelar"
          confirmCls="bg-red-500 text-white hover:bg-red-600"
          onConfirm={() => { void cancelarCotizacion(cancelTarget); }}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}