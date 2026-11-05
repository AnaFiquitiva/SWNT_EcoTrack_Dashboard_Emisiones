# Bitácora de Prompts — Ciclo Spec-to-Code

**Proyecto:** EcoTrack · Dashboard de Emisiones en Tiempo Real
**Stack:** React 18 + TypeScript (estricto) + Vite 6 + Tailwind CSS 4 + Supabase
**Entregables de código:** `src/components/EmissionsTracker.tsx`, `src/hooks/useEmissions.ts`, `src/lib/supabase.ts`, `supabase/schema.sql`

Esta bitácora registra los 4 prompts clave del ciclo, qué entregó la IA en cada uno, qué problemas
encontré al revisar la salida y cómo el siguiente prompt los corrigió. No usé el primer código tal cual:
cada iteración se ejecutó (`tsc`, `vitest`, `vite build`, capturas en el navegador) y los fallos
alimentaron el prompt siguiente.

---

## Iteración 0 — Especificación de partida

Antes de pedir código, convertí el enunciado en una especificación verificable:

| Requisito | Criterio de aceptación |
|---|---|
| Visualización | Lista de *cards* con nombre de la fuente, categoría (Transporte / Energía / Residuos) y CO₂ |
| Interactividad | Formulario para agregar mediciones con validación |
| Estado | Custom hook `useEmissions` con carga, inserción y errores vía Supabase |
| Diseño | Tailwind, responsive (móvil → escritorio), feedback de carga y error |
| Calidad | TypeScript estricto, accesible, sin re-renders innecesarios |

---

## Prompt 1 — Estructura (arquitectura de componentes)

> Actúa como arquitecto frontend senior. Tengo una tabla `emissions` en Supabase con columnas
> `id (uuid)`, `source_name (text)`, `category (text: transporte|energia|residuos)`, `co2_kg (numeric)`,
> `created_at (timestamptz)`. Necesito un "Dashboard de Emisiones en Tiempo Real" en React + Vite +
> TypeScript + Tailwind con: (1) un listado de cards (nombre, categoría, CO₂), (2) un formulario para
> agregar mediciones, (3) un custom hook `useEmissions` que encapsule toda la comunicación con Supabase.
> **No escribas todavía la implementación**: propón el árbol de carpetas, la responsabilidad de cada
> componente, los tipos de dominio y el flujo de datos. Justifica dónde vive cada pieza de estado.

### Qué entregó la IA

```
src/
  components/EmissionsTracker.tsx   ← contenedor
  components/EmissionCard.tsx
  components/EmissionForm.tsx
  hooks/useEmissions.ts
  lib/supabase.ts
  types/emission.ts
```

```ts
// v1 — tipos propuestos
export interface Emission {
  id: string;
  source_name: string;
  category: string;
  co2_kg: number;
  created_at: string;
}
```

### Evaluación y problemas detectados

- ✅ Separación UI / lógica correcta: el contenedor consume el hook y las cards solo reciben props.
- ❌ `category: string` → acepta cualquier texto; el compilador no protege las 3 categorías.
- ❌ Los tipos de la UI usan `snake_case` de la base de datos: la UI queda acoplada al esquema de Supabase.
- ❌ El hook importaría `supabase` directamente → imposible probarlo o usar datos simulados sin red.

**Decisión:** acepté el árbol de carpetas pero pedí en el siguiente prompt una capa de repositorio y tipos de dominio.

---

## Prompt 2 — Lógica (custom hook `useEmissions`)

> Implementa `useEmissions` en TypeScript. Requisitos:
> 1. Estados explícitos `loading | success | error` para la carga inicial y, por separado,
>    `isSubmitting` + `submitError` para la inserción (un error al guardar **no** debe ocultar la lista).
> 2. El hook **no** debe importar Supabase: recibe un `EmissionsRepository` (interfaz con
>    `list`, `create`, `subscribe`) con valor por defecto. Crea dos implementaciones: Supabase y un mock
>    en memoria con latencia simulada, para el modo demo y las pruebas.
> 3. Mapea `snake_case` (fila) → `camelCase` (dominio) en el repositorio, no en la UI.
> 4. Cancela la petición si el componente se desmonta (AbortController) y no actualices estado tras desmontar.
> 5. Suscríbete a inserciones con Supabase Realtime y evita duplicados con la inserción propia.
> 6. `addEmission` debe devolver `Promise<boolean>` para que el formulario sepa si limpiarse.
> 7. Expón `reload()` para el botón "Reintentar".

### Qué entregó la IA (primer intento)

```ts
// v2a — primer intento: varios useState sueltos
const [emissions, setEmissions] = useState<Emission[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  supabase.from('emissions').select('*').then(({ data, error }) => {
    if (error) setError(error.message);
    else setEmissions(data);
    setLoading(false);
  });
}, []);
```

### Problemas detectados al revisar

- ❌ Seguía importando `supabase` directamente (ignoró el punto 2).
- ❌ `loading` + `error` como booleanos independientes permiten estados imposibles (`loading=true` y `error≠null`).
- ❌ Sin cancelación: en `StrictMode` el efecto corre dos veces y puede escribir estado de una petición obsoleta.
- ❌ `error.message` crudo de Postgres ("new row violates row-level security policy…") llega al usuario.

### Re-prompt de corrección

> El hook sigue importando Supabase y usa booleanos independientes. Reescríbelo con `useReducer` y
> una unión discriminada de acciones (`load/start`, `load/success`, `load/failure`, `create/*`,
> `remote/insert`) para que los estados imposibles no se puedan representar. Inyecta el repositorio.
> Traduce los errores de Supabase a mensajes en español entendibles (red, RLS, genérico).

### Resultado (v2b — versión que quedó en el proyecto)

```ts
type Action =
  | { type: 'load/start' }
  | { type: 'load/success'; emissions: Emission[] }
  | { type: 'load/failure'; error: string }
  | { type: 'create/start' }
  | { type: 'create/success'; emission: Emission }
  | { type: 'create/failure'; error: string }
  | { type: 'remote/insert'; emission: Emission }
  | { type: 'submitError/clear' };

export function useEmissions(repository: EmissionsRepository = defaultRepository) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [reloadToken, reload] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: 'load/start' });
    repository.list(controller.signal)
      .then((emissions) => dispatch({ type: 'load/success', emissions }))
      .catch((err) => { if (!isAbort(err) && !controller.signal.aborted)
        dispatch({ type: 'load/failure', error: messageOf(err) }); });
    return () => controller.abort();
  }, [repository, reloadToken]);
  // …subscribe a Realtime con deduplicación por id (prependUnique)
}
```

Y en el repositorio de Supabase, los mensajes amigables:

```ts
function friendlyMessage(action: 'cargar' | 'guardar', detail: string): string {
  if (/failed to fetch|network/i.test(detail)) return `No se pudo ${action} la información: revisa tu conexión a internet.`;
  if (/row-level security|permission|jwt/i.test(detail)) return `No tienes permisos para ${action} mediciones (políticas RLS de Supabase).`;
  return `No se pudo ${action} la información. Detalle: ${detail}`;
}
```

---

## Prompt 3 — Refinamiento (TypeScript estricto, accesibilidad y rendimiento)

> Refina el código con estas restricciones:
> - **TypeScript estricto**: activa `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
>   `category` debe ser una unión literal derivada de un arreglo `as const`. Tipa el cliente de Supabase con
>   un tipo `Database` para que `insert()` valide columnas. Prohibido `any`.
> - **Accesibilidad (WCAG AA)**: `label` asociado a cada campo, `aria-invalid` + `aria-describedby` en
>   errores, foco al primer campo inválido, `role="alert"` para errores, región `aria-live` que anuncie
>   cargas, `aria-busy` en la lista, filtros con `aria-pressed`, respeto a `prefers-reduced-motion`.
> - **Re-renders**: `useMemo` para totales por categoría y para la lista filtrada; `React.memo` en
>   `EmissionCard`, `EmissionForm` y el resumen; `useCallback` en las funciones que expone el hook.
> - **Validación** en una función pura testeable (acepta coma decimal, rango 0 < kg ≤ 1.000.000).

### Qué cambió

```ts
// v3 — tipos de dominio estrictos
export const CATEGORIES = ['transporte', 'energia', 'residuos'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Emission {            // camelCase en la UI
  readonly id: string;
  readonly sourceName: string;
  readonly category: Category;         // ya no es string libre
  readonly co2Kg: number;
  readonly createdAt: string;
}
export type NewEmission = Pick<Emission, 'sourceName' | 'category' | 'co2Kg'>;
```

```ts
// v3 — totales memoizados dentro del hook
const totals = useMemo<EmissionsTotals>(() => {
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  let totalKg = 0;
  for (const e of state.emissions) { byCategory[e.category] += e.co2Kg; totalKg += e.co2Kg; }
  return { totalKg, byCategory, count: state.emissions.length };
}, [state.emissions]);
```

```tsx
// v3 — card memoizada: agregar una medición no re-renderiza las demás
export const EmissionCard = memo(function EmissionCard({ emission }: EmissionCardProps) { … });
```

### Error real encontrado al compilar

Al activar el tipado `Database`, `tsc` falló:

```
src/services/emissionsRepository.ts(62,19): error TS2353: Object literal may only specify
known properties, and 'source_name' does not exist in type 'never[]'.
```

**Diagnóstico:** la IA declaró la fila como `interface EmissionRow`. supabase-js exige que `Row` sea
asignable a `Record<string, unknown>`, y en TypeScript las *interfaces* no tienen firma de índice
implícita (los *type alias* sí). Por eso el esquema entero colapsaba a `never`.

**Re-prompt:**
> `insert()` infiere `never[]`. El error es TS2353 sobre `source_name`. Explica por qué y corrígelo
> sin usar `as any`.

**Corrección aplicada:**

```ts
// Es `type` y no `interface` porque supabase-js exige que las filas
// sean asignables a `Record<string, unknown>`.
export type EmissionRow = { id: string; source_name: string; category: Category; co2_kg: number; created_at: string };
```

---

## Prompt 4 — UI, feedback y verificación

> Diseña la UI con Tailwind para un dashboard profesional: tarjetas KPI (total + una por categoría con
> barra de participación), grid de cards responsive (1 → 2 → 3 columnas), formulario fijo a la derecha
> en escritorio y arriba en móvil. Estados visuales obligatorios: *skeletons* durante la carga, estado
> vacío, estado de error con botón **Reintentar**, spinner en el botón mientras guarda, mensaje de éxito.
> Indica si la app está conectada a Supabase o en modo demo. Escribe pruebas con Vitest +
> Testing Library para el hook (carga, error + reintento, inserción, fallo de inserción) y la validación.

### Hallazgo al revisar las capturas

Con `?simularError=list`, las tarjetas KPI mostraban **"0 kg CO₂ · 0 mediciones"**. Es engañoso:
el usuario podría creer que la empresa no emite nada cuando en realidad la carga falló.

**Re-prompt:**
> Cuando la carga falla, el resumen muestra 0 kg. Un cero falso es peor que no mostrar dato. Haz que el
> resumen reciba el `status` y muestre "—" y "Sin datos disponibles" cuando no sea `success`.

**Corrección:** `EmissionsSummary` pasó de recibir `isLoading: boolean` a `status: LoadStatus`.

### Verificación final

| Comprobación | Resultado |
|---|---|
| `tsc -b` (modo estricto) | ✅ sin errores |
| `vitest run` | ✅ 6/6 pruebas |
| `vite build` | ✅ 160 kB JS (52 kB gzip) |
| Capturas escritorio, carga, error, móvil | ✅ `docs/capturas/` |

---

## Resumen de la evolución

| Aspecto | v1 (Estructura) | v2 (Lógica) | v3 (Refinamiento) | v4 (UI) |
|---|---|---|---|---|
| Tipos | `category: string`, snake_case | igual | unión literal, camelCase, `readonly` | — |
| Acceso a datos | Supabase en el hook | Repositorio inyectable + mock | Cliente tipado con `Database` | — |
| Estado | — | `useState` sueltos → `useReducer` | `useMemo` / `useCallback` / `memo` | `status` en el resumen |
| Errores | — | mensajes crudos → mensajes en español | — | Reintentar, alertas, sin "0" falso |
| Accesibilidad | — | — | labels, aria-*, foco, live region | — |
| Tiempo real | — | Realtime + deduplicación | — | badge "en vivo" / "demo" |

**Lección principal:** la IA acierta rápido en la estructura, pero en los detalles que distinguen
código profesional (estados imposibles, cancelación, tipado de Supabase, datos engañosos en la UI)
solo llegó a la solución correcta cuando el prompt incluía el error concreto o la restricción explícita.
