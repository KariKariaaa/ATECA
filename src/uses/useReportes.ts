import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export interface ActivoIngreso { idactivo: number; codigoqr: string | null; nombre: string; ingresos: number; alquileres: number }
export interface ActivoGasto { idactivo: number; codigoqr: string | null; nombre: string; gasto: number; cantidad: number }
export interface ClienteTop { idcontacto: number; nombre: string; empresa: string | null; alquileres: number; facturado: number }
export interface CategoriaIngreso { nombre: string; ingresos: number; alquileres: number }
export interface MesSerie { mes: string; ingresos: number; mantenimiento: number }

export interface ReporteData {
  resumen: {
    ingresos: number;
    danios: number;
    mantenimiento: number;
    alquileres: number;
    lineas_devueltas: number;
    lineas_puntuales: number;
    cotizaciones: number;
    cotizaciones_convertidas: number;
  };
  top_activos_ingresos: ActivoIngreso[];
  top_activos_mantenimiento: ActivoGasto[];
  top_contactos: ClienteTop[];
  por_categoria: CategoriaIngreso[];
  serie_mensual: MesSerie[];
}

// Llama a fn_reporte_dashboard (ver 12-reporte-dashboard.sql). Se vuelve a
// consultar cada vez que cambia el periodo; si el usuario cambia de periodo
// mientras hay una consulta en curso, se ignora la respuesta vieja.
export function useReportes(desde: string, hasta: string) {
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!desde || !hasta || desde > hasta) {
      setLoading(false);
      return;
    }
    let vigente = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc("fn_reporte_dashboard", { p_desde: desde, p_hasta: hasta });
      if (!vigente) return;
      if (error) setError(error.message);
      else setData(data as ReporteData);
      setLoading(false);
    })();
    return () => { vigente = false; };
  }, [desde, hasta, tick]);

  const recargar = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, recargar };
}