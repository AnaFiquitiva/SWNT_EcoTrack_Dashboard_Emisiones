const kgFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const tonFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/** Muestra kg por debajo de una tonelada y t por encima, para que las cifras sean legibles. */
export function formatCo2(kg: number): string {
  return kg >= 1000 ? `${tonFormatter.format(kg / 1000)} t CO₂` : `${kgFormatter.format(kg)} kg CO₂`;
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
