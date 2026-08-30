-- Finish account registration: keep the details collected at sign-up in
-- `profiles`, stop one email address from owning two sign-in methods, and close
-- the self-promotion hole in the members' own profile update policy.

-- 1. The registration wizard already collects these; until now they only ever
--    reached auth.users.raw_user_meta_data, which staff cannot query.
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists organisation text,
  add column if not exists job_title text,
  add column if not exists country text,
  add column if not exists legal_accepted_at timestamptz,
  add column if not exists legal_version text;

-- 2. Copy the registration metadata into the profile row, both when the account
--    is created and whenever the member edits their details afterwards. Google
--    supplies name and email only, so the remaining columns stay null until the
--    member completes /complete-profile.
create or replace function public.sync_profile_from_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (
    id, full_name, first_name, last_name, organisation, job_title, city, country,
    legal_accepted_at, legal_version
  )
  values (
    new.id,
    coalesce(nullif(meta ->> 'full_name', ''), nullif(meta ->> 'name', '')),
    coalesce(nullif(meta ->> 'first_name', ''), nullif(meta ->> 'given_name', '')),
    coalesce(nullif(meta ->> 'last_name', ''), nullif(meta ->> 'family_name', '')),
    nullif(meta ->> 'organisation', ''),
    nullif(meta ->> 'job_title', ''),
    nullif(meta ->> 'city', ''),
    nullif(meta ->> 'country', ''),
    (nullif(meta ->> 'legal_accepted_at', ''))::timestamptz,
    nullif(meta ->> 'legal_version', '')
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    organisation = coalesce(excluded.organisation, public.profiles.organisation),
    job_title = coalesce(excluded.job_title, public.profiles.job_title),
    city = coalesce(excluded.city, public.profiles.city),
    country = coalesce(excluded.country, public.profiles.country),
    legal_accepted_at = coalesce(excluded.legal_accepted_at, public.profiles.legal_accepted_at),
    legal_version = coalesce(excluded.legal_version, public.profiles.legal_version),
    updated_at = now();
  return new;
end;
$$;

-- Replaces handle_new_user() from 0001, which only ever wrote full_name.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.sync_profile_from_user();

-- Narrowed to the metadata column so an ordinary sign-in (which only touches
-- last_sign_in_at) does not fire it.
drop trigger if exists on_auth_user_metadata_updated on auth.users;
create trigger on_auth_user_metadata_updated
  after update of raw_user_meta_data on auth.users
  for each row execute procedure public.sync_profile_from_user();

-- 3. Backfill the accounts that registered before the columns existed.
update public.profiles p set
  first_name = coalesce(p.first_name, nullif(u.raw_user_meta_data ->> 'first_name', ''), nullif(u.raw_user_meta_data ->> 'given_name', '')),
  last_name = coalesce(p.last_name, nullif(u.raw_user_meta_data ->> 'last_name', ''), nullif(u.raw_user_meta_data ->> 'family_name', '')),
  organisation = coalesce(p.organisation, nullif(u.raw_user_meta_data ->> 'organisation', '')),
  job_title = coalesce(p.job_title, nullif(u.raw_user_meta_data ->> 'job_title', '')),
  city = coalesce(p.city, nullif(u.raw_user_meta_data ->> 'city', '')),
  country = coalesce(p.country, nullif(u.raw_user_meta_data ->> 'country', '')),
  legal_accepted_at = coalesce(p.legal_accepted_at, (nullif(u.raw_user_meta_data ->> 'legal_accepted_at', ''))::timestamptz),
  legal_version = coalesce(p.legal_version, nullif(u.raw_user_meta_data ->> 'legal_version', '')),
  full_name = coalesce(p.full_name, nullif(u.raw_user_meta_data ->> 'full_name', ''), nullif(u.raw_user_meta_data ->> 'name', '')),
  updated_at = now()
from auth.users u
where u.id = p.id;

-- 4. One email address, one sign-in method.
--
-- Supabase links identities automatically: signing in with Google using the
-- address of an existing password account silently attaches the Google identity
-- to that user, so both methods then open the same account. The site treats the
-- two as mutually exclusive, so refuse the second identity instead. The reverse
-- direction needs no trigger — auth.users.email is unique, so signUp() on an
-- address Google already owns is rejected by GoTrue itself.
-- Test a *fresh* Google address straight after applying this. GoTrue writes one
-- identity row per provider, so a new Google user is unaffected — but a version
-- that also wrote an `email` identity alongside `google` would trip this and
-- break Google registration outright. To back it out:
--   drop trigger enforce_single_sign_in_method on auth.identities;
create or replace function public.enforce_single_sign_in_method()
returns trigger language plpgsql security definer set search_path = '' as $$
declare existing text;
begin
  select i.provider into existing
  from auth.identities i
  where i.user_id = new.user_id and i.provider is distinct from new.provider
  limit 1;

  if existing is not null then
    raise exception 'sst_identity_conflict: this email address already signs in with %', existing
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_single_sign_in_method on auth.identities;
create trigger enforce_single_sign_in_method
  before insert on auth.identities
  for each row execute procedure public.enforce_single_sign_in_method();

-- 5. The 0001 update policy had no WITH CHECK, so a member holding nothing but
--    the public anon key could set profiles.role = 'owner' on their own row and
--    take the Admin workspace with it. WITH CHECK pins the row to its owner; a
--    trigger pins the role, because a policy that reads public.profiles to
--    compare against the old value recurses.
drop policy if exists "members update their profile" on public.profiles;
create policy "members update their profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  -- Deliberately SECURITY INVOKER: PostgREST runs a browser session as the
  -- `authenticated` role and the service-role key as `service_role`, so
  -- current_user is the only reliable way to tell them apart. A SECURITY
  -- DEFINER body would report the function owner for both and pin the role on
  -- the Admin workspace's own promotions.
  if current_user in ('authenticated', 'anon') then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute procedure public.protect_profile_role();
