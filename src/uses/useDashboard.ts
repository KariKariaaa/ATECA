import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

// Mismas reglas que el módulo de Mantenimientos (ciclo de 5 meses).
const CICLO_MANTENIMIENTO_DIAS = 150;
const UMBRAL_ALERTA_DIAS = 45;

// Fecha de HOY en hora local (yyyy-mm-dd). toISOString() usa UTC, y en
// Guatemala (UTC-6) después de las 6 pm ya devolvería la fecha de mañana.
export function fechaLocalHoy() {
  const ahora = new Date();
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const diasEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000);

type Rel<T> = T | T[] | null;
function relatedOne<T>(v: Rel<T> | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export interface AlertaMantenimiento {
  idactivo: number;
  codigo: string | null;
  nombre: string;
  ultimaReferencia: string;
  diasRestantes: number; // <= 0 significa ciclo vencido
}

export interface DevolucionProxima {
  idalquiler: number;
  contacto: string;
  empresa: string | null;
  activos: string; // ej. "3× Andamio + 1× Puntal" (solo lo pendiente)
  pendientes: number;
  fechafinestimada: string;
  diasRestantes: number; // negativo = ya vencida
  parcial: boolean;
}

export interface DashboardData {
  activos: { total: number; disponibles: number; alquilados: number; mantenimiento: number };
  alertasMantenimiento: AlertaMantenimiento[];
  cotizaciones: { delMes: number; pendientes: number };
  alquileres: { iniciados: number; parciales: number };
  devoluciones: DevolucionProxima[]; // todas las pendientes, la más urgente primero
}

interface AlquilerRaw {
  idalquiler: number;
  fechafinestimada: string;
  estado: Rel<{ estadoalquiler: string }>;
  contacto: Rel<{ nombre: string; apellido: string; empresa: Rel<{ nombre: string }> }>;
}
interface LineaPendienteRaw {
  idalquiler: number;
  activo: Rel<{ categoria: Rel<{ nombre: string }> }>;
  alquiler: Rel<AlquilerRaw>;
}
interface ActivoRaw {
  idactivo: number;
  nombre: string;
  codigoqr: string | null;
  fechacompra: string | null;
  estadoActivo: Rel<{ nombre: string }>;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState<Date | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const errores: string[] = [];
    const hoy = fechaLocalHoy();
    const inicioMes = `${hoy.slice(0, 8)}01`;

    // Los conteos por estado necesitan el id del estado: se leen los
    // catálogos (son diminutos) y luego se filtra por id.
    const [estCot, estAlq] = await Promise.all([
      supabase.from("tbestadocotizacion").select("idestadocotizacion, estadocotizacion"),
      supabase.from("tbestadoalquiler").select("idestadoalquiler, estadoalquiler"),
    ]);
    if (estCot.error) errores.push(estCot.error.message);
    if (estAlq.error) errores.push(estAlq.error.message);

    const idCot = (n: string) => estCot.data?.find((e) => e.estadocotizacion.toLowerCase() === n)?.idestadocotizacion;
    const idAlq = (n: string) => estAlq.data?.find((e) => e.estadoalquiler.toLowerCase() === n)?.idestadoalquiler;

    const contar = async (consulta: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
      const { count, error } = await consulta;
      if (error) errores.push(error.message);
      return count ?? 0;
    };
    const contarEstado = (tabla: string, columna: string, id: number | undefined, nombre: string) => {
      if (id === undefined) {
        errores.push(`Falta el estado '${nombre}' en el catálogo.`);
        return Promise.resolve(0);
      }
      return contar(supabase.from(tabla).select("*", { count: "exact", head: true }).eq(columna, id));
    };

    const [activosRes, mantRes, cotDelMes, cotPendientes, alqIniciados, alqParciales, lineasRes] = await Promise.all([
      supabase.from("tbactivo").select("idactivo, nombre, codigoqr, fechacompra, estadoActivo:tbestadoactivo(nombre)"),
      supabase.from("tbmantenimiento").select("idactivo, fecha").order("fecha", { ascending: false }),
      contar(supabase.from("tbcotizacion").select("*", { count: "exact", head: true }).gte("fechacreacion", inicioMes)),
      contarEstado("tbcotizacion", "idestadocotizacion", idCot("cotizado"), "cotizado"),
      contarEstado("tbalquiler", "idestadoalquiler", idAlq("iniciado"), "iniciado"),
      contarEstado("tbalquiler", "idestadoalquiler", idAlq("parcial"), "parcial"),
      supabase
        .from("tbdetallealquiler")
        .select(
          `idalquiler,
           activo:tbactivo ( categoria:tbcategoria ( nombre ) ),
           alquiler:tbalquiler ( idalquiler, fechafinestimada,
             estado:tbestadoalquiler ( estadoalquiler ),
             contacto:tbcontacto ( nombre, apellido, empresa:tbempresa ( nombre ) ) )`
        )
        .is("fechadevolucion", null),
    ]);

    if (activosRes.error) errores.push(activosRes.error.message);
    if (mantRes.error) errores.push(mantRes.error.message);
    if (lineasRes.error) errores.push(lineasRes.error.message);

    // ── Activos por estado ────────────────────────────────────────
    const activos = (activosRes.data ?? []) as unknown as ActivoRaw[];
    let disponibles = 0, alquilados = 0, mantenimiento = 0, inactivos = 0;
    activos.forEach((a) => {
      const estado = relatedOne(a.estadoActivo)?.nombre;
      if (estado === "Disponible") disponibles++;
      else if (estado === "Alquilado") alquilados++;
      else if (estado === "En Mantenimiento") mantenimiento++;
      else if (estado === "Inactivo") inactivos++;
    });

    // ── Alertas de mantenimiento ──────────────────────────────────
    // Referencia = último mantenimiento, o la fecha de compra si nunca tuvo
    // (igual que en el módulo de Mantenimientos). Los inactivos no cuentan.
    const ultimaPorActivo = new Map<number, string>();
    ((mantRes.data ?? []) as { idactivo: number; fecha: string }[]).forEach((m) => {
      if (!ultimaPorActivo.has(m.idactivo)) ultimaPorActivo.set(m.idactivo, m.fecha);
    });
    const alertasMantenimiento: AlertaMantenimiento[] = activos
      .filter((a) => relatedOne(a.estadoActivo)?.nombre !== "Inactivo")
      .flatMap((a) => {
        const referencia = ultimaPorActivo.get(a.idactivo) ?? a.fechacompra;
        if (!referencia) return [];
        const diasRestantes = CICLO_MANTENIMIENTO_DIAS - diasEntre(referencia, hoy);
        return diasRestantes <= UMBRAL_ALERTA_DIAS
          ? [{ idactivo: a.idactivo, codigo: a.codigoqr, nombre: a.nombre, ultimaReferencia: referencia, diasRestantes }]
          : [];
      })
      .sort((x, y) => x.diasRestantes - y.diasRestantes);

    // ── Devoluciones pendientes, agrupadas por alquiler ──────────
    const grupos = new Map<number, { alq: AlquilerRaw; estado: string; porCategoria: Map<string, number>; pendientes: number }>();
    ((lineasRes.data ?? []) as unknown as LineaPendienteRaw[]).forEach((l) => {
      const alq = relatedOne(l.alquiler);
      if (!alq) return;
      const estado = (relatedOne(alq.estado)?.estadoalquiler ?? "").toLowerCase();
      if (estado === "cancelado") return;
      const categoria = relatedOne(relatedOne(l.activo)?.categoria)?.nombre ?? "Activo";
      const g = grupos.get(alq.idalquiler) ?? { alq, estado, porCategoria: new Map<string, number>(), pendientes: 0 };
      g.porCategoria.set(categoria, (g.porCategoria.get(categoria) ?? 0) + 1);
      g.pendientes += 1;
      grupos.set(alq.idalquiler, g);
    });

    const devoluciones: DevolucionProxima[] = Array.from(grupos.values())
      .map((g) => {
        const contacto = relatedOne(g.alq.contacto);
        return {
          idalquiler: g.alq.idalquiler,
          contacto: contacto ? `${contacto.nombre} ${contacto.apellido}`.trim() : "—",
          empresa: relatedOne(contacto?.empresa)?.nombre ?? null,
          activos: Array.from(g.porCategoria.entries()).map(([cat, n]) => `${n}× ${cat}`).join(" + "),
          pendientes: g.pendientes,
          fechafinestimada: g.alq.fechafinestimada,
          diasRestantes: diasEntre(hoy, g.alq.fechafinestimada),
          parcial: g.estado === "parcial",
        };
      })
      .sort((a, b) => a.fechafinestimada.localeCompare(b.fechafinestimada));

    setData({
      activos: { total: activos.length - inactivos, disponibles, alquilados, mantenimiento },
      alertasMantenimiento,
      cotizaciones: { delMes: cotDelMes, pendientes: cotPendientes },
      alquileres: { iniciados: alqIniciados, parciales: alqParciales },
      devoluciones,
    });
    setActualizado(new Date());
    if (errores.length) setError(errores.join(" · "));
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { data, loading, error, actualizado, recargar: cargar };
}