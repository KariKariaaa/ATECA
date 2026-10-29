import { useAuth } from "./uses/useAuth";
import { useRespaldo } from "./uses/useRespaldo";

const formatearBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`;

export default function BackupModule() {
  const { perfil } = useAuth();
  const { generar, ejecutando, progreso, resultado, error, ultimoRespaldo } = useRespaldo();

  // Mismo criterio que el menú: el rol 2 (Operador) no accede.
  if (perfil?.idrol === 2) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Solo el Administrador puede generar respaldos.
      </div>
    );
  }

  const dias = ultimoRespaldo ? Math.floor((Date.now() - ultimoRespaldo.getTime()) / 86400000) : null;
  const totalFilas = resultado ? resultado.filas.reduce((s, f) => s + f.filas, 0) : 0;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto pb-24 md:pb-6">
      <div>
        <h2 className="text-[#102c4d] font-bold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>Respaldo de datos</h2>
        <p className="text-gray-400 text-sm">Descarga una copia de todos los datos del sistema para poder restaurarlos si algo falla.</p>
      </div>

      {/* Estado del último respaldo */}
      <div className={`rounded-xl border p-4 text-sm ${dias === null || dias > 7 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
        {ultimoRespaldo ? (
          <>
            Último respaldo desde este navegador: <strong>{ultimoRespaldo.toLocaleString("es-GT")}</strong>
            {dias !== null && dias > 7 ? ` · hace ${dias} días. Se recomienda respaldar al menos una vez por semana.` : "."}
          </>
        ) : (
          <>Aún no se ha generado ningún respaldo desde este navegador. Se recomienda respaldar al menos una vez por semana.</>
        )}
      </div>

      {/* Acción */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <button
          onClick={() => void generar(perfil?.nombreCompleto ?? "—")}
          disabled={ejecutando}
          className="px-5 py-2.5 text-sm font-bold bg-[#ffbc07] text-[#102c4d] rounded-lg hover:bg-[#e5a800] transition-colors disabled:opacity-60"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {ejecutando ? "Generando respaldo…" : "Generar y descargar respaldo"}
        </button>

        {progreso && (
          <div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#102c4d] transition-all" style={{ width: `${(progreso.actual / progreso.total) * 100}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">Leyendo {progreso.tabla} ({progreso.actual} de {progreso.total})…</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">No se pudo generar el respaldo.</p>
            <p className="mt-1 break-words">{error}</p>
          </div>
        )}

        {resultado && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-emerald-800">Respaldo generado: {resultado.nombreArchivo}</p>
            <p className="text-emerald-700 mt-0.5">{totalFilas} filas en {resultado.filas.length} tablas · {formatearBytes(resultado.bytes)}. Revisa tu carpeta de descargas.</p>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-emerald-900">
              {resultado.filas.map((f) => (
                <div key={f.tabla} className="flex justify-between gap-2"><span className="font-mono">{f.tabla}</span><strong>{f.filas}</strong></div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Qué incluye */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-[#102c4d] font-bold text-sm mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>Qué incluye</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
            <li>Los datos de las 17 tablas: activos, tarifas, clientes, cotizaciones, alquileres, daños, mantenimientos, empleados y usuarios.</li>
            <li>La lista de usuarios (nombre de usuario, rol y correo) para recrear sus cuentas.</li>
          </ul>
        </div>
      </div>

      {/* Cómo restaurar */}
      <details className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <summary className="cursor-pointer text-[#102c4d] font-bold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>Cómo restaurar un respaldo</summary>
        <ol className="mt-3 text-sm text-gray-600 space-y-1.5 list-decimal pl-5">
          <li>El archivo es un script SQL. Se ejecuta en Supabase → SQL Editor (o con <code>psql</code>); no se restaura desde esta pantalla.</li>
          <li>La base debe tener ya la estructura (scripts SQL del proyecto) y las tablas vacías. Si tienen datos, descomenta el bloque <code>TRUNCATE</code> del archivo.</li>
          <li>Ejecuta el archivo completo y compara el conteo final con la lista del encabezado.</li>
          <li>En un proyecto nuevo, recrea las cuentas de acceso desde Usuarios (la lista está en el encabezado del archivo).</li>
        </ol>
        <p className="text-xs text-gray-400 mt-3">El procedimiento completo está en el Manual Técnico.</p>
      </details>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <strong>Confidencialidad:</strong> el archivo contiene datos personales (DPI, teléfonos, correos) y los datos financieros de la empresa.
        Guárdalo en un lugar seguro, no lo envíes por correo ni lo dejes en equipos compartidos.
      </div>
    </div>
  );
}