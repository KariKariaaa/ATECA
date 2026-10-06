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
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  async function editar(idempleado: number, datos: DatosEmpleado) {
    const { error } = await supabase.from("tbempleado").update(datos).eq("idempleado", idempleado);
    if (error) return { error: error.message };
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