import { isCategory, type NewEmission } from '../types/emission';

export interface EmissionFormValues {
  sourceName: string;
  category: string;
  co2Kg: string;
}

export type EmissionFormErrors = Partial<Record<keyof EmissionFormValues, string>>;

export const MAX_CO2_KG = 1_000_000;

export type ValidationResult =
  | { ok: true; value: NewEmission }
  | { ok: false; errors: EmissionFormErrors };

/** Valida los valores crudos del formulario y los convierte en una `NewEmission` tipada. */
export function validateEmission(values: EmissionFormValues): ValidationResult {
  const errors: EmissionFormErrors = {};
  const sourceName = values.sourceName.trim();
  const co2Kg = Number(values.co2Kg.replace(',', '.'));

  if (sourceName.length < 2) errors.sourceName = 'Escribe el nombre de la fuente (mínimo 2 caracteres).';
  else if (sourceName.length > 80) errors.sourceName = 'El nombre no puede superar 80 caracteres.';

  if (!isCategory(values.category)) errors.category = 'Selecciona una categoría.';

  if (values.co2Kg.trim() === '' || Number.isNaN(co2Kg)) errors.co2Kg = 'Ingresa la cantidad de CO₂ en kg.';
  else if (co2Kg <= 0) errors.co2Kg = 'La cantidad debe ser mayor que 0.';
  else if (co2Kg > MAX_CO2_KG) errors.co2Kg = 'La cantidad parece demasiado alta (máx. 1.000.000 kg).';

  if (Object.keys(errors).length > 0 || !isCategory(values.category)) return { ok: false, errors };
  return { ok: true, value: { sourceName, category: values.category, co2Kg } };
}
