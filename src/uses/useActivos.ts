import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Activo, EstadoActivo } from "../../types/inventory";

// ------------------------------------------------------------
// Catálogo de Estados de Activo (solo lectura para este hook;
// su gestión de alta/edición va en el módulo de Configuración)
// ------------------------------------------------------------
export function useEstadosActivo() {
  const [estados, setEstados] = useState<EstadoActivo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tbestadoactivo")
        .select("idestadoactivo, nombre, estado")
        .eq("estado", true)
        .order("idestadoactivo", { ascending: true });
      if (!error) setEstados(data ?? []);
      setLoading(false);
    })();
  }, []);

  return { estados, loading };
}

// ------------------------------------------------------------
// Activos
// ------------------------------------------------------------
interface DatosActivo {
  idcategoria: number;
  idestadoactivo: number;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  descripcion?: string | null;
  fechacompra?: string | null;
  codigoqr?: string | null;
}

export function useActivos() {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tbactivo")
      .select(
        `
        idactivo, idcategoria, idestadoactivo, nombre, marca, modelo,
        descripcion, fechacompra, codigoqr,
        categoria:tbcategoria ( nombre ),
        estadoActivo:tbestadoactivo ( nombre )
        `
      )
      .order("nombre", { ascending: true });

    if (error) setError(error.message);
    else setActivos((data ?? []) as unknown as Activo[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async (datos: DatosActivo) => {
    const codigoqr = generarCodigoQR();

    const { error } = await supabase
      .from("tbactivo")
      .insert({
        idcategoria: datos.idcategoria,
        idestadoactivo: datos.idestadoactivo,
        nombre: datos.nombre,
        marca: datos.marca,
        modelo: datos.modelo,
        descripcion: datos.descripcion,
        fechacompra: datos.fechacompra,
        codigoqr,
      });

    return {
      error: error?.message ?? null,
    };
  };

  async function editar(idactivo: number, cambios: Partial<DatosActivo>) {
    const { error } = await supabase.from("tbactivo").update(cambios).eq("idactivo", idactivo);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  // Cambia solo el estado del activo (Disponible / En Mantenimiento
  // / Inactivo, etc.) -- esta es la forma de "desactivar" un activo.
  async function cambiarEstadoActivo(idactivo: number, idestadoactivo: number) {
    const { error } = await supabase
      .from("tbactivo")
      .update({ idestadoactivo })
      .eq("idactivo", idactivo);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  return { activos, loading, error, crear, editar, cambiarEstadoActivo, recargar: cargar };
}

function generarCodigoQR(): string {
  const identificador = crypto.randomUUID()
    .replace(/-/g, "")
    .substring(0, 8)
    .toUpperCase();

  return `MR-${identificador}`;
}