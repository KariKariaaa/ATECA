import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Empresa } from "../../types/inventory";

interface DatosEmpresa {
  nombre: string;
  direccion: string | null;
  nit: string | null;
  telefono: string | null;
  correo: string | null;
}

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tbempresa")
      .select("idempresa, nombre, direccion, nit, telefono, correo, estado")
      .order("nombre", { ascending: true });

    if (error) setError(error.message);
    else setEmpresas(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(datos: DatosEmpresa) {
    const { error } = await supabase.from("tbempresa").insert({ ...datos, estado: true });
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  async function editar(idempresa: number, datos: DatosEmpresa) {
    const { error } = await supabase.from("tbempresa").update(datos).eq("idempresa", idempresa);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  async function cambiarEstado(idempresa: number, estado: boolean) {
    const { error } = await supabase.from("tbempresa").update({ estado }).eq("idempresa", idempresa);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  return { empresas, loading, error, crear, editar, cambiarEstado, recargar: cargar };
}