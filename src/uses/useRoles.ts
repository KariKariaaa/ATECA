import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Rol } from "../../types/inventory";

export function useRoles() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tbrol")
        .select("idrol, nombre, estado")
        .eq("estado", true)
        .order("nombre", { ascending: true });
      if (!error) setRoles(data ?? []);
      setLoading(false);
    })();
  }, []);

  return { roles, loading };
}