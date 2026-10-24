export const fmtQ = (n: number | null | undefined) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

export function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function maintenanceDueIn(lastMaint: string | null) {
  if (!lastMaint) return 999;
  const TARGET_DAYS = 150; // ~5 meses
  return TARGET_DAYS - daysSince(lastMaint);
}

export function formatearFecha(fecha: string | null): string {
  if (!fecha) return "—";

  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio.slice(-2)}`;
}

export function maintBadge(dueIn: number) {
  if (dueIn <= 0)
    return { label: "¡Vencido!", cls: "bg-red-100 text-red-700 border border-red-300", dot: "bg-red-500" };
  if (dueIn <= 20)
    return { label: `${dueIn}d`, cls: "bg-red-100 text-red-700 border border-red-300", dot: "bg-red-500" };
  if (dueIn <= 45)
    return { label: `${dueIn}d`, cls: "bg-amber-100 text-amber-700 border border-amber-200", dot: "bg-amber-400" };
  return null;
}

export function urlPublicaActivo(codigoqr: string) {
  const base = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "");
  return `${base}/activo/${encodeURIComponent(codigoqr)}`;
}