import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEmissions } from '../hooks/useEmissions';
import { validateEmission } from '../lib/validation';
import { createMockRepository } from '../services/emissionsRepository';

const seed = [
  { sourceName: 'Camiones', category: 'transporte', co2Kg: 100 },
  { sourceName: 'Red eléctrica', category: 'energia', co2Kg: 50 },
] as const;

describe('useEmissions', () => {
  it('pasa de loading a success y calcula totales', async () => {
    const repo = createMockRepository({ latencyMs: 5, seed });
    const { result } = renderHook(() => useEmissions(repo));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.totals.totalKg).toBe(150);
    expect(result.current.totals.byCategory.transporte).toBe(100);
  });

  it('expone el error de carga y permite reintentar', async () => {
    const repo = createMockRepository({ latencyMs: 5, seed, failOn: 'list' });
    const { result } = renderHook(() => useEmissions(repo));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toMatch(/no se pudo cargar/i);

    act(() => result.current.reload());
    expect(result.current.status).toBe('loading');
  });

  it('agrega una medición al inicio de la lista', async () => {
    const repo = createMockRepository({ latencyMs: 5, seed });
    const { result } = renderHook(() => useEmissions(repo));
    await waitFor(() => expect(result.current.status).toBe('success'));

    let ok = false;
    await act(async () => {
      ok = await result.current.addEmission({ sourceName: 'Compost', category: 'residuos', co2Kg: 25 });
    });

    expect(ok).toBe(true);
    expect(result.current.emissions[0]?.sourceName).toBe('Compost');
    expect(result.current.totals.totalKg).toBe(175);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('reporta submitError cuando la inserción falla', async () => {
    const repo = createMockRepository({ latencyMs: 5, seed, failOn: 'create' });
    const { result } = renderHook(() => useEmissions(repo));
    await waitFor(() => expect(result.current.status).toBe('success'));

    await act(async () => {
      await result.current.addEmission({ sourceName: 'Compost', category: 'residuos', co2Kg: 25 });
    });

    expect(result.current.submitError).toMatch(/no se pudo guardar/i);
    expect(result.current.emissions).toHaveLength(2);
  });
});

describe('validateEmission', () => {
  it('rechaza valores vacíos o inválidos', () => {
    const r = validateEmission({ sourceName: ' ', category: '', co2Kg: '-3' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['category', 'co2Kg', 'sourceName']);
  });

  it('normaliza coma decimal y recorta el nombre', () => {
    const r = validateEmission({ sourceName: '  Caldera  ', category: 'energia', co2Kg: '12,5' });
    expect(r).toEqual({ ok: true, value: { sourceName: 'Caldera', category: 'energia', co2Kg: 12.5 } });
  });
});
