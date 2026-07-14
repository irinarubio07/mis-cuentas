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

-- Listo. Tus datos quedan aislados por usuario gracias a RLS.
