-- =====================================================================
--  Mis Cuentas — configuración de la base de datos en Supabase
--  Pega TODO este archivo en:  Supabase → SQL Editor → New query → Run
-- =====================================================================

-- 1) Tabla de movimientos (ingresos y gastos)
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null check (type in ('income','expense')),
  amount      numeric(12,2) not null check (amount > 0),
  category    text not null,
  method      text not null default 'efectivo' check (method in ('efectivo','tarjeta')),
  date        date not null default current_date,
  note        text default '',
  created_at  timestamptz not null default now()
);

-- 2) Tabla de categorías (personalizables por usuario)
create table if not exists public.categories (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  type      text not null check (type in ('income','expense')),
  name      text not null,
  icon      text default '🏷️'
);

-- 2b) Migración para bases de datos ya existentes: añade el método de pago
--     (efectivo/tarjeta). Es idempotente: si la columna ya existe, no hace nada.
alter table public.transactions
  add column if not exists method text not null default 'efectivo'
  check (method in ('efectivo','tarjeta'));

-- 3) Índices para que las consultas vayan rápidas
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists categories_user_idx        on public.categories   (user_id);

-- 4) Seguridad a nivel de fila (RLS): cada usuario SOLO ve y toca lo suyo
alter table public.transactions enable row level security;
alter table public.categories   enable row level security;

-- Políticas para movimientos
drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions
  for all
  to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Políticas para categorías
drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all
  to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5) Ahorro / metas: cada meta guarda su objetivo (opcional) y lo ahorrado.
create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  target     numeric(12,2) check (target is null or target > 0),  -- null = sin objetivo (ir acumulando)
  saved      numeric(12,2) not null default 0 check (saved >= 0),
  icon       text default '🎯',
  created_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals (user_id, created_at);
alter table public.goals enable row level security;
drop policy if exists "own goals" on public.goals;
create policy "own goals" on public.goals
  for all
  to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Listo. Tus datos quedan aislados por usuario gracias a RLS.
