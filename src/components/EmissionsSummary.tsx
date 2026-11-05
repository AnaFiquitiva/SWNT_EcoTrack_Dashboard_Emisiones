import { memo } from 'react';
import type { EmissionsTotals, LoadStatus } from '../hooks/useEmissions';
import { formatCo2 } from '../lib/format';
import { CATEGORIES, CATEGORY_LABELS } from '../types/emission';
import { CATEGORY_STYLES } from './categoryStyles';

interface EmissionsSummaryProps {
  totals: EmissionsTotals;
  status: LoadStatus;
}

export const EmissionsSummary = memo(function EmissionsSummary({ totals, status }: EmissionsSummaryProps) {
  const noData = status !== 'success';
  return (
    <section aria-labelledby="summary-title" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <h2 id="summary-title" className="sr-only">
        Resumen de emisiones
      </h2>

      <div className="rounded-xl bg-slate-900 p-4 text-white shadow-sm">
        <p className="text-sm text-slate-300">Total registrado</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{noData ? '—' : formatCo2(totals.totalKg)}</p>
        <p className="mt-1 text-xs text-slate-400">{status === 'loading' ? 'Cargando…' : status === 'error' ? 'Sin datos disponibles' : `${totals.count} mediciones`}</p>
      </div>

      {CATEGORIES.map((c) => {
        const value = totals.byCategory[c];
        const share = totals.totalKg > 0 ? Math.round((value / totals.totalKg) * 100) : 0;
        const style = CATEGORY_STYLES[c];
        return (
          <div key={c} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <span aria-hidden="true">{style.icon}</span>
              {CATEGORY_LABELS[c]}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{noData ? '—' : formatCo2(value)}</p>
            <div
              role="meter"
              aria-label={`Participación de ${CATEGORY_LABELS[c]}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={share}
              aria-valuetext={`${share}% del total`}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
            >
              <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${share}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{noData ? ' ' : `${share}% del total`}</p>
          </div>
        );
      })}
    </section>
  );
});
