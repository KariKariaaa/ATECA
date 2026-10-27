import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Alquiler, DetalleAlquiler } from "../../types/inventory";

interface DatosCabecera {
  idempleado: number;
  idcontacto: number;
  idcotizacion: number | null;
  idestadoalquiler: number;
  fechainicio: string;
  fechafinestimada: string;
  totalestimado: number;
}

interface DatosLinea {
  idactivo: number;
  idtarifaactivo: number;
  iddetallecotizacion: number | null;
  descuento: number;
  subtotal: number;
}

// NOTA: "totalreal" y el estado (iniciado/parcial/completado) los mantienen
// triggers de la base de datos. La cancelación (cambiarEstado a 'cancelado')
// también dispara un trigger que libera los activos y, si aplica, devuelve la
// cotización a 'cotizado' (ver 11-cancelar-alquiler.sql).
//
// CAMBIOS en esta versión:
//  - El contacto trae dpi, correo y los datos de su empresa (para el contrato).
//  - Cada línea trae sus daños (tbregistrodanio) para mostrarlos junto al subtotal.
export function useAlquileres() {
  const [alquileres, setAlquileres] = useState<Alquiler[]>([]);
  const [detallesPorAlquiler, setDetallesPorAlquiler] = useState<Map<number, DetalleAlquiler[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: headers, error: errHead } = await supabase
      .from("tbalquiler")
      .select(
        `
        idalquiler, idempleado, idcontacto, idcotizacion, idestadoalquiler,
        fechainicio, fechafinestimada, fechafinreal, totalestimado, totalreal,
        contacto:tbcontacto ( nombre, apellido, dpi, telefono, correo, empresa:tbempresa ( nombre, nit, direccion ) ),
        empleado:tbempleado ( nombre, apellido ),
        estado:tbestadoalquiler ( estadoalquiler )
        `
      )
      .order("fechainicio", { ascending: false });

    if (errHead) {
      setError(errHead.message);
      setLoading(false);
      return;
    }

    const rows = (headers ?? []) as unknown as Alquiler[];
    setAlquileres(rows);

    if (!rows.length) {
      setDetallesPorAlquiler(new Map());
      setLoading(false);
      return;
    }

    const { data: detalles, error: errDet } = await supabase
      .from("tbdetallealquiler")
      .select(
        `
        iddetallealquiler, idalquiler, idactivo, idtarifaactivo, iddetallecotizacion,
        fechadevolucion, descuento, subtotal, estadodevuelto,
        activo:tbactivo ( nombre, codigoqr, categoria:tbcategoria ( nombre ) ),
        tarifa:tbtarifaactivo ( idcategoria, preciosemana, preciomes, preciodiaunico, preciodiaextra ),
        danios:tbregistrodanio ( idregistrodanio, descripcion, costo )
        `
      )
      .in("idalquiler", rows.map((r) => r.idalquiler));

    if (errDet) {
      setError(errDet.message);
      setLoading(false);
      return;
    }

    const mapa = new Map<number, DetalleAlquiler[]>();
    ((detalles ?? []) as unknown as DetalleAlquiler[]).forEach((d) => {
      mapa.set(d.idalquiler, [...(mapa.get(d.idalquiler) ?? []), d]);
    });
    setDetallesPorAlquiler(mapa);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(cabecera: DatosCabecera, lineas: DatosLinea[]) {
    if (!lineas.length) return { error: "Asigna al menos un activo al alquiler." };

    const { data, error } = await supabase
      .from("tbalquiler")
      .insert(cabecera)
      .select("idalquiler")
      .single();

    if (error || !data) return { error: error?.message ?? "No se pudo crear el alquiler." };

    const filas = lineas.map((l) => ({ ...l, idalquiler: data.idalquiler }));
    const { error: errLineas } = await supabase.from("tbdetallealquiler").insert(filas);

    if (errLineas) {
      await supabase.from("tbalquiler").delete().eq("idalquiler", data.idalquiler);
      return { error: errLineas.message };
    }

    await cargar();
    return { error: null, idalquiler: data.idalquiler as number };
  }

  async function registrarDevolucion(
    iddetallealquiler: number,
    fecha: string,
    bien: boolean,
    nuevoSubtotal: number,
    danio?: { descripcion: string; costo: number }
  ) {
    const { error } = await supabase
      .from("tbdetallealquiler")
      .update({ fechadevolucion: fecha, estadodevuelto: bien, subtotal: nuevoSubtotal })
      .eq("iddetallealquiler", iddetallealquiler);
    if (error) return { error: error.message };

    if (!bien && danio) {
      const { error: errDanio } = await supabase
        .from("tbregistrodanio")
        .insert({ iddetallealquiler, descripcion: danio.descripcion, costo: danio.costo });
      if (errDanio) return { error: errDanio.message };
    }

    await cargar();
    return { error: null };
  }

  async function cambiarEstado(idalquiler: number, idestadoalquiler: number) {
    const { error } = await supabase
      .from("tbalquiler")
      .update({ idestadoalquiler })
      .eq("idalquiler", idalquiler);
    if (error) return { error: error.message };
    await cargar();
    return { error: null };
  }

  function lineasDe(idalquiler: number): DetalleAlquiler[] {
    return detallesPorAlquiler.get(idalquiler) ?? [];
  }

  return { alquileres, loading, error, crear, registrarDevolucion, cambiarEstado, lineasDe, recargar: cargar };
}