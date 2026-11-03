import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";

export interface EntradaBitacora {
  idbitacora: number;
  fecha: string;
  idusuario: number | null;
  usuario: string;
  modulo: string;
  accion: string;
  idregistro: number | null;
  descripcion: string;
}

export interface FiltrosBitacora {
  modulo: string;
  desde: string;     // yyyy-mm-dd (hora local)
  hasta: string;     // yyyy-mm-dd (hora local)
  busqueda: string;  // busca en la descripción y en el usuario
}

const PAGINA = 50;

export function useBitacora(f: FiltrosBitacora) {
  const [filas, setFilas] = useState<EntradaBitacora[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const cargandoMas = useRef(false);

  const armarConsulta = useCallback(
    (desdeFila: number) => {
      let q = supabase
        .from("tbbitacora")
        .select("*", { count: "exact" })
        .order("fecha", { ascending: false })
        .order("idbitacora", { ascending: false })
        .range(desdeFila, desdeFila + PAGINA - 1);
      if (f.modulo) q = q.eq("modulo", f.modulo);
      if (f.desde) q = q.gte("fecha", new Date(`${f.desde}T00:00:00`).toISOString());
      if (f.hasta) q = q.lte("fecha", new Date(`${f.hasta}T23:59:59.999`).toISOString());
      const texto = f.busqueda.trim().replace(/[,%()]/g, " ");
      if (texto) q = q.or(`descripcion.ilike.%${texto}%,usuario.ilike.%${texto}%`);
      return q;
    },
    [f.modulo, f.desde, f.hasta, f.busqueda]
  );

  // Primera página: se repite cada vez que cambia un filtro
  useEffect(() => {
    let vigente = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error, count } = await armarConsulta(0);
      if (!vigente) return;
      if (error) setError(error.message);
      else {
        setFilas((data ?? []) as EntradaBitacora[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    })();
    return () => { vigente = false; };
  }, [armarConsulta, tick]);

  const cargarMas = useCallback(async () => {
    if (cargandoMas.current) return;
    cargandoMas.current = true;
    const { data, error } = await armarConsulta(filas.length);
    if (error) setError(error.message);
    else setFilas((prev) => [...prev, ...((data ?? []) as EntradaBitacora[])]);
    cargandoMas.current = false;
  }, [armarConsulta, filas.length]);

  const recargar = useCallback(() => setTick((t) => t + 1), []);

  return { filas, total, loading, error, hayMas: filas.length < total, cargarMas, recargar };
}