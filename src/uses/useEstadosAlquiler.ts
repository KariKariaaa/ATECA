import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { EstadoAlquiler } from "../../types/inventory";

export function useEstadosAlquiler() {
  const [estados, setEstados] = useState<EstadoAlquiler[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tbestadoalquiler")
        .select("idestadoalquiler, estadoalquiler")
        .order("idestadoalquiler", { ascending: true });
      if (!error) setEstados(data ?? []);
      setLoading(false);
    })();
  }, []);

  return { estados, loading };
}