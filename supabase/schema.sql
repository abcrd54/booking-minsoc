create extension if not exists "pgcrypto";

drop table if exists public.gallery cascade;
drop table if exists public.facilities cascade;
drop table if exists public.venue_settings cascade;
drop table if exists public.booking_requests cascade;
drop table if exists public.schedule_templates cascade;
drop table if exists public.pitches cascade;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'customer');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'slot_status') then
    create type public.slot_status as enum ('available', 'booked', 'blocked');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.slot_status'::regtype
      and enumlabel = 'pending'
  ) then
    alter type public.slot_status add value 'pending' before 'booked';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'rescheduled');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('menunggu_verifikasi', 'terverifikasi', 'ditolak', 'kedaluwarsa');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_settings (
  id integer primary key default 1,
  venue_name text not null default 'Kinetic Turf',
  open_time text not null default '09:00',
  close_time text not null default '24:00',
  maps_coordinates text not null default '-6.261493,106.781017',
  contact_phone text not null default '081234567890',
  default_price integer not null default 350000,
  prime_start_time text not null default '17:00',
  prime_end_time text not null default '22:00',
  prime_price integer not null default 450000,
  slot_interval_minutes integer not null default 60 check (slot_interval_minutes in (30, 60, 90, 120)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint single_settings_row check (id = 1)
);

create table if not exists public.site_gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.facility_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  image_url text not null,
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  pitch_name text not null default 'Lapangan Utama',
  start_at timestamptz not null,
  end_at timestamptz not null,
  price integer not null check (price >= 0),
  status public.slot_status not null default 'available',
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint valid_slot_range check (end_at > start_at)
);

create unique index if not exists schedule_slots_unique_window_idx
on public.schedule_slots (pitch_name, start_at, end_at);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.schedule_slots (id) on delete cascade,
  customer_id uuid references public.profiles (id) on delete set null,
  team_name text not null,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  address text,
  status public.booking_status not null default 'pending',
  payment_code text unique,
  payment_unique_number integer,
  transfer_amount integer,
  payment_method text,
  payment_status public.payment_status not null default 'menunggu_verifikasi',
  payment_notes text,
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (slot_id)
);

alter table public.app_settings add column if not exists maps_coordinates text not null default '-6.261493,106.781017';
alter table public.app_settings add column if not exists contact_phone text not null default '081234567890';
alter table public.app_settings add column if not exists default_price integer not null default 350000;
alter table public.app_settings add column if not exists prime_start_time text not null default '17:00';
alter table public.app_settings add column if not exists prime_end_time text not null default '22:00';
alter table public.app_settings add column if not exists prime_price integer not null default 450000;
alter table public.app_settings add column if not exists site_logo_url text;
alter table public.app_settings add column if not exists favicon_url text;
alter table public.app_settings add column if not exists seo_title text;
alter table public.app_settings add column if not exists seo_description text;
alter table public.app_settings add column if not exists seo_keywords text;
alter table public.app_settings add column if not exists google_analytics_id text;
alter table public.app_settings alter column venue_name set default 'Kinetic Turf';
alter table public.app_settings alter column open_time set default '09:00';
alter table public.app_settings alter column close_time set default '24:00';
alter table public.app_settings alter column maps_coordinates set default '-6.261493,106.781017';
alter table public.app_settings alter column contact_phone set default '081234567890';
alter table public.app_settings alter column default_price set default 350000;
alter table public.app_settings alter column prime_start_time set default '17:00';
alter table public.app_settings alter column prime_end_time set default '22:00';
alter table public.app_settings alter column prime_price set default 450000;
alter table public.app_settings alter column slot_interval_minutes set default 60;

alter table public.bookings add column if not exists address text;
alter table public.bookings add column if not exists payment_code text;
alter table public.bookings add column if not exists payment_unique_number integer;
alter table public.bookings add column if not exists transfer_amount integer;
alter table public.bookings add column if not exists payment_method text;
alter table public.bookings add column if not exists payment_status public.payment_status not null default 'menunggu_verifikasi';
alter table public.bookings add column if not exists payment_token text;
alter table public.bookings add column if not exists payment_redirect_url text;
alter table public.schedule_slots alter column pitch_name set default 'Lapangan Utama';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_timestamp on public.profiles;
create trigger set_profiles_timestamp
before update on public.profiles
for each row execute procedure public.set_timestamp();

drop trigger if exists set_app_settings_timestamp on public.app_settings;
create trigger set_app_settings_timestamp
before update on public.app_settings
for each row execute procedure public.set_timestamp();

drop trigger if exists set_schedule_slots_timestamp on public.schedule_slots;
create trigger set_schedule_slots_timestamp
before update on public.schedule_slots
for each row execute procedure public.set_timestamp();

drop trigger if exists set_bookings_timestamp on public.bookings;
create trigger set_bookings_timestamp
before update on public.bookings
for each row execute procedure public.set_timestamp();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.site_gallery enable row level security;
alter table public.facility_items enable row level security;
alter table public.faq_items enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "public_read_app_settings" on public.app_settings;
create policy "public_read_app_settings"
on public.app_settings
for select
to authenticated, anon
using (true);

drop policy if exists "admin_manage_app_settings" on public.app_settings;
create policy "admin_manage_app_settings"
on public.app_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public_read_site_gallery" on public.site_gallery;
create policy "public_read_site_gallery"
on public.site_gallery
for select
to authenticated, anon
using (true);

drop policy if exists "admin_manage_site_gallery" on public.site_gallery;
create policy "admin_manage_site_gallery"
on public.site_gallery
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public_read_facility_items" on public.facility_items;
create policy "public_read_facility_items"
on public.facility_items
for select
to authenticated, anon
using (true);

drop policy if exists "admin_manage_facility_items" on public.facility_items;
create policy "admin_manage_facility_items"
on public.facility_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public_read_faq_items" on public.faq_items;
create policy "public_read_faq_items"
on public.faq_items
for select
to authenticated, anon
using (true);

drop policy if exists "admin_manage_faq_items" on public.faq_items;
create policy "admin_manage_faq_items"
on public.faq_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_manage_schedule_slots" on public.schedule_slots;
create policy "admin_manage_schedule_slots"
on public.schedule_slots
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public_read_schedule_slots" on public.schedule_slots;
create policy "public_read_schedule_slots"
on public.schedule_slots
for select
to authenticated, anon
using (true);

drop policy if exists "admin_manage_bookings" on public.bookings;
create policy "admin_manage_bookings"
on public.bookings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customers_create_bookings" on public.bookings;
drop policy if exists "public_create_bookings" on public.bookings;
create policy "public_create_bookings"
on public.bookings
for insert
to authenticated, anon
with check (true);

drop policy if exists "customers_read_own_bookings" on public.bookings;
create policy "customers_read_own_bookings"
on public.bookings
for select
to authenticated
using (customer_id = auth.uid() or public.is_admin());

create index if not exists schedule_slots_start_at_idx on public.schedule_slots (start_at);
create index if not exists bookings_status_idx on public.bookings (status);
create unique index if not exists bookings_slot_id_unique_idx on public.bookings (slot_id);
create unique index if not exists bookings_payment_code_unique_idx on public.bookings (payment_code) where payment_code is not null;
create index if not exists bookings_payment_status_idx on public.bookings (payment_status);

insert into public.app_settings (
  id,
  venue_name,
  open_time,
  close_time,
  maps_coordinates,
  contact_phone,
  default_price,
  prime_start_time,
  prime_end_time,
  prime_price,
  slot_interval_minutes
)
values (1, 'Kinetic Turf', '09:00', '24:00', '-6.261493,106.781017', '081234567890', 350000, '17:00', '22:00', 450000, 60)
on conflict (id) do update
set venue_name = excluded.venue_name,
    open_time = excluded.open_time,
    close_time = excluded.close_time,
    maps_coordinates = excluded.maps_coordinates,
    contact_phone = excluded.contact_phone,
    default_price = excluded.default_price,
    prime_start_time = excluded.prime_start_time,
    prime_end_time = excluded.prime_end_time,
    prime_price = excluded.prime_price,
    slot_interval_minutes = excluded.slot_interval_minutes;

insert into public.site_gallery (title, image_url, sort_order)
values
  ('Pertandingan Malam', 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80', 1),
  ('Area Bench Pemain', 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80', 2),
  ('Nuansa Stadion', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80', 3)
on conflict do nothing;

insert into public.facility_items (title, description, image_url, sort_order, is_featured)
values
  ('Parkir Luas', 'Area parkir aman untuk lebih dari 50 kendaraan dan bus tim.', 'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=1200&q=80', 1, false),
  ('Ruang Tunggu', 'Ruang tunggu ber-AC dengan jendela langsung ke lapangan.', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80', 2, false),
  ('Toilet Bersih', 'Toilet dan shower higienis yang siap dipakai setiap hari.', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80', 3, false),
  ('Mushola', 'Ruang ibadah nyaman untuk seluruh pengunjung.', 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80', 4, false),
  ('Kantin Kinetic', 'Isi energi dengan makanan ringan, minuman, dan kopi.', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80', 5, false),
  ('Lampu Malam Intensitas Tinggi', 'Sistem LED kelas stadion yang meminimalkan bayangan untuk performa maksimal.', 'https://images.unsplash.com/photo-1486286701208-1d58e9338013?auto=format&fit=crop&w=1600&q=80', 0, true)
on conflict do nothing;

insert into public.faq_items (question, answer, sort_order)
values
  ('Apakah bisa reschedule jadwal?', 'Bisa. Admin akan memindahkan booking ke slot kosong setelah pembayaran diverifikasi.', 1),
  ('Kapan status slot menjadi booked?', 'Status slot menjadi booked setelah admin menekan Konfirmasi dan pembayaran customer terverifikasi.', 2),
  ('Apakah admin bisa menutup slot tertentu?', 'Bisa. Admin dapat menutup slot manual dari dashboard jadwal booking.', 3)
on conflict do nothing;

with ranked_duplicates as (
  select
    id,
    row_number() over (
      partition by pitch_name, start_at, end_at
      order by created_at asc, id asc
    ) as row_num
  from public.schedule_slots
)
delete from public.schedule_slots
where id in (
  select id
  from ranked_duplicates
  where row_num > 1
);

update public.schedule_slots as slots
set status = case
  when bookings.status = 'confirmed' and bookings.payment_status = 'terverifikasi' then 'booked'::public.slot_status
  when bookings.status = 'pending' then 'pending'::public.slot_status
  when bookings.status = 'cancelled' then 'available'::public.slot_status
  else slots.status
end,
notes = case
  when bookings.status = 'confirmed' and bookings.payment_status = 'terverifikasi' then 'Booking terkonfirmasi'
  when bookings.status = 'pending' then 'Menunggu verifikasi admin'
  when bookings.status = 'cancelled' then null
  else slots.notes
end
from public.bookings
where bookings.slot_id = slots.id;

delete from public.schedule_slots
where status = 'available'
  and not exists (
    select 1
    from public.bookings
    where public.bookings.slot_id = public.schedule_slots.id
  );

delete from public.schedule_slots
where status in ('booked', 'pending')
  and not exists (
    select 1
    from public.bookings
    where public.bookings.slot_id = public.schedule_slots.id
  );

delete from public.bookings
where admin_notes like 'Dummy booking seed %';

delete from public.bookings
where payment_code like 'KT-DEMO%';

delete from public.schedule_slots
where notes like 'Dummy seed %'
  and not exists (
    select 1
    from public.bookings
    where public.bookings.slot_id = public.schedule_slots.id
  );

comment on table public.profiles is 'Application profile mapped 1:1 with auth.users.';
comment on table public.app_settings is 'Single-row venue configuration used by booking calendar and admin.';
comment on table public.site_gallery is 'Editable gallery images shown on the public landing page.';
comment on table public.facility_items is 'Editable facility cards with images shown on the public landing page.';
comment on table public.faq_items is 'Editable frequently asked questions shown on the public landing page.';
comment on table public.schedule_slots is 'Admin-managed booking schedule for each pitch.';
comment on table public.bookings is 'Customer or admin-created bookings tied to a single schedule slot.';
