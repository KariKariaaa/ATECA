import { useState } from "react";
import { supabase } from "../../supabaseClient";

type Fila = Record<string, unknown>;

// Orden de CARGA: primero las tablas de las que dependen otras (padres) y al final las hijas.
export const TABLAS_RESPALDO = [
  { tabla: "tbrol", pk: "idrol" },
  { tabla: "tbempleado", pk: "idempleado" },
  { tabla: "tbempresa", pk: "idempresa" },
  { tabla: "tbcontacto", pk: "idcontacto" },
  { tabla: "tbcategoria", pk: "idcategoria" },
  { tabla: "tbestadoactivo", pk: "idestadoactivo" },
  { tabla: "tbactivo", pk: "idactivo" },
  { tabla: "tbtarifaactivo", pk: "idtarifaactivo" },
  { tabla: "tbmantenimiento", pk: "idmantenimiento" },
  { tabla: "tbestadocotizacion", pk: "idestadocotizacion" },
  { tabla: "tbcotizacion", pk: "idcotizacion" },
  { tabla: "tbdetallecotizacion", pk: "iddetallecotizacion" },
  { tabla: "tbestadoalquiler", pk: "idestadoalquiler" },
  { tabla: "tbalquiler", pk: "idalquiler" },
  { tabla: "tbdetallealquiler", pk: "iddetallealquiler" },
  { tabla: "tbregistrodanio", pk: "idregistrodanio" },
  { tabla: "tbusuario", pk: "idusuario" },
  { tabla: "tbbitacora", pk: "idbitacora" },
] as const;

const PAGINA = 500; // la API devuelve como máximo 1000 filas por consulta
const CLAVE_ULTIMO = "ateca_ultimo_respaldo";
const ident = (n: string) => `"${n}"`;

export interface ResultadoRespaldo {
  nombreArchivo: string;
  filas: { tabla: string; filas: number }[];
  bytes: number;
}

// ── Lectura ─────────────────────────────────────────────────────────────────────

async function leerTabla(tabla: string, pk: string): Promise<Fila[]> {
  const filas: Fila[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from(tabla)
      .select("*")
      .order(pk, { ascending: true })
      .range(desde, desde + PAGINA - 1);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    filas.push(...((data ?? []) as Fila[]));
    if (!data || data.length < PAGINA) break;
  }
  return filas;
}

// ── Generación del script SQL ───────────────────────────────────────────────────

function sqlValor(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
  return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
}

function insertsDe(tabla: string, filas: Fila[]): string {
  if (!filas.length) return "-- (sin filas)";
  const cols = Object.keys(filas[0]);
  const cabecera = `insert into public.${tabla} (${cols.map(ident).join(", ")}) overriding system value values\n`;
  const bloques: string[] = [];
  for (let i = 0; i < filas.length; i += 200) {
    const trozo = filas
      .slice(i, i + 200)
      .map((f) => `  (${cols.map((c) => sqlValor(f[c])).join(", ")})`)
      .join(",\n");
    bloques.push(`${cabecera}${trozo};`);
  }
  return bloques.join("\n");
}

// tbusuario apunta a auth.users. Cada fila se inserta SOLO si esa cuenta existe
// (mismo proyecto). En un proyecto nuevo se omiten y las cuentas se recrean desde la app.
function insertsUsuarios(filas: Fila[]): string {
  if (!filas.length) return "-- (sin filas)";
  return filas
    .map((f) => {
      const cols = Object.keys(f);
      const vals = cols.map((c) => (c === "auth_user_id" ? `${sqlValor(f[c])}::uuid` : sqlValor(f[c])));
      return (
        `insert into public.tbusuario (${cols.map(ident).join(", ")}) overriding system value\n` +
        `select ${vals.join(", ")}\n` +
        `where exists (select 1 from auth.users where id = ${sqlValor(f.auth_user_id)}::uuid);`
      );
    })
    .join("\n");
}

function armarScript(datos: Map<string, Fila[]>, autor: string, ahora: Date): string {
  const L: string[] = [];
  const filasDe = (t: string) => datos.get(t) ?? [];

  const correoPorEmpleado = new Map(filasDe("tbempleado").map((e) => [e.idempleado, e.correo]));
  const rolPorId = new Map(filasDe("tbrol").map((r) => [r.idrol, r.nombre]));

  L.push("-- ============================================================");
  L.push("-- RESPALDO DE DATOS · Alquileres ATECA");
  L.push(`-- Generado: ${ahora.toLocaleString("es-GT")} · por: ${autor}`);
  L.push("-- ============================================================");
  L.push(`-- CONTENIDO: solo DATOS de las ${TABLAS_RESPALDO.length} tablas. NO incluye la estructura`);
  L.push("-- (scripts SQL del proyecto), las contraseñas ni las cuentas de acceso");
  L.push("-- (Supabase Authentication), ni las Edge Functions.");
  L.push("--");
  L.push("-- CÓMO RESTAURAR (detalle en el Manual Técnico):");
  L.push("--  1. La base debe tener ya la estructura (scripts SQL) y las tablas VACÍAS.");
  L.push("--     En un proyecto nuevo NO ejecutes los scripts de datos semilla");
  L.push("--     (06 y 09): este respaldo ya trae los catálogos.");
  L.push("--  2. Si las tablas NO están vacías, descomenta el bloque TRUNCATE.");
  L.push("--  3. Ejecuta este archivo completo (SQL Editor de Supabase o psql).");
  L.push("--  4. Compara el conteo que devuelve al final con la lista de abajo.");
  L.push("--  5. Proyecto nuevo: recrea las cuentas de acceso (ver USUARIOS abajo).");
  L.push("--");
  L.push("-- FILAS RESPALDADAS:");
  TABLAS_RESPALDO.forEach(({ tabla }) => L.push(`--   ${tabla}: ${filasDe(tabla).length}`));
  L.push("--");
  L.push("-- USUARIOS (para volver a crear sus cuentas si se restaura en un proyecto nuevo):");
  const usuarios = filasDe("tbusuario");
  if (!usuarios.length) L.push("--   (ninguno)");
  usuarios.forEach((u) =>
    L.push(`--   ${String(u.usuario)} · ${String(rolPorId.get(u.idrol) ?? "?")} · ${String(correoPorEmpleado.get(u.idempleado) ?? "sin correo")}`)
  );
  L.push("-- ============================================================");
  L.push("");
  L.push("begin;");
  L.push("");
  L.push("-- Los totales y estados ya vienen calculados en el respaldo: se apagan los");
  L.push("-- triggers mientras se cargan los datos y se vuelven a encender al final.");
  TABLAS_RESPALDO.forEach(({ tabla }) => L.push(`alter table public.${tabla} disable trigger user;`));
  L.push("");
  L.push("-- ── PASO OPCIONAL: borrar los datos actuales antes de restaurar ──");
  L.push("-- Descomenta SOLO si quieres sobrescribir una base que ya tiene datos.");
  L.push("-- truncate table " + [...TABLAS_RESPALDO].reverse().map((t) => `public.${t.tabla}`).join(", ") + " restart identity cascade;");
  L.push("");

  TABLAS_RESPALDO.forEach(({ tabla }) => {
    L.push(`-- ${tabla} (${filasDe(tabla).length} filas)`);
    L.push(tabla === "tbusuario" ? insertsUsuarios(filasDe(tabla)) : insertsDe(tabla, filasDe(tabla)));
    L.push("");
  });

  L.push("-- Ajusta los contadores de las llaves primarias");
  TABLAS_RESPALDO.forEach(({ tabla, pk }) =>
    L.push(`select setval(pg_get_serial_sequence('public.${tabla}', '${pk}'), coalesce(max(${pk}), 1), max(${pk}) is not null) from public.${tabla};`)
  );
  L.push("");
  TABLAS_RESPALDO.forEach(({ tabla }) => L.push(`alter table public.${tabla} enable trigger user;`));
  L.push("");
  L.push("commit;");
  L.push("");
  L.push("-- Verificación: compara con la lista de filas del encabezado");
  L.push(TABLAS_RESPALDO.map(({ tabla }) => `select '${tabla}' as tabla, count(*) as filas from public.${tabla}`).join("\nunion all\n") + ";");
  return L.join("\n");
}

function descargar(contenido: string, nombre: string) {
  const blob = new Blob([contenido], { type: "application/sql;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function leerUltimo(): Date | null {
  try {
    const v = localStorage.getItem(CLAVE_ULTIMO);
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────────

export function useRespaldo() {
  const [ejecutando, setEjecutando] = useState(false);
  const [progreso, setProgreso] = useState<{ tabla: string; actual: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<ResultadoRespaldo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ultimoRespaldo, setUltimoRespaldo] = useState<Date | null>(leerUltimo);

  async function generar(autor: string) {
    setEjecutando(true);
    setError(null);
    setResultado(null);
    try {
      // Se lee de HIJAS a PADRES: si alguien registra un alquiler mientras se lee,
      // toda fila hija tendrá su padre en el respaldo (los padres solo se agregan, no se borran).
      const datos = new Map<string, Fila[]>();
      const inversa = [...TABLAS_RESPALDO].reverse();
      for (let i = 0; i < inversa.length; i++) {
        const { tabla, pk } = inversa[i];
        setProgreso({ tabla, actual: i + 1, total: inversa.length });
        datos.set(tabla, await leerTabla(tabla, pk));
      }

      const ahora = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      const sello = `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}_${p(ahora.getHours())}${p(ahora.getMinutes())}`;
      const nombreArchivo = `respaldo_ateca_${sello}.sql`;
      const sql = armarScript(datos, autor, ahora);

      descargar(sql, nombreArchivo);
      const totalFilas = TABLAS_RESPALDO.reduce((s, { tabla }) => s + (datos.get(tabla)?.length ?? 0), 0);
      // Deja constancia en la bitácora (si esto falla, el respaldo ya se descargó)
      const { error: errBitacora } = await supabase.rpc("fn_bitacora_respaldo", { p_filas: totalFilas });
      if (errBitacora) console.warn("No se pudo registrar el respaldo en la bitácora:", errBitacora.message);
      try { localStorage.setItem(CLAVE_ULTIMO, ahora.toISOString()); } catch { /* sin almacenamiento */ }
      setUltimoRespaldo(ahora);
      setResultado({
        nombreArchivo,
        bytes: new Blob([sql]).size,
        filas: TABLAS_RESPALDO.map(({ tabla }) => ({ tabla, filas: datos.get(tabla)?.length ?? 0 })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el respaldo.");
    } finally {
      setEjecutando(false);
      setProgreso(null);
    }
  }

  return { generar, ejecutando, progreso, resultado, error, ultimoRespaldo };
}