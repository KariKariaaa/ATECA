import { useCallback, useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../../supabaseClient";

export interface MiPerfil {
  idusuario: number;
  usuario: string;
  idempleado: number;
  rol: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  correo: string | null;
  dpi: string | null;
}

interface DatosPersonales {
  nombre: string;
  apellido: string;
  telefono: string | null;
  dpi: string | null;
}

export function useMiPerfil() {
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError("No hay una sesión activa.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tbusuario")
      .select(
        `
        idusuario, idempleado, usuario,
        empleado:tbempleado ( nombre, apellido, telefono, correo, dpi ),
        rol:tbrol ( nombre )
        `
      )
      .eq("auth_user_id", auth.user.id)
      .single();

    if (error || !data) {
      setError(error?.message ?? "No se encontró tu perfil.");
      setLoading(false);
      return;
    }

    // Supabase tipa los joins como arrays; con FK a una fila es objeto.
    const d = data as any;
    setPerfil({
      idusuario: d.idusuario,
      usuario: d.usuario,
      idempleado: d.idempleado,
      rol: d.rol?.nombre ?? "—",
      nombre: d.empleado?.nombre ?? "",
      apellido: d.empleado?.apellido ?? "",
      telefono: d.empleado?.telefono ?? null,
      correo: d.empleado?.correo ?? null,
      dpi: d.empleado?.dpi ?? null,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Datos personales: pasa por una función SQL (security definer) que solo
  // modifica nombre, apellido, teléfono y DPI del empleado ligado a la sesión.
  async function actualizarDatos(datos: DatosPersonales) {
    const { error } = await supabase.rpc("fn_actualizar_mi_perfil", {
      p_nombre: datos.nombre,
      p_apellido: datos.apellido,
      p_telefono: datos.telefono,
      p_dpi: datos.dpi,
    });
    if (error) return { error: traducirError(error) };
    await cargar();
    return { error: null };
  }

  // Contraseña: Edge Function que verifica la actual y aplica la nueva.
  async function cambiarPassword(passActual: string, passNueva: string) {
    const { data, error } = await supabase.functions.invoke("cambiar-mi-password", {
      body: { passActual, passNueva },
    });

    if (error) {
      // En respuestas no-2xx, invoke devuelve un mensaje genérico; el texto
      // real que mandó la función viene en error.context (un Response).
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json();
          if (body?.error) return { error: String(body.error) };
        } catch { /* cae al mensaje genérico */ }
      }
      return { error: "No se pudo cambiar la contraseña. Inténtalo nuevamente." };
    }
    if (data && data.success === false) {
      return { error: data.error ?? "No se pudo cambiar la contraseña." };
    }
    return { error: null };
  }

  return { perfil, loading, error, actualizarDatos, cambiarPassword, recargar: cargar };
}

function traducirError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("tbempleado_dpi_key")) {
      return "Este DPI ya está registrado para otro empleado.";
    }
    return "Ya existe un registro con esos datos. Verifica la información.";
  }
  if (error.code === "42501") return "No tienes permiso para editar este perfil.";
  if (error.code === "22023") return "Nombre y apellido son obligatorios.";
  return "Ocurrió un error al guardar tus datos. Inténtalo nuevamente.";
}