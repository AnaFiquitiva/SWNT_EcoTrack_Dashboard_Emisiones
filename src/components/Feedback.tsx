interface SpinnerProps {
  className?: string;
}

export function Spinner({ className = 'h-5 w-5' }: SpinnerProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function CardSkeletons({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} aria-hidden="true" className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex justify-between gap-3">
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-4 w-16 rounded-full bg-slate-200" />
          </div>
          <div className="mt-6 h-7 w-1/2 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-1/3 rounded bg-slate-100" />
        </li>
      ))}
    </>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-medium text-red-900">No pudimos cargar las mediciones</p>
      <p className="mt-1 text-sm text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        Reintentar
      </button>
    </div>
  );
}

export function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p aria-hidden="true" className="text-3xl">🌍</p>
      <p className="mt-2 font-medium text-slate-800">
        {filtered ? 'No hay mediciones en esta categoría' : 'Aún no hay mediciones'}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {filtered ? 'Prueba con otro filtro o registra una nueva medición.' : 'Registra la primera usando el formulario.'}
      </p>
    </div>
  );
}
