-- EcoTrack · Tabla de mediciones de emisiones
-- Ejecutar en Supabase: SQL Editor -> New query -> Run

create table if not exists public.emissions (
  id          uuid primary key default gen_random_uuid(),
  source_name text not null check (char_length(source_name) between 2 and 80),
  category    text not null check (category in ('transporte', 'energia', 'residuos')),
  co2_kg      numeric(12, 2) not null check (co2_kg > 0 and co2_kg <= 1000000),
  created_at  timestamptz not null default now()
);

create index if not exists emissions_created_at_idx on public.emissions (created_at desc);

-- Row Level Security: lectura e inserción públicas con la anon key (laboratorio).
-- En producción se restringiría por empresa/usuario autenticado.
alter table public.emissions enable row level security;

drop policy if exists "emissions_select_anon" on public.emissions;
create policy "emissions_select_anon" on public.emissions
  for select to anon, authenticated using (true);

drop policy if exists "emissions_insert_anon" on public.emissions;
create policy "emissions_insert_anon" on public.emissions
  for insert to anon, authenticated with check (true);

-- Habilitar Realtime para que el dashboard reciba inserciones en vivo.
alter publication supabase_realtime add table public.emissions;

-- Datos de ejemplo
insert into public.emissions (source_name, category, co2_kg) values
  ('Flota de camiones de reparto', 'transporte', 1840.50),
  ('Planta de producción (red eléctrica)', 'energia', 2310.00),
  ('Relleno sanitario (orgánicos)', 'residuos', 412.75),
  ('Vuelos corporativos Bogotá–Lima', 'transporte', 965.20),
  ('Climatización de oficinas', 'energia', 388.40),
  ('Residuos de empaque plástico', 'residuos', 127.90);
