import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Contacto } from "../../types/inventory";

interface DatosContacto {
  idempresa: number | null;
  cargo: string | null;
  nombre: string;
  apellido: string;
  dpi: string | null;
  correo: string | null;
  telefono: string | null;
}

export function useContactos() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tbcontacto")
      .select(
        `
        idcontacto, idempresa, cargo, nombre, apellido, dpi, correo, telefono, estado,
        empresa:tbempresa ( nombre )
        `
      )
      .order("nombre", { ascending: true });

    if (error) setError(error.message);
    else setContactos((data ?? []) as unknown as Contacto[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(datos: DatosContacto) {
    const { error } = await supabase.from("tbcontacto").insert({ ...datos, estado: true });
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  async function editar(idcontacto: number, datos: DatosContacto) {
    const { error } = await supabase.from("tbcontacto").update(datos).eq("idcontacto", idcontacto);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  async function cambiarEstado(idcontacto: number, estado: boolean) {
    const { error } = await supabase.from("tbcontacto").update({ estado }).eq("idcontacto", idcontacto);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  return { contactos, loading, error, crear, editar, cambiarEstado, recargar: cargar };
}