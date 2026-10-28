import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import { useReportes, type ReporteData } from "./uses/useReportes";
import { fechaLocalHoy } from "./uses/useDashboard";
import { fmtQ, formatearFecha } from "../types/format";

// ── Periodos ────────────────────────────────────────────────────────────────────

type Periodo = "mes" | "mes_anterior" | "90dias" | "anio" | "todo" | "custom";

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "mes", label: "Este mes" },
  { id: "mes_anterior", label: "Mes anterior" },
  { id: "90dias", label: "Últimos 90 días" },
  { id: "anio", label: "Este año" },
  { id: "todo", label: "Todo el historial" },
  { id: "custom", label: "Personalizado" },
];

function rangoDe(periodo: Periodo): { desde: string; hasta: string } {
  const hoy = fechaLocalHoy();
  const [y, m] = hoy.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");

  if (periodo === "mes") return { desde: `${y}-${pad(m)}-01`, hasta: hoy };
  if (periodo === "mes_anterior") {
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    const ultimo = new Date(Date.UTC(py, pm, 0)).getUTCDate();
    return { desde: `${py}-${pad(pm)}-01`, hasta: `${py}-${pad(pm)}-${pad(ultimo)}` };
  }
  if (periodo === "90dias") {
    const d = new Date(`${hoy}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 89);
    return { desde: d.toISOString().slice(0, 10), hasta: hoy };
  }
  if (periodo === "anio") return { desde: `${y}-01-01`, hasta: hoy };
  return { desde: "2000-01-01", hasta: hoy };
}

// ── Piezas visuales ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className={`bg-white rounded-xl border p-5 shadow-sm ${color}`}>
      <div className="text-2xl font-bold text-[#102c4d]" style={{ fontFamily: "Outfit, sans-serif" }}>{value}</div>
      <div className="text-[#102c4d] text-sm font-semibold mt-0.5">{label}</div>
      <div className="text-gray-400 text-xs mt-1">{sub}</div>
    </div>
  );
}

interface FilaRanking { clave: string | number; titulo: string; detalle: string; valor: number; valorTexto: string }

function RankingCard({ titulo, descripcion, filas, barra }: {
  titulo: string; descripcion: string; filas: FilaRanking[]; barra: string;
}) {
  const max = Math.max(...filas.map((f) => f.valor), 0);
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden break-inside-avoid">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-[#102c4d] font-bold text-base" style={{ fontFamily: "Outfit, sans-serif" }}>{titulo}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{descripcion}</p>
      </div>
      <div className="p-4 space-y-3.5">
        {filas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin datos en el periodo seleccionado.</p>
        ) : (
          filas.map((f, i) => (
            <div key={f.clave}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-start gap-2">
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${i === 0 ? "bg-[#ffbc07] text-[#102c4d]" : "bg-gray-100 text-gray-500"}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{f.titulo}</div>
                    <div className="text-xs text-gray-400 truncate">{f.detalle}</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-[#102c4d] whitespace-nowrap">{f.valorTexto}</div>
              </div>
              <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barra}`} style={{ width: `${max > 0 ? (f.valor / max) * 100 : 0}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function GraficoMensual({ serie }: { serie: ReporteData["serie_mensual"] }) {
  const max = Math.max(...serie.flatMap((s) => [s.ingresos, s.mantenimiento]), 0);
  const etiqueta = (mes: string) =>
    new Date(`${mes}-01T12:00:00`).toLocaleDateString("es-GT", { month: "short" });
  const alto = (v: number) => `${max > 0 ? (v / max) * 100 : 0}%`;

  return (
    <div>
      <div className="flex items-end gap-2 h-44">
        {serie.map((s) => (
          <div key={s.mes} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1">
            <div className="w-full flex-1 min-h-0 flex items-end justify-center gap-0.5">
              <div className="w-1/2 bg-emerald-500 rounded-t" style={{ height: alto(s.ingresos) }} title={`Ingresos: ${fmtQ(s.ingresos)}`} />
              <div className="w-1/2 bg-amber-400 rounded-t" style={{ height: alto(s.mantenimiento) }} title={`Mantenimiento: ${fmtQ(s.mantenimiento)}`} />
            </div>
            <span className="text-[10px] text-gray-400">{etiqueta(s.mes)}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Ingresos por alquiler</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />Gasto en mantenimiento</span>
      </div>
    </div>
  );
}

// ── Reportes ────────────────────────────────────────────────────────────────────

export default function ReportesDashboard() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [cDesde, setCDesde] = useState(() => rangoDe("mes").desde);
  const [cHasta, setCHasta] = useState(() => rangoDe("mes").hasta);

  const rango = useMemo(
    () => (periodo === "custom" ? { desde: cDesde, hasta: cHasta } : rangoDe(periodo)),
    [periodo, cDesde, cHasta]
  );
  const rangoInvalido = !rango.desde || !rango.hasta || rango.desde > rango.hasta;

  const { data, loading, error, recargar } = useReportes(rango.desde, rango.hasta);

  const informeRef = useRef<HTMLDivElement | null>(null);
  const imprimir = useReactToPrint({
    contentRef: informeRef,
    documentTitle: "Reporte_ATECA",
    pageStyle: `
      @page { size: landscape; margin: 10mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `,
  });

  const r = data?.resumen;
  const resultado = r ? r.ingresos + r.danios - r.mantenimiento : 0;
  const puntualidad = r && r.lineas_devueltas > 0 ? Math.round((r.lineas_puntuales / r.lineas_devueltas) * 100) : null;
  const conversion = r && r.cotizaciones > 0 ? Math.round((r.cotizaciones_convertidas / r.cotizaciones) * 100) : null;

  const etiquetaPeriodo =
    periodo === "todo"
      ? "Todo el historial"
      : `${formatearFecha(rango.desde) || rango.desde} al ${formatearFecha(rango.hasta) || rango.hasta}`;

  const exportarExcel = () => {
    if (!data) return;
    const libro = XLSX.utils.book_new();
    const agregar = (nombre: string, filas: object[]) =>
      XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas.length ? filas : [{ Aviso: "Sin datos" }]), nombre);

    agregar("Resumen", [
      { Indicador: "Periodo", Valor: etiquetaPeriodo },
      { Indicador: "Ingresos por alquiler (Q)", Valor: data.resumen.ingresos },
      { Indicador: "Cobrado por daños (Q)", Valor: data.resumen.danios },
      { Indicador: "Gasto en mantenimiento (Q)", Valor: data.resumen.mantenimiento },
      { Indicador: "Resultado simplificado (Q)", Valor: resultado },
      { Indicador: "Alquileres iniciados", Valor: data.resumen.alquileres },
      { Indicador: "Devoluciones puntuales (%)", Valor: puntualidad ?? "—" },
      { Indicador: "Conversión de cotizaciones (%)", Valor: conversion ?? "—" },
    ]);
    agregar("Activos por ingresos", data.top_activos_ingresos.map((a) => ({
      Código: a.codigoqr ?? "—", Activo: a.nombre, "Ingresos (Q)": a.ingresos, Alquileres: a.alquileres,
    })));
    agregar("Activos por mantenimiento", data.top_activos_mantenimiento.map((a) => ({
      Código: a.codigoqr ?? "—", Activo: a.nombre, "Gasto (Q)": a.gasto, Mantenimientos: a.cantidad,
    })));
    agregar("Clientes", data.top_contactos.map((c) => ({
      Contacto: c.nombre, Empresa: c.empresa ?? "—", Alquileres: c.alquileres, "Facturado (Q)": c.facturado,
    })));
    agregar("Por categoría", data.por_categoria.map((c) => ({
      Categoría: c.nombre, "Ingresos (Q)": c.ingresos, Líneas: c.alquileres,
    })));
    agregar("Últimos 12 meses", data.serie_mensual.map((m) => ({
      Mes: m.mes, "Ingresos (Q)": m.ingresos, "Mantenimiento (Q)": m.mantenimiento,
    })));
    XLSX.writeFile(libro, `Reporte_${rango.desde}_${rango.hasta}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24 md:pb-6">
      {/* Controles */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-[#102c4d] uppercase tracking-wider">Periodo</span>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#102c4d]"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Periodo)}
          >
            {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {periodo === "custom" && (
            <>
              <input type="date" className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#102c4d]" value={cDesde} onChange={(e) => setCDesde(e.target.value)} />
              <span className="text-gray-400 text-xs">a</span>
              <input type="date" className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#102c4d]" value={cHasta} onChange={(e) => setCHasta(e.target.value)} />
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={recargar} disabled={loading} className="px-3 py-2 text-xs font-semibold text-[#102c4d] border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {loading ? "Cargando…" : "↻ Actualizar"}
          </button>
          <button onClick={() => imprimir()} disabled={!data} className="px-3 py-2 text-xs font-bold border border-[#102c4d] text-[#102c4d] rounded-lg hover:bg-blue-50 disabled:opacity-50">
            Exportar PDF
          </button>
          <button onClick={exportarExcel} disabled={!data} className="px-3 py-2 text-xs font-bold border border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50">
            Exportar Excel
          </button>
        </div>
      </div>

      {rangoInvalido && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Elige un rango válido: la fecha inicial no puede ser posterior a la final.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">No se pudo cargar el reporte.</p>
          <p className="mt-1 break-words">{error}</p>
          <p className="mt-1 text-xs">Si dice que la función no existe, ejecuta 12-reporte-dashboard.sql en Supabase.</p>
        </div>
      )}
      {loading && !data && !rangoInvalido && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">Calculando reporte…</div>
      )}

      {data && !rangoInvalido && (
        <div ref={informeRef} className="space-y-6">
          <div className="hidden print:block">
            <h1 className="text-2xl font-bold text-center">Reporte de gestión</h1>
            <p className="text-center text-sm text-gray-600 mt-1">ALQUILERES ATECA · {etiquetaPeriodo}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard label="Ingresos por alquiler" value={fmtQ(data.resumen.ingresos)} sub={`${data.resumen.alquileres} alquiler(es) iniciados`} color="border-emerald-200 bg-emerald-50" />
            <KpiCard label="Cobrado por daños" value={fmtQ(data.resumen.danios)} sub="De equipos devueltos en el periodo" color="border-red-200 bg-red-50" />
            <KpiCard label="Gasto en mantenimiento" value={fmtQ(data.resumen.mantenimiento)} sub="Costo de los mantenimientos" color="border-amber-200 bg-amber-50" />
            <KpiCard label="Resultado" value={fmtQ(resultado)} sub="Ingresos + daños − mantenimiento" color="border-blue-200 bg-blue-50" />
            <KpiCard label="Devoluciones puntuales" value={puntualidad === null ? "—" : `${puntualidad}%`} sub={`${data.resumen.lineas_puntuales} de ${data.resumen.lineas_devueltas} equipos`} color="border-purple-200 bg-purple-50" />
            <KpiCard label="Conversión de cotizaciones" value={conversion === null ? "—" : `${conversion}%`} sub={`${data.resumen.cotizaciones_convertidas} de ${data.resumen.cotizaciones} cotizadas`} color="border-gray-200 bg-gray-50" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <RankingCard
              titulo="Activos que más ingresos generan"
              descripcion="Suma de lo cobrado por alquiler en el periodo"
              barra="bg-emerald-500"
              filas={data.top_activos_ingresos.map((a) => ({
                clave: a.idactivo,
                titulo: a.nombre,
                detalle: `${a.codigoqr ?? "—"} · ${a.alquileres} alquiler(es)`,
                valor: a.ingresos,
                valorTexto: fmtQ(a.ingresos),
              }))}
            />
            <RankingCard
              titulo="Activos con más gasto en mantenimiento"
              descripcion="Suma del costo de sus mantenimientos"
              barra="bg-amber-400"
              filas={data.top_activos_mantenimiento.map((a) => ({
                clave: a.idactivo,
                titulo: a.nombre,
                detalle: `${a.codigoqr ?? "—"} · ${a.cantidad} mantenimiento(s)`,
                valor: a.gasto,
                valorTexto: fmtQ(a.gasto),
              }))}
            />
            <RankingCard
              titulo="Clientes con más alquileres"
              descripcion="Alquileres iniciados en el periodo (sin cancelados)"
              barra="bg-[#102c4d]"
              filas={data.top_contactos.map((c) => ({
                clave: c.idcontacto,
                titulo: c.nombre,
                detalle: `${c.empresa ?? "Sin empresa"} · ${fmtQ(c.facturado)} facturado`,
                valor: c.alquileres,
                valorTexto: `${c.alquileres} alquiler(es)`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <RankingCard
              titulo="Ingresos por categoría"
              descripcion="Qué tipo de equipo deja más ingresos"
              barra="bg-emerald-500"
              filas={data.por_categoria.map((c) => ({
                clave: c.nombre,
                titulo: c.nombre,
                detalle: `${c.alquileres} equipo(s) devuelto(s)`,
                valor: c.ingresos,
                valorTexto: fmtQ(c.ingresos),
              }))}
            />
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden break-inside-avoid">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-[#102c4d] font-bold text-base" style={{ fontFamily: "Outfit, sans-serif" }}>Últimos 12 meses</h3>
                <p className="text-xs text-gray-400 mt-0.5">Ingresos frente a gasto en mantenimiento, mes a mes (no depende del periodo elegido)</p>
              </div>
              <div className="p-4"><GraficoMensual serie={data.serie_mensual} /></div>
            </section>
          </div>

          <p className="text-xs text-gray-400">
            Los ingresos cuentan el subtotal de los equipos devueltos en el periodo (por fecha de devolución) y excluyen alquileres cancelados y equipos aún no devueltos.
            El resultado es una cifra simplificada: no incluye otros costos de la empresa.
          </p>
        </div>
      )}
    </div>
  );
}