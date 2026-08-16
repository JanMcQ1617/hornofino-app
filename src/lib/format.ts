import type { MenuItem } from '@/lib/menu';

/** Siempre $X.XX — sin florituras de Intl que varían por plataforma. */
export function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Precio para mostrar en la carta: "desde $8.45", "$4.95", "25 pzs $26.95…" */
export function menuPrice(item: MenuItem): string {
  if (item.ask) return 'Se pide en tienda';
  if (item.variants && item.variants.length > 0) {
    const min = Math.min(...item.variants.map((v) => v.price));
    return `desde ${money(min)}`;
  }
  if (item.price == null) return '';
  return item.from ? `desde ${money(item.price)}` : money(item.price);
}

/** "hoy 3:42 PM" / "8 ago 9:15 AM" para listas de órdenes. */
export function orderDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const time = `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
  if (sameDay) return `hoy ${time}`;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${meses[d.getMonth()]} ${time}`;
}

/** Fecha relativa es-PR pa' la actividad: "hoy", "ayer", "hace 3 días", "8 ago". */
export function relativeDate(ts: number): string {
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 86_400_000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  const d = new Date(ts);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${meses[d.getMonth()]}${year}`;
}

/** "2× Quesito Regular · 1× Latte 12 oz" (máx 3, luego "+2 más"). */
export function summarizeLines(
  lines: { qty: number; name: string }[],
  max = 3,
): string {
  const parts = lines.slice(0, max).map((l) => `${l.qty}× ${l.name}`);
  const rest = lines.length - max;
  if (rest > 0) parts.push(`+${rest} más`);
  return parts.join(' · ');
}
