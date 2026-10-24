import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Categoria } from "../../types/inventory";

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tbcategoria")
      .select("idcategoria, nombre, estado")
      .order("nombre", { ascending: true });

    if (error) setError(error.message);
    else setCategorias(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(nombre: string) {
    const { error } = await supabase.from("tbcategoria").insert({ nombre, estado: true });
    if (error) return { error: traducirError(error) };
    await cargar();
    return { error: null };
  }

  async function editar(idcategoria: number, nombre: string) {
    const { error } = await supabase
      .from("tbcategoria")
      .update({ nombre })
      .eq("idcategoria", idcategoria);
    if (error) return { error: traducirError(error) };
    await cargar();
    return { error: null };
  }

  async function cambiarEstado(idcategoria: number, estado: boolean) {
    const { error } = await supabase
      .from("tbcategoria")
      .update({ estado })
      .eq("idcategoria", idcategoria);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  return { categorias, loading, error, crear, editar, cambiarEstado, recargar: cargar };
}

function traducirError(error: { code?: string; message: string }): string {
  // Valores duplicados en campos únicos
  if (error.code === "23505") {
    if (error.message.includes("tbcategoria_nombre_key")) {
      return "Esta categoría ya está registrada.";
    }

    return "Ya existe un registro con esos datos. Verifica la información.";
  }

  return "Ocurrió un error al guardar la categoría. Inténtalo nuevamente.";
}