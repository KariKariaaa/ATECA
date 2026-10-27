import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Mantenimiento } from "../../types/inventory";

interface DatosMantenimiento {
  idactivo: number;
  fecha: string;
  descripcion: string | null;
  costo: number;
}

function traducirErrorMantenimiento(error: {
  code?: string;
  message: string;
}): string {
  if (error.code === "23514") {
    const mensaje = error.message;

    if (mensaje.includes("tbmantenimiento_costo_check")) {
      return "El costo no puede ser negativo.";
    }

    return "Los datos del mantenimiento no cumplen con las validaciones.";
  }

  return "Ocurrió un error al guardar el mantenimiento. Inténtalo nuevamente.";
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
    if (error) return { error: traducirErrorMantenimiento(error) };
    await cargar();
    return { error: null };
  }

  
  async function eliminar(idmantenimiento: number) {
    const { error } = await supabase
      .from("tbmantenimiento")
      .delete()
      .eq("idmantenimiento", idmantenimiento);

    if (error) {
      return {
        error: "No se pudo eliminar el mantenimiento. Verifica si existen restricciones o registros relacionados.",
      };
    }

    await cargar();
    return { error: null };
  }


  return {
    mantenimientos,
    loading,
    error,
    crear,
    eliminar,
    recargar: cargar,
  };

}