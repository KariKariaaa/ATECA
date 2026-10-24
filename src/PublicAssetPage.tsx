
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

interface ActivoPublico {
  codigoqr: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  descripcion: string | null;
  categoria: string | null;
  estado: string | null;
}

export default function PublicAssetPage({
  codigoqr,
}: {
  codigoqr: string;
}) {
  const [activo, setActivo] = useState<ActivoPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;

    async function cargarActivo() {
      setLoading(true);
      setError(false);
      setActivo(null);

      const { data, error } = await supabase
        .from("vista_activo_qr_publico")
        .select(
          "codigoqr, nombre, marca, modelo, descripcion, categoria, estado"
        )
        .eq("codigoqr", codigoqr.trim().toUpperCase())
        .maybeSingle();

      if (!vigente) return;

      if (error || !data) {
        setError(true);
      } else {
        setActivo(data as ActivoPublico);
      }

      setLoading(false);
    }

    void cargarActivo();

    return () => {
      vigente = false;
    };
  }, [codigoqr]);

  const coloresEstado: Record<string, string> = {
    Disponible: "bg-emerald-100 text-emerald-800",
    Alquilado: "bg-amber-100 text-amber-800",
    "En Mantenimiento": "bg-red-100 text-red-800",
    Inactivo: "bg-gray-100 text-gray-600",
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <header className="text-center mb-7">
          <div className="inline-flex items-center justify-center bg-[#102c4d] rounded-2xl px-5 py-3 mb-4">
            <span className="text-[#ffbc07] font-bold text-xl">
              MaquilaRent
            </span>
          </div>

          <h1 className="text-[#102c4d] font-bold text-2xl">
            Información del activo
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            Consulta el equipo identificado por su código QR.
          </p>
        </header>

        {loading && (
          <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">
            Consultando información del activo...
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center">
            <h2 className="font-bold text-red-700">
              Activo no encontrado
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              No se encontró un equipo con el código {codigoqr}.
              Verifica que el QR sea correcto.
            </p>
          </div>
        )}

        {!loading && activo && (
          <article className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
            <div className="bg-[#102c4d] px-5 py-5">
              <p className="text-[#ffbc07] font-mono font-bold text-lg">
                {activo.codigoqr}
              </p>

              <h2 className="text-white font-bold text-xl mt-1">
                {activo.nombre}
              </h2>

              <span
                className={`inline-block mt-3 rounded-full px-3 py-1 text-xs font-bold ${
                  coloresEstado[activo.estado ?? ""] ??
                  "bg-gray-100 text-gray-600"
                }`}
              >
                {activo.estado ?? "Estado no disponible"}
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Categoría</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {activo.categoria ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Marca</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {activo.marca || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Modelo</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {activo.modelo || "—"}
                  </p>
                </div>
              </div>

              {activo.descripcion && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-400 mb-1">
                    Descripción
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {activo.descripcion}
                  </p>
                </div>
              )}
            </div>
          </article>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          MaquilaRent · Consulta de activos
        </p>
      </div>
    </main>
  );
}
