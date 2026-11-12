-- profiles: one row per auth user, carrying the role.
-- The bank_account_* columns are the SHOP-LEVEL payout target: one shop can
-- run many barbers (M1.1), so the bank account belongs to the PERSON, not a
-- barber profile. They stay NULL until the shop fills "payout settings" in
-- M1.1; only the shop + an admin may read them. ("use test data first" —
-- manual month-end transfer, M2.2.)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,           -- the account's display name. For a SHOP this is
                               -- the SHOP NAME (required in M1.1 onboarding; shown on
                               -- the M2.2 payout page as payouts.shop_name). For a
                               -- customer, their own name. May be NULL at sign-up;
                               -- M1.1 makes it required for shops.
  role text not null default 'customer' check (role in ('customer','shop','admin')),
  bank_account_name   text,
  bank_account_number text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- a user can read/update their own profile row (this is what scopes the bank
-- fields to shop-only; admin reads them via the is_admin() path added in M1.1).
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- create the profile row on signup, copying the role from sign-up metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'role',''), 'customer')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- BACKFILL: the trigger only fires on FUTURE signups, so any users who already
-- signed up during M0 testing (Steps 2 / 8.4) have NO profiles row. Create one
-- for each, reading the role from their existing sign-up metadata.
-- NOTE the fallback here is 'shop', NOT 'customer' (the trigger's default):
-- a user old enough to predate the trigger is almost certainly YOUR own early
-- barber/shop test account created before the role tab was wired, so 'shop' is
-- the safer guess for a metadata-less row. Fix any wrong guess with a one-off
-- UPDATE migration. on conflict do nothing -> safe to re-run; never clobbers a
-- row the trigger already made.
insert into public.profiles (id, email, role)
select
  u.id,
  u.email,
  coalesce(nullif(u.raw_user_meta_data->>'role',''), 'shop')
from auth.users u
on conflict (id) do nothing;
