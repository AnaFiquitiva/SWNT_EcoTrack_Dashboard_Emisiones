export const CATEGORIES = ['transporte', 'energia', 'residuos'] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  transporte: 'Transporte',
  energia: 'Energía',
  residuos: 'Residuos',
};

/** Medición tal como la consume la UI (camelCase). */
export interface Emission {
  readonly id: string;
  readonly sourceName: string;
  readonly category: Category;
  readonly co2Kg: number;
  readonly createdAt: string;
}

/** Datos que el usuario captura en el formulario. */
export type NewEmission = Pick<Emission, 'sourceName' | 'category' | 'co2Kg'>;

/**
 * Fila de la tabla `emissions` en Supabase (snake_case). Es `type` y no `interface`
 * porque supabase-js exige que las filas sean asignables a `Record<string, unknown>`.
 */
export type EmissionRow = {
  id: string;
  source_name: string;
  category: Category;
  co2_kg: number;
  created_at: string;
};

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}
