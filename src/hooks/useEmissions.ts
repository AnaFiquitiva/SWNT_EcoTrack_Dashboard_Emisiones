import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { defaultRepository, type EmissionsRepository } from '../services/emissionsRepository';
import { CATEGORIES, type Category, type Emission, type NewEmission } from '../types/emission';

export type LoadStatus = 'loading' | 'success' | 'error';

interface State {
  emissions: Emission[];
  status: LoadStatus;
  error: string | null;
  isSubmitting: boolean;
  submitError: string | null;
}

type Action =
  | { type: 'load/start' }
  | { type: 'load/success'; emissions: Emission[] }
  | { type: 'load/failure'; error: string }
  | { type: 'create/start' }
  | { type: 'create/success'; emission: Emission }
  | { type: 'create/failure'; error: string }
  | { type: 'remote/insert'; emission: Emission }
  | { type: 'submitError/clear' };

const initialState: State = {
  emissions: [],
  status: 'loading',
  error: null,
  isSubmitting: false,
  submitError: null,
};

/** Inserta al inicio evitando duplicados (la suscripción en tiempo real también notifica nuestras inserciones). */
function prependUnique(list: Emission[], emission: Emission): Emission[] {
  return list.some((e) => e.id === emission.id) ? list : [emission, ...list];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load/start':
      return { ...state, status: 'loading', error: null };
    case 'load/success':
      return { ...state, status: 'success', emissions: action.emissions };
    case 'load/failure':
      return { ...state, status: 'error', error: action.error };
    case 'create/start':
      return { ...state, isSubmitting: true, submitError: null };
    case 'create/success':
      return { ...state, isSubmitting: false, emissions: prependUnique(state.emissions, action.emission) };
    case 'create/failure':
      return { ...state, isSubmitting: false, submitError: action.error };
    case 'remote/insert':
      return { ...state, emissions: prependUnique(state.emissions, action.emission) };
    case 'submitError/clear':
      return { ...state, submitError: null };
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export interface EmissionsTotals {
  totalKg: number;
  byCategory: Readonly<Record<Category, number>>;
  count: number;
}

export interface UseEmissionsResult {
  emissions: readonly Emission[];
  totals: EmissionsTotals;
  status: LoadStatus;
  error: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  mode: EmissionsRepository['mode'];
  /** Devuelve `true` si la medición se guardó, para que el formulario sepa si limpiarse. */
  addEmission: (input: NewEmission) => Promise<boolean>;
  reload: () => void;
  clearSubmitError: () => void;
}

/**
 * Gestiona carga, inserción, errores y actualizaciones en tiempo real de las
 * mediciones de CO2. La UI no conoce Supabase: solo consume este hook.
 */
export function useEmissions(repository: EmissionsRepository = defaultRepository): UseEmissionsResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [reloadToken, reload] = useReducer((n: number) => n + 1, 0);

  // Evita despachar acciones si el componente se desmonta con una inserción en curso.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: 'load/start' });
    repository
      .list(controller.signal)
      .then((emissions) => dispatch({ type: 'load/success', emissions }))
      .catch((err: unknown) => {
        if (!isAbort(err) && !controller.signal.aborted) dispatch({ type: 'load/failure', error: messageOf(err) });
      });
    return () => controller.abort();
  }, [repository, reloadToken]);

  useEffect(
    () => repository.subscribe((emission) => dispatch({ type: 'remote/insert', emission })),
    [repository],
  );

  const addEmission = useCallback(
    async (input: NewEmission): Promise<boolean> => {
      dispatch({ type: 'create/start' });
      try {
        const emission = await repository.create(input);
        if (mounted.current) dispatch({ type: 'create/success', emission });
        return true;
      } catch (err: unknown) {
        if (mounted.current) dispatch({ type: 'create/failure', error: messageOf(err) });
        return false;
      }
    },
    [repository],
  );

  const clearSubmitError = useCallback(() => dispatch({ type: 'submitError/clear' }), []);

  const totals = useMemo<EmissionsTotals>(() => {
    const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    let totalKg = 0;
    for (const e of state.emissions) {
      byCategory[e.category] += e.co2Kg;
      totalKg += e.co2Kg;
    }
    return { totalKg, byCategory, count: state.emissions.length };
  }, [state.emissions]);

  return {
    emissions: state.emissions,
    totals,
    status: state.status,
    error: state.error,
    isSubmitting: state.isSubmitting,
    submitError: state.submitError,
    mode: repository.mode,
    addEmission,
    reload,
    clearSubmitError,
  };
}
