import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Mantenimiento } from "../../types/inventory";

interface DatosMantenimiento {
  idactivo: number;
  fecha: string;
  descripcion: string | null;
  costo: number;
}

export function useMantenimientos() {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tbmantenimiento")
      .select(
        `
        idmantenimiento, idactivo, fecha, descripcion, costo,
        activo:tbactivo ( nombre, codigoqr )
        `
      )
      .order("fecha", { ascending: false });

    if (error) setError(error.message);
    else setMantenimientos((data ?? []) as unknown as Mantenimiento[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // NOTA: a propósito no hay función "editar" -- un registro de
  // mantenimiento es un histórico (qué se hizo y cuándo), igual
  // que las Tarifas. Si algo quedó mal, se corrige registrando
  // uno nuevo, no editando el pasado.
  async function crear(datos: DatosMantenimiento) {
    const { error } = await supabase.from("tbmantenimiento").insert(datos);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  return { mantenimientos, loading, error, crear, recargar: cargar };
}