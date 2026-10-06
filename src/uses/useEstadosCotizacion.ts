import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { EstadoCotizacion } from "../../types/inventory";

export function useEstadosCotizacion() {
  const [estados, setEstados] = useState<EstadoCotizacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tbestadocotizacion")
        .select("idestadocotizacion, estadocotizacion")
        .order("idestadocotizacion", { ascending: true });
      if (!error) setEstados(data ?? []);
      setLoading(false);
    })();
  }, []);

  return { estados, loading };
}