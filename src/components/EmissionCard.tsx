import { memo } from 'react';
import { formatCo2, formatDate } from '../lib/format';
import { CATEGORY_LABELS, type Emission } from '../types/emission';
import { CATEGORY_STYLES } from './categoryStyles';

interface EmissionCardProps {
  emission: Emission;
}

/** Tarjeta de una medición. `memo` evita re-renderizarla cuando se agregan otras mediciones. */
export const EmissionCard = memo(function EmissionCard({ emission }: EmissionCardProps) {
  const style = CATEGORY_STYLES[emission.category];
  const titleId = `emission-${emission.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className={`flex h-full flex-col gap-3 rounded-xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md ${style.accent}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id={titleId} className="font-medium leading-snug text-slate-900">
          {emission.sourceName}
        </h3>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}>
          <span aria-hidden="true">{style.icon}</span>
          {CATEGORY_LABELS[emission.category]}
        </span>
      </div>
      <p className="mt-auto text-2xl font-semibold tabular-nums text-slate-900">
        {formatCo2(emission.co2Kg)}
      </p>
      <p className="text-xs text-slate-500">
        <time dateTime={emission.createdAt}>{formatDate(emission.createdAt)}</time>
      </p>
    </article>
  );
});
