import { memo, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { validateEmission, type EmissionFormErrors, type EmissionFormValues } from '../lib/validation';
import { CATEGORIES, CATEGORY_LABELS, type NewEmission } from '../types/emission';
import { Spinner } from './Feedback';

interface EmissionFormProps {
  onSubmit: (input: NewEmission) => Promise<boolean>;
  isSubmitting: boolean;
  submitError: string | null;
  onDismissError: () => void;
}

const EMPTY: EmissionFormValues = { sourceName: '', category: '', co2Kg: '' };
const FIELD_ORDER: readonly (keyof EmissionFormValues)[] = ['sourceName', 'category', 'co2Kg'];

const inputBase =
  'mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100';
const inputOk = 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200';
const inputBad = 'border-red-400 focus:border-red-500 focus:ring-red-200';

export const EmissionForm = memo(function EmissionForm({ onSubmit, isSubmitting, submitError, onDismissError }: EmissionFormProps) {
  const [values, setValues] = useState<EmissionFormValues>(EMPTY);
  const [errors, setErrors] = useState<EmissionFormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fieldRefs = useRef<Partial<Record<keyof EmissionFormValues, HTMLInputElement | HTMLSelectElement | null>>>({});
  const id = useId();
  const fieldId = (name: keyof EmissionFormValues) => `${id}-${name}`;
  const errorId = (name: keyof EmissionFormValues) => `${id}-${name}-error`;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const name = e.target.name as keyof EmissionFormValues;
    setValues((prev) => ({ ...prev, [name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSuccessMessage(null);
    if (submitError) onDismissError();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = validateEmission(values);
    if (!result.ok) {
      setErrors(result.errors);
      const firstInvalid = FIELD_ORDER.find((f) => result.errors[f]);
      if (firstInvalid) fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    const saved = await onSubmit(result.value);
    if (saved) {
      setValues(EMPTY);
      setSuccessMessage(`Medición "${result.value.sourceName}" registrada.`);
      fieldRefs.current.sourceName?.focus();
    }
  };

  const describedBy = (name: keyof EmissionFormValues) => (errors[name] ? errorId(name) : undefined);

  return (
    <form noValidate onSubmit={handleSubmit} aria-labelledby={`${id}-title`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id={`${id}-title`} className="text-base font-semibold text-slate-900">
        Nueva medición
      </h2>
      <p className="mt-1 text-sm text-slate-500">Registra una fuente de emisión y su CO₂ producido.</p>

      <fieldset disabled={isSubmitting} className="mt-4 space-y-4">
        <div>
          <label htmlFor={fieldId('sourceName')} className="text-sm font-medium text-slate-700">
            Nombre de la fuente
          </label>
          <input
            ref={(el) => {
              fieldRefs.current.sourceName = el;
            }}
            id={fieldId('sourceName')}
            name="sourceName"
            type="text"
            autoComplete="off"
            placeholder="Ej. Flota de reparto zona norte"
            maxLength={80}
            value={values.sourceName}
            onChange={handleChange}
            aria-invalid={errors.sourceName ? true : undefined}
            aria-describedby={describedBy('sourceName')}
            className={`${inputBase} ${errors.sourceName ? inputBad : inputOk}`}
          />
          {errors.sourceName && (
            <p id={errorId('sourceName')} className="mt-1 text-xs text-red-700">
              {errors.sourceName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={fieldId('category')} className="text-sm font-medium text-slate-700">
            Categoría
          </label>
          <select
            ref={(el) => {
              fieldRefs.current.category = el;
            }}
            id={fieldId('category')}
            name="category"
            value={values.category}
            onChange={handleChange}
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={describedBy('category')}
            className={`${inputBase} ${errors.category ? inputBad : inputOk}`}
          >
            <option value="" disabled>
              Selecciona una categoría
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          {errors.category && (
            <p id={errorId('category')} className="mt-1 text-xs text-red-700">
              {errors.category}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={fieldId('co2Kg')} className="text-sm font-medium text-slate-700">
            CO₂ producido (kg)
          </label>
          <input
            ref={(el) => {
              fieldRefs.current.co2Kg = el;
            }}
            id={fieldId('co2Kg')}
            name="co2Kg"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={values.co2Kg}
            onChange={handleChange}
            aria-invalid={errors.co2Kg ? true : undefined}
            aria-describedby={describedBy('co2Kg')}
            className={`${inputBase} tabular-nums ${errors.co2Kg ? inputBad : inputOk}`}
          />
          {errors.co2Kg && (
            <p id={errorId('co2Kg')} className="mt-1 text-xs text-red-700">
              {errors.co2Kg}
            </p>
          )}
        </div>
      </fieldset>

      {submitError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {submitError}
        </div>
      )}
      <p role="status" className={successMessage ? 'mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800' : 'sr-only'}>
        {successMessage}
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Spinner className="h-4 w-4" /> Guardando…
          </>
        ) : (
          'Agregar medición'
        )}
      </button>
    </form>
  );
});
