-- GridAlert auth + company + locations schema
-- Run this in Supabase SQL editor (schema: gridalert)

-- Companies
create table if not exists gridalert.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User profiles (linked to Supabase auth.users)
create table if not exists gridalert.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  mobile text,
  company_id uuid references gridalert.companies (id) on delete set null,
  role text not null default 'member' check (role in ('admin', 'manager', 'member')),
  notify_outage_types text[] not null default '{unplanned,planned,future}',
  notify_providers text[] not null default '{Ausgrid,Endeavour,Energex,Ergon,"SA Power"}',
  notify_channels text[] not null default '{email}',
  region_access text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Company contacts (link table in case multiple contacts per company)
create table if not exists gridalert.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references gridalert.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

-- Locations associated to companies
create table if not exists gridalert.locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references gridalert.companies (id) on delete cascade,
  poi_name text,
  street_address text,
  city text,
  state text,
  postcode text,
  country text default 'Australia',
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Timestamps trigger (optional; requires pg extension)
-- create extension if not exists moddatetime schema public;
-- create trigger handle_updated_at before update on gridalert.companies for each row execute procedure moddatetime(updated_at);
-- create trigger handle_updated_at before update on gridalert.user_profiles for each row execute procedure moddatetime(updated_at);
-- create trigger handle_updated_at before update on gridalert.company_contacts for each row execute procedure moddatetime(updated_at);
-- create trigger handle_updated_at before update on gridalert.locations for each row execute procedure moddatetime(updated_at);

alter table gridalert.companies enable row level security;
alter table gridalert.user_profiles enable row level security;
alter table gridalert.company_contacts enable row level security;
alter table gridalert.locations enable row level security;

-- Basic RLS policies (adjust as needed)
-- Drop existing policies to allow repeated runs
drop policy if exists user_profiles_select_self on gridalert.user_profiles;
drop policy if exists user_profiles_select_company on gridalert.user_profiles;
drop policy if exists user_profiles_update_self on gridalert.user_profiles;
drop policy if exists user_profiles_admin_update on gridalert.user_profiles;
drop policy if exists companies_select_all on gridalert.companies;
drop policy if exists locations_select_all on gridalert.locations;
drop policy if exists user_profiles_insert_self on gridalert.user_profiles;
drop policy if exists user_profiles_admin_insert on gridalert.user_profiles;
drop policy if exists company_contacts_insert_self on gridalert.company_contacts;

-- Helper functions to avoid recursive policy evaluation
drop function if exists gridalert.same_company(uuid, uuid);
create function gridalert.same_company(p_user_id uuid, p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public, gridalert
as $$
  select exists (
    select 1
    from gridalert.user_profiles up
    where up.user_id = p_user_id
      and up.company_id = p_company_id
  );
$$;

drop function if exists gridalert.is_company_admin(uuid, uuid);
create function gridalert.is_company_admin(p_user_id uuid, p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public, gridalert
as $$
  select exists (
    select 1
    from gridalert.user_profiles up
    where up.user_id = p_user_id
      and up.company_id = p_company_id
      and up.role = 'admin'
  );
$$;

grant execute on function gridalert.same_company(uuid, uuid) to anon, authenticated, service_role;
grant execute on function gridalert.is_company_admin(uuid, uuid) to anon, authenticated, service_role;

-- Allow users to select their own profile
create policy user_profiles_select_self on gridalert.user_profiles
  for select using (auth.uid() = user_id);

-- Allow users to select others in the same company (for admin/company views)
create policy user_profiles_select_company on gridalert.user_profiles
  for select using (
    gridalert.same_company(auth.uid(), user_profiles.company_id)
  );

create policy user_profiles_update_self on gridalert.user_profiles
  for update using (auth.uid() = user_id);

-- Allow company admins to update/insert profiles for their company
create policy user_profiles_admin_update on gridalert.user_profiles
  for update using (
    gridalert.is_company_admin(auth.uid(), user_profiles.company_id)
  );

-- Allow reading companies/locations; tighten if needed
create policy companies_select_all on gridalert.companies for select using (true);
create policy locations_select_all on gridalert.locations for select using (true);

-- Allow inserting profile for self
create policy user_profiles_insert_self on gridalert.user_profiles
  for insert with check (auth.uid() = user_id);

create policy user_profiles_admin_insert on gridalert.user_profiles
  for insert with check (
    gridalert.is_company_admin(auth.uid(), company_id)
  );

-- Allow inserting company_contacts for own user_id
create policy company_contacts_insert_self on gridalert.company_contacts
  for insert with check (auth.uid() = user_id);

-- NOTE: For production, refine RLS to scope companies/locations to a user's company.

