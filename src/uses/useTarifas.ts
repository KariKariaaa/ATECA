import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { TarifaActivo } from "../../types/inventory";

// NOTA: a propósito NO hay función "editar" en este hook.
// Las tarifas se versionan por fecha (ver Script 2 del SQL):
// modificar una tarifa vigente rompería la trazabilidad de lo
// ya cotizado/alquilado con ese precio. Para cambiar un precio,
// se crea una tarifa nueva y la anterior se cierra sola.

interface DatosTarifa {
  idcategoria: number;
  preciosemana: number;
  preciomes: number;
  preciodiaunico: number;
  preciodiaextra: number;
  fechainicio: string;
}


function traducirErrorTarifa(error: {
  code?: string;
  message: string;
}): string {
  if (error.code === "23514") {
    const mensaje = error.message;

    if (mensaje.includes("preciomes")) {
      return "El precio por mes no puede ser negativo.";
    }

    if (mensaje.includes("preciosemana")) {
      return "El precio por semana no puede ser negativo.";
    }

    if (mensaje.includes("preciodiaunico")) {
      return "El precio por día único no puede ser negativo.";
    }

    if (mensaje.includes("preciodiaextra")) {
      return "El precio por día extra no puede ser negativo.";
    }

    if (mensaje.includes("chk_tarifa_fechas")) {
      return "La fecha de fin no puede ser anterior a la fecha de inicio.";
    }

    return "Los datos de la tarifa no cumplen con las validaciones.";
  }

  return "Ocurrió un error al guardar la tarifa. Inténtalo nuevamente.";
}


export function useTarifas() {
  const [tarifas, setTarifas] = useState<TarifaActivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tbtarifaactivo")
      .select(
        `
        idtarifaactivo, idcategoria, preciosemana, preciomes,
        preciodiaunico, preciodiaextra, fechainicio, fechafin, estado,
        categoria:tbcategoria ( nombre )
        `
      )
      .order("fechainicio", { ascending: false });

    if (error) setError(error.message);
    else setTarifas((data ?? []) as unknown as TarifaActivo[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(nueva: DatosTarifa) {
    // 1. Cierra la tarifa vigente de esa categoría (si existe),
    //    poniéndole fechaFin = ayer y estado = false.
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyer = ayer.toISOString().slice(0, 10);

    const { error: closeError } = await supabase
      .from("tbtarifaactivo")
      .update({ estado: false, fechafin: fechaAyer })
      .eq("idcategoria", nueva.idcategoria)
      .is("fechafin", null);

    if (closeError) return { error: traducirErrorTarifa(closeError) };

    // 2. Inserta la nueva tarifa como vigente.
    const { error } = await supabase.from("tbtarifaactivo").insert({
      ...nueva,
      fechafin: null,
      estado: true,
    });

    if (error) return { error: traducirErrorTarifa(error) };
    await cargar();
    return { error: null };
  }

  // Devuelve true si la categoría ya tiene una tarifa vigente
  // (para mostrar el aviso de "se reemplazará" en el modal).
  function tieneVigente(idcategoria: number) {
    return tarifas.some((t) => t.idcategoria === idcategoria && t.estado);
  }

  return { tarifas, loading, error, crear, tieneVigente, recargar: cargar };
}