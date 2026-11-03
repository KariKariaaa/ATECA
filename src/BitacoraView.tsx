import { useEffect, useState } from "react";
import { useBitacora } from "./uses/useBitacora";

const MODULOS = ["Alquileres", "Cotizaciones", "Tarifas", "Usuarios", "Respaldo"];

const COLOR_MODULO: Record<string, string> = {
  Alquileres: "bg-blue-100 text-blue-700",
  Cotizaciones: "bg-purple-100 text-purple-700",
  Tarifas: "bg-amber-100 text-amber-700",
  Usuarios: "bg-slate-200 text-slate-700",
  Respaldo: "bg-emerald-100 text-emerald-700",
};

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-GT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const inputCls = "border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#102c4d]";

export default function BitacoraView() {
  const [modulo, setModulo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // Espera a que el usuario deje de escribir antes de consultar
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), 400);
    return () => clearTimeout(t);
  }, [texto]);

  const { filas, total, loading, error, hayMas, cargarMas, recargar } = useBitacora({ modulo, desde, hasta, busqueda });
  const hayFiltros = modulo || desde || hasta || texto;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Bitácora</h2>
          <p className="text-gray-400 text-sm">Registro de quién hizo qué y cuándo. Solo el Administrador puede consultarla y nadie puede modificarla.</p>
        </div>
        <button onClick={recargar} disabled={loading} className="px-3 py-2 text-xs font-semibold text-[#102c4d] border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          {loading ? "Cargando…" : "↻ Actualizar"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col lg:flex-row gap-3 lg:items-center flex-wrap">
        <select className={inputCls} value={modulo} onChange={(e) => setModulo(e.target.value)}>
          <option value="">Todos los módulos</option>
          {MODULOS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" className={inputCls} value={desde} onChange={(e) => setDesde(e.target.value)} />
          <span className="text-gray-400 text-xs">a</span>
          <input type="date" className={inputCls} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <input className={inputCls + " flex-1 min-w-[200px]"} placeholder="Buscar por usuario o detalle…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        {hayFiltros && (
          <button onClick={() => { setModulo(""); setDesde(""); setHasta(""); setTexto(""); }} className="text-xs text-red-500 font-medium">Limpiar</button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">No se pudo cargar la bitácora.</p>
          <p className="mt-1 break-words">{error}</p>
          <p className="mt-1 text-xs">Si dice que la tabla no existe, ejecuta 13-bitacora.sql en Supabase.</p>
        </div>
      )}

      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Fecha y hora", "Usuario", "Módulo", "Acción", "Detalle"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((e) => (
              <tr key={e.idbitacora} className="hover:bg-gray-50/50 align-top">
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fechaHora(e.fecha)}</td>
                <td className="px-4 py-3 text-xs font-semibold text-gray-900 whitespace-nowrap">{e.usuario}</td>
                <td className="px-4 py-3"><span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${COLOR_MODULO[e.modulo] ?? "bg-gray-100 text-gray-600"}`}>{e.modulo}</span></td>
                <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{e.accion}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{e.descripcion}</td>
              </tr>
            ))}
            {!loading && filas.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">Sin registros para los filtros seleccionados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {filas.map((e) => (
          <div key={e.idbitacora} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${COLOR_MODULO[e.modulo] ?? "bg-gray-100 text-gray-600"}`}>{e.modulo} · {e.accion}</span>
              <span className="text-[11px] text-gray-400">{fechaHora(e.fecha)}</span>
            </div>
            <p className="text-sm text-gray-800">{e.descripcion}</p>
            <p className="text-xs text-gray-400">Por {e.usuario}</p>
          </div>
        ))}
        {!loading && filas.length === 0 && <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border">Sin registros.</div>}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Mostrando {filas.length} de {total} registro(s)</span>
        {hayMas && (
          <button onClick={() => void cargarMas()} className="px-4 py-2 text-sm font-semibold text-[#102c4d] border border-gray-200 rounded-lg hover:bg-gray-50">
            Cargar más
          </button>
        )}
      </div>
    </div>
  );
}