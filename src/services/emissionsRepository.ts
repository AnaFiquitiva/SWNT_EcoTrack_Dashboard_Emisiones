import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, type Database } from '../lib/supabase';
import { isCategory, type Emission, type EmissionRow, type NewEmission } from '../types/emission';

/**
 * Contrato de acceso a datos. El hook `useEmissions` depende de esta interfaz
 * y no de Supabase directamente, lo que permite probarlo y usar datos simulados.
 */
export interface EmissionsRepository {
  readonly mode: 'supabase' | 'mock';
  list(signal?: AbortSignal): Promise<Emission[]>;
  create(input: NewEmission): Promise<Emission>;
  /** Se suscribe a inserciones hechas por otros clientes. Devuelve la función para desuscribirse. */
  subscribe(onInsert: (emission: Emission) => void): () => void;
}

export class RepositoryError extends Error {
  override readonly name = 'RepositoryError';
}

function toEmission(row: EmissionRow): Emission {
  if (!isCategory(row.category)) {
    throw new RepositoryError(`Categoría desconocida recibida del servidor: "${String(row.category)}"`);
  }
  return {
    id: row.id,
    sourceName: row.source_name,
    category: row.category,
    co2Kg: Number(row.co2_kg),
    createdAt: row.created_at,
  };
}

function friendlyMessage(action: 'cargar' | 'guardar', detail: string): string {
  if (/failed to fetch|network/i.test(detail)) {
    return `No se pudo ${action} la información: revisa tu conexión a internet.`;
  }
  if (/row-level security|permission|jwt/i.test(detail)) {
    return `No tienes permisos para ${action} mediciones (políticas RLS de Supabase).`;
  }
  return `No se pudo ${action} la información. Detalle: ${detail}`;
}

const COLUMNS = 'id, source_name, category, co2_kg, created_at';

export function createSupabaseRepository(client: SupabaseClient<Database>): EmissionsRepository {
  return {
    mode: 'supabase',

    async list(signal) {
      let query = client.from('emissions').select(COLUMNS).order('created_at', { ascending: false }).limit(200);
      if (signal) query = query.abortSignal(signal);

      const { data, error } = await query;
      if (error) throw new RepositoryError(friendlyMessage('cargar', error.message));
      return data.map(toEmission);
    },

    async create(input) {
      const { data, error } = await client
        .from('emissions')
        .insert({ source_name: input.sourceName, category: input.category, co2_kg: input.co2Kg })
        .select(COLUMNS)
        .single();
      if (error) throw new RepositoryError(friendlyMessage('guardar', error.message));
      return toEmission(data);
    },

    subscribe(onInsert) {
      const channel = client
        .channel('emissions-inserts')
        .on<EmissionRow>(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'emissions' },
          (payload) => {
            try {
              onInsert(toEmission(payload.new));
            } catch {
              // Fila inválida: se ignora en lugar de romper el dashboard.
            }
          },
        )
        .subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Repositorio simulado (modo demo / pruebas)                          */
/* ------------------------------------------------------------------ */

const SEED: readonly NewEmission[] = [
  { sourceName: 'Flota de camiones de reparto', category: 'transporte', co2Kg: 1840.5 },
  { sourceName: 'Planta de producción (red eléctrica)', category: 'energia', co2Kg: 2310 },
  { sourceName: 'Relleno sanitario (orgánicos)', category: 'residuos', co2Kg: 412.75 },
  { sourceName: 'Vuelos corporativos Bogotá–Lima', category: 'transporte', co2Kg: 965.2 },
  { sourceName: 'Climatización de oficinas', category: 'energia', co2Kg: 388.4 },
  { sourceName: 'Residuos de empaque plástico', category: 'residuos', co2Kg: 127.9 },
];

export interface MockOptions {
  latencyMs?: number;
  /** Fuerza fallos para demostrar los estados de error de la UI. */
  failOn?: 'list' | 'create' | null;
  seed?: readonly NewEmission[];
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export function createMockRepository({ latencyMs = 700, failOn = null, seed = SEED }: MockOptions = {}): EmissionsRepository {
  const now = Date.now();
  let rows: Emission[] = seed.map((item, i) => ({
    ...item,
    id: `mock-${i + 1}`,
    createdAt: new Date(now - (i + 1) * 3_600_000).toISOString(),
  }));

  return {
    mode: 'mock',

    async list(signal) {
      await wait(latencyMs, signal);
      if (failOn === 'list') throw new RepositoryError('No se pudo cargar la información (error simulado).');
      return [...rows];
    },

    async create(input) {
      await wait(latencyMs);
      if (failOn === 'create') throw new RepositoryError('No se pudo guardar la medición (error simulado).');
      const created: Emission = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      rows = [created, ...rows];
      return created;
    },

    subscribe() {
      return () => undefined;
    },
  };
}

/** `?simularError=list` o `?simularError=create` en la URL activa los fallos simulados. */
function mockOptionsFromUrl(): MockOptions {
  if (typeof window === 'undefined') return {};
  const fail = new URLSearchParams(window.location.search).get('simularError');
  return { failOn: fail === 'list' || fail === 'create' ? fail : null };
}

/** Repositorio por defecto: Supabase si hay credenciales, si no, datos simulados. */
export const defaultRepository: EmissionsRepository = supabase
  ? createSupabaseRepository(supabase)
  : createMockRepository(mockOptionsFromUrl());
