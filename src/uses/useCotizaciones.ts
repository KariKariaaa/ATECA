import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Cotizacion, DetalleCotizacion } from "../../types/inventory";

interface DatosCabecera {
  idempleado: number;
  idcontacto: number;
  idestadocotizacion: number;
  fechainicio: string;
  fechafin: string;
}

interface DatosLinea {
  idtarifaactivo: number;
  cantidad: number;
  descuento: number;
  subtotal: number;
}

// NOTA sobre el diseño de este hook:
// - "total" en tbCotizacion NO se envía nunca desde aquí -- lo
//   mantiene el trigger de la base de datos a partir de las líneas
//   (igual que ya vimos con el ejemplo del trigger).
// - "editar" borra todas las líneas existentes y vuelve a insertar
//   el set completo, en vez de hacer un diff línea por línea. Es
//   más simple y para este volumen de líneas (pocas por cotización)
//   no tiene costo real. Si una cotización ya tiene un Alquiler
//   generado a partir de alguna línea, ese DELETE fallará por la
//   llave foránea de tbDetalleAlquiler -- que es exactamente el
//   comportamiento que queremos (protege la integridad), pero por
//   eso el frontend NO debe ofrecer "Editar" salvo en cotizaciones
//   con estado "cotizado".
export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [detallesPorCotizacion, setDetallesPorCotizacion] = useState<Map<number, DetalleCotizacion[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: headers, error: errHead } = await supabase
      .from("tbcotizacion")
      .select(
        `
        idcotizacion, idempleado, idcontacto, idestadocotizacion, total,
        fechacreacion, fechainicio, fechafin,
        contacto:tbcontacto ( nombre, apellido, correo, telefono, empresa:tbempresa ( nombre ) ),
        empleado:tbempleado ( nombre, apellido ),
        estado:tbestadocotizacion ( estadocotizacion )
        `
      )
      .order("fechacreacion", { ascending: false });

    if (errHead) {
      setError(errHead.message);
      setLoading(false);
      return;
    }

    const rows = (headers ?? []) as unknown as Cotizacion[];
    setCotizaciones(rows);

    if (!rows.length) {
      setDetallesPorCotizacion(new Map());
      setLoading(false);
      return;
    }

    // Trae TODAS las líneas de TODAS las cotizaciones en una sola
    // consulta (con .in), en vez de una consulta por cotización.
    const { data: detalles, error: errDet } = await supabase
      .from("tbdetallecotizacion")
      .select(
        `
        iddetallecotizacion, idcotizacion, idtarifaactivo, cantidad, descuento, subtotal,
        tarifa:tbtarifaactivo ( idcategoria, preciosemana, preciomes, preciodiaunico, preciodiaextra, categoria:tbcategoria ( nombre ) )
        `
      )
      .in("idcotizacion", rows.map((r) => r.idcotizacion));

    if (errDet) {
      setError(errDet.message);
      setLoading(false);
      return;
    }

    const mapa = new Map<number, DetalleCotizacion[]>();
    ((detalles ?? []) as unknown as DetalleCotizacion[]).forEach((d) => {
      mapa.set(d.idcotizacion, [...(mapa.get(d.idcotizacion) ?? []), d]);
    });
    setDetallesPorCotizacion(mapa);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(cabecera: DatosCabecera, lineas: DatosLinea[]) {
    if (!lineas.length) return { error: "La cotización necesita al menos una línea." };

    const { data, error } = await supabase
      .from("tbcotizacion")
      .insert(cabecera)
      .select("idcotizacion")
      .single();

    if (error || !data) return { error: error?.message ?? "No se pudo crear la cotización." };

    const filas = lineas.map((l) => ({ ...l, idcotizacion: data.idcotizacion }));
    const { error: errLineas } = await supabase.from("tbdetallecotizacion").insert(filas);

    if (errLineas) {
      // Revierte la cabecera si fallaron las líneas, para no dejar
      // una cotización "fantasma" sin ninguna línea.
      await supabase.from("tbcotizacion").delete().eq("idcotizacion", data.idcotizacion);
      return { error: errLineas.message };
    }

    await cargar();
    return { error: null, idcotizacion: data.idcotizacion as number };
  }

  async function editar(
    idcotizacion: number,
    cabecera: Omit<DatosCabecera, "idestadocotizacion">,
    lineas: DatosLinea[]
  ) {
    if (!lineas.length) return { error: "La cotización necesita al menos una línea." };

    const { error: errHead } = await supabase
      .from("tbcotizacion")
      .update(cabecera)
      .eq("idcotizacion", idcotizacion);
    if (errHead) return { error: errHead.message };

    const { error: errDel } = await supabase
      .from("tbdetallecotizacion")
      .delete()
      .eq("idcotizacion", idcotizacion);
    if (errDel) return { error: errDel.message };

    const filas = lineas.map((l) => ({ ...l, idcotizacion }));
    const { error: errIns } = await supabase.from("tbdetallecotizacion").insert(filas);
    if (errIns) return { error: errIns.message };

    await cargar();
    return { error: null };
  }

  async function cambiarEstado(idcotizacion: number, idestadocotizacion: number) {
    const { error } = await supabase
      .from("tbcotizacion")
      .update({ idestadocotizacion })
      .eq("idcotizacion", idcotizacion);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  function lineasDe(idcotizacion: number): DetalleCotizacion[] {
    return detallesPorCotizacion.get(idcotizacion) ?? [];
  }

  return { cotizaciones, loading, error, crear, editar, cambiarEstado, lineasDe, recargar: cargar };
}