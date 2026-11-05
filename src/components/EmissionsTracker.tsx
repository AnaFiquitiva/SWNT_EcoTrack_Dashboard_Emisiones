import { useMemo, useState } from 'react';
import { useEmissions } from '../hooks/useEmissions';
import type { EmissionsRepository } from '../services/emissionsRepository';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../types/emission';
import { EmissionCard } from './EmissionCard';
import { EmissionForm } from './EmissionForm';
import { EmissionsSummary } from './EmissionsSummary';
import { CardSkeletons, EmptyState, ErrorState, Spinner } from './Feedback';

type Filter = Category | 'todas';

interface EmissionsTrackerProps {
  /** Permite inyectar otro repositorio (pruebas, storybook). Por defecto usa Supabase o el modo demo. */
  repository?: EmissionsRepository;
}

/**
 * Dashboard de Emisiones en Tiempo Real. Componente de presentación: toda la
 * lógica de datos vive en `useEmissions`.
 */
export function EmissionsTracker({ repository }: EmissionsTrackerProps) {
  const { emissions, totals, status, error, isSubmitting, submitError, mode, addEmission, reload, clearSubmitError } =
    useEmissions(repository);
  const [filter, setFilter] = useState<Filter>('todas');

  const visible = useMemo(
    () => (filter === 'todas' ? emissions : emissions.filter((e) => e.category === filter)),
    [emissions, filter],
  );

  const isLoading = status === 'loading';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Dashboard de Emisiones</h1>
          <p className="mt-1 text-sm text-slate-500">Mediciones de CO₂ por fuente, actualizadas en tiempo real.</p>
        </div>
        <ConnectionBadge mode={mode} />
      </div>

      <EmissionsSummary totals={totals} status={status} />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="list-title" className="order-2 lg:order-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="list-title" className="flex items-center gap-2 text-base font-semibold text-slate-900">
              Fuentes de emisión
              {isLoading && <Spinner className="h-4 w-4 text-emerald-600" />}
            </h2>
            <div role="group" aria-label="Filtrar por categoría" className="flex flex-wrap gap-1.5">
              {(['todas', ...CATEGORIES] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                    filter === f
                      ? 'bg-emerald-600 text-white ring-emerald-600'
                      : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {f === 'todas' ? 'Todas' : CATEGORY_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          <p aria-live="polite" className="sr-only">
            {isLoading ? 'Cargando mediciones…' : status === 'success' ? `${visible.length} mediciones mostradas` : ''}
          </p>

          {status === 'error' && error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : !isLoading && visible.length === 0 ? (
            <EmptyState filtered={filter !== 'todas'} />
          ) : (
            <ul aria-busy={isLoading} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading ? (
                <CardSkeletons />
              ) : (
                visible.map((e) => (
                  <li key={e.id}>
                    <EmissionCard emission={e} />
                  </li>
                ))
              )}
            </ul>
          )}
        </section>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
          <EmissionForm
            onSubmit={addEmission}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onDismissError={clearSubmitError}
          />
        </aside>
      </div>
    </div>
  );
}

function ConnectionBadge({ mode }: { mode: EmissionsRepository['mode'] }) {
  const live = mode === 'supabase';
  return (
    <span
      className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
        live ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'
      }`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} />
      {live ? 'Conectado a Supabase · en vivo' : 'Modo demo · datos simulados'}
    </span>
  );
}
