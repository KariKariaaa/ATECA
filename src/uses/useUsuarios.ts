import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Usuario } from "../../types/inventory";

interface DatosNuevoUsuario {
  idempleado: number;
  correo: string;
  pass: string;
  idrol: number;
  usuario: string;
}

interface DatosEditarUsuario {
  idrol: number;
  usuario: string;
}

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tbusuario")
      .select(
        `
        idusuario, idempleado, idrol, usuario, estado,
        empleado:tbempleado ( nombre, apellido, correo ),
        rol:tbrol ( nombre )
        `
      )
      .order("usuario", { ascending: true });

    if (error) setError(error.message);
    else setUsuarios((data ?? []) as unknown as Usuario[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Creación: pasa SIEMPRE por la Edge Function, nunca INSERT
  // directo -- es la única forma de crear también la cuenta en
  // Supabase Auth con la service_role_key.
  async function crear(datos: DatosNuevoUsuario) {
    const { data, error } = await supabase.functions.invoke("crear-usuario", {
      body: datos,
    });
    if (error) return { error: error.message };
    if (data && data.success === false) return { error: data.error ?? "No se pudo crear el usuario" };
    await cargar();
    return { error: null };
  }

  // Edición "normal" (rol, username): sí es un UPDATE directo,
  // porque no toca nada de Supabase Auth, solo tu tabla de
  // negocio -- las políticas RLS ya restringen esto a Admin.
  async function editar(idusuario: number, datos: DatosEditarUsuario) {
    const { error } = await supabase.from("tbusuario").update(datos).eq("idusuario", idusuario);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  async function cambiarEstado(idusuario: number, estado: boolean) {
    const { error } = await supabase.from("tbusuario").update({ estado }).eq("idusuario", idusuario);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  // Restablecer contraseña: también pasa por Edge Function,
  // porque cambiar la contraseña de OTRO usuario requiere el
  // Admin API (service_role), no algo que el cliente pueda hacer
  // directo aunque quien lo pida sea Administrador.
  async function restablecerPassword(idusuario: number, nuevaPass: string) {
    const { data, error } = await supabase.functions.invoke("restablecer-password", {
      body: { idusuario, nuevaPass },
    });
    if (error) return { error: error.message };
    if (data && data.success === false) return { error: data.error ?? "No se pudo restablecer la contraseña" };
    return { error: null };
  }

  return { usuarios, loading, error, crear, editar, cambiarEstado, restablecerPassword, recargar: cargar };
}