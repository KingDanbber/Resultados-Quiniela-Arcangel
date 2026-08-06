-- Ejecutar en Supabase SQL Editor (una vez)

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  last_seen timestamptz default now()
);

create table if not exists public.push_state (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.push_state enable row level security;

create policy "allow_read_subs" on public.push_subscriptions for select using (true);
create policy "allow_insert_subs" on public.push_subscriptions for insert with check (true);
create policy "allow_update_subs" on public.push_subscriptions for update using (true);
create policy "allow_delete_subs" on public.push_subscriptions for delete using (true);
create policy "allow_all_state" on public.push_state for all using (true) with check (true);
