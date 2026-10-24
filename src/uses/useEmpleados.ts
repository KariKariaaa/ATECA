import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Empleado } from "../../types/inventory";

interface DatosEmpleado {
  nombre: string;
  apellido: string;
  telefono: string | null;
  correo: string | null;
  dpi: string | null;
}

export function useEmpleados() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tbempleado")
      .select("idempleado, nombre, apellido, telefono, correo, dpi, estado")
      .order("nombre", { ascending: true });

    if (error) setError(error.message);
    else setEmpleados(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(datos: DatosEmpleado) {
    const { error } = await supabase.from("tbempleado").insert({ ...datos, estado: true });
    if (error) return { error: traducirError(error) };
    await cargar();
    return { error: null };
  }

  async function editar(idempleado: number, datos: DatosEmpleado) {
    const { error } = await supabase.from("tbempleado").update(datos).eq("idempleado", idempleado);
    if (error) return { error: traducirError(error) };
    await cargar();
    return { error: null };
  }

  async function cambiarEstado(idempleado: number, estado: boolean) {
    const { error } = await supabase.from("tbempleado").update({ estado }).eq("idempleado", idempleado);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  return { empleados, loading, error, crear, editar, cambiarEstado, recargar: cargar };
}

function traducirError(error: { code?: string; message: string }): string {
  // Valores duplicados en campos únicos
  if (error.code === "23505") {
    if (error.message.includes("tbempleado_dpi_key")) {
      return "Este DPI ya está registrado para otro empleado.";
    }

    if (error.message.includes("tbempleado_correo_key")) {
      return "Este correo ya está registrado para otro empleado.";
    }

    return "Ya existe un registro con esos datos. Verifica la información.";
  }

  return "Ocurrió un error al guardar el empleado. Inténtalo nuevamente.";
}