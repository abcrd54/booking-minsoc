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
  slot_interval_minutes integer not null default 60,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
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

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  pitch_name text not null default 'Lapangan Utama',
  start_at timestamptz not null,
  end_at timestamptz not null,
  price integer not null check (price >= 0),
  status public.slot_status not null default 'available',
  notes text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null,
  customer_id uuid,
  team_name text not null,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  address text,
  status public.booking_status not null default 'pending',
  payment_code text,
  payment_unique_number integer,
  transfer_amount integer,
  payment_method text,
  payment_status public.payment_status not null default 'menunggu_verifikasi',
  payment_notes text,
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_settings add column if not exists maps_coordinates text not null default '-6.261493,106.781017';
alter table public.app_settings add column if not exists contact_phone text not null default '081234567890';
alter table public.app_settings add column if not exists default_price integer not null default 350000;
alter table public.app_settings add column if not exists prime_start_time text not null default '17:00';
alter table public.app_settings add column if not exists prime_end_time text not null default '22:00';
alter table public.app_settings add column if not exists prime_price integer not null default 450000;
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

alter table public.schedule_slots alter column pitch_name set default 'Lapangan Utama';

alter table public.bookings add column if not exists address text;
alter table public.bookings add column if not exists payment_code text;
alter table public.bookings add column if not exists payment_unique_number integer;
alter table public.bookings add column if not exists transfer_amount integer;
alter table public.bookings add column if not exists payment_method text;
alter table public.bookings add column if not exists payment_status public.payment_status not null default 'menunggu_verifikasi';

create unique index if not exists schedule_slots_unique_window_idx
on public.schedule_slots (pitch_name, start_at, end_at);

create unique index if not exists bookings_slot_id_unique_idx
on public.bookings (slot_id);

create unique index if not exists bookings_payment_code_unique_idx
on public.bookings (payment_code)
where payment_code is not null;

create index if not exists schedule_slots_start_at_idx on public.schedule_slots (start_at);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_payment_status_idx on public.bookings (payment_status);

alter table public.app_settings enable row level security;
alter table public.site_gallery enable row level security;
alter table public.facility_items enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "public_read_app_settings" on public.app_settings;
create policy "public_read_app_settings"
on public.app_settings
for select
to authenticated, anon
using (true);

drop policy if exists "public_read_site_gallery" on public.site_gallery;
create policy "public_read_site_gallery"
on public.site_gallery
for select
to authenticated, anon
using (true);

drop policy if exists "public_read_facility_items" on public.facility_items;
create policy "public_read_facility_items"
on public.facility_items
for select
to authenticated, anon
using (true);

drop policy if exists "public_read_schedule_slots" on public.schedule_slots;
create policy "public_read_schedule_slots"
on public.schedule_slots
for select
to authenticated, anon
using (true);

drop policy if exists "customers_create_bookings" on public.bookings;
drop policy if exists "public_create_bookings" on public.bookings;
create policy "public_create_bookings"
on public.bookings
for insert
to authenticated, anon
with check (true);

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
values
  (1, 'Kinetic Turf', '09:00', '24:00', '-6.261493,106.781017', '081234567890', 350000, '17:00', '22:00', 450000, 60)
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

delete from public.site_gallery;
insert into public.site_gallery (title, image_url, sort_order)
values
  ('Kick Off Night', 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1400&q=80', 1),
  ('Sudut Bench Pemain', 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1400&q=80', 2),
  ('Rumput dan Lampu Stadion', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1400&q=80', 3);

delete from public.facility_items;
insert into public.facility_items (title, description, image_url, sort_order, is_featured)
values
  ('Lampu Malam Intensitas Tinggi', 'Sistem LED terang merata untuk sesi malam yang kompetitif.', 'https://images.unsplash.com/photo-1486286701208-1d58e9338013?auto=format&fit=crop&w=1600&q=80', 0, true),
  ('Parkir Luas', 'Area parkir nyaman untuk mobil, motor, dan kendaraan tim.', 'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=1400&q=80', 1, false),
  ('Ruang Tunggu', 'Area tunggu santai dengan pemandangan langsung ke lapangan.', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1400&q=80', 2, false),
  ('Toilet Bersih', 'Toilet dan area bilas dirawat setiap hari.', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1400&q=80', 3, false),
  ('Mushola', 'Ruang ibadah yang tenang dan bersih untuk pengunjung.', 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1400&q=80', 4, false),
  ('Kantin Kinetic', 'Minuman, kopi, dan camilan tersedia untuk pemain dan penonton.', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1400&q=80', 5, false);

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

delete from public.schedule_slots
where pitch_name = 'Lapangan Utama'
  and status = 'available'
  and start_at >= date_trunc('day', now())
  and not exists (
    select 1
    from public.bookings
    where public.bookings.slot_id = public.schedule_slots.id
  );

delete from public.bookings
where admin_notes like 'Dummy booking seed %';

delete from public.schedule_slots
where notes like 'Dummy seed %'
and not exists (
  select 1
  from public.bookings
  where public.bookings.slot_id = public.schedule_slots.id
);

with dummy_slots as (
  select
    'Lapangan Utama'::text as pitch_name,
    (((current_date + 1)::text || ' 19:00:00+07')::timestamptz) as start_at,
    (((current_date + 1)::text || ' 20:00:00+07')::timestamptz) as end_at,
    450000::integer as price,
    'booked'::public.slot_status as status,
    'Dummy seed booking 1'::text as notes
  union all
  select
    'Lapangan Utama',
    (((current_date + 1)::text || ' 21:00:00+07')::timestamptz),
    (((current_date + 1)::text || ' 22:00:00+07')::timestamptz),
    450000,
    'booked'::public.slot_status,
    'Dummy seed booking 2'
  union all
  select
    'Lapangan Utama',
    (((current_date + 2)::text || ' 18:00:00+07')::timestamptz),
    (((current_date + 2)::text || ' 19:00:00+07')::timestamptz),
    450000,
    'booked'::public.slot_status,
    'Dummy seed booking 3'
  union all
  select
    'Lapangan Utama',
    (((current_date + 2)::text || ' 20:00:00+07')::timestamptz),
    (((current_date + 2)::text || ' 21:00:00+07')::timestamptz),
    450000,
    'booked'::public.slot_status,
    'Dummy seed booking 4'
  union all
  select
    'Lapangan Utama',
    (((current_date + 4)::text || ' 09:00:00+07')::timestamptz),
    (((current_date + 4)::text || ' 10:00:00+07')::timestamptz),
    350000,
    'booked'::public.slot_status,
    'Dummy seed booking 5'
  union all
  select
    'Lapangan Utama',
    (((current_date + 3)::text || ' 10:00:00+07')::timestamptz),
    (((current_date + 3)::text || ' 11:00:00+07')::timestamptz),
    350000,
    'blocked'::public.slot_status,
    'Dummy seed blocked 1'
  union all
  select
    'Lapangan Utama',
    (((current_date + 5)::text || ' 17:00:00+07')::timestamptz),
    (((current_date + 5)::text || ' 18:00:00+07')::timestamptz),
    450000,
    'blocked'::public.slot_status,
    'Dummy seed blocked 2'
),
upserted_slots as (
  insert into public.schedule_slots (pitch_name, start_at, end_at, price, status, notes)
  select pitch_name, start_at, end_at, price, status, notes
  from dummy_slots
  on conflict (pitch_name, start_at, end_at) do update
  set price = excluded.price,
      status = excluded.status,
      notes = excluded.notes
  returning id, notes, price
)
insert into public.bookings (
  slot_id,
  team_name,
  contact_name,
  contact_phone,
  address,
  status,
  payment_code,
  payment_unique_number,
  transfer_amount,
  payment_method,
  payment_status,
  admin_notes
)
select
  slots.id,
  seeded.team_name,
  seeded.contact_name,
  seeded.contact_phone,
  seeded.address,
  seeded.status,
  seeded.payment_code,
  seeded.payment_unique_number,
  slots.price + seeded.payment_unique_number,
  'transfer_manual',
  seeded.payment_status,
  seeded.admin_notes
from upserted_slots as slots
join (
  values
    (
      'Dummy seed booking 1'::text,
      'Senja FC'::text,
      'Raka Pratama'::text,
      '081234567801'::text,
      'Jl. Stadion Raya No. 12, Jakarta'::text,
      'confirmed'::public.booking_status,
      'KT-DEMO01'::text,
      111::integer,
      'terverifikasi'::public.payment_status,
      'Dummy booking seed 1'::text
    ),
    (
      'Dummy seed booking 2'::text,
      'Orbit United'::text,
      'Dimas Saputra'::text,
      '081234567811'::text,
      'Jl. Cendana Timur No. 18, Jakarta'::text,
      'confirmed'::public.booking_status,
      'KT-DEMO02'::text,
      125::integer,
      'terverifikasi'::public.payment_status,
      'Dummy booking seed 2'::text
    ),
    (
      'Dummy seed booking 3'::text,
      'Metro Futsal Club'::text,
      'Salsa Maharani'::text,
      '081234567812'::text,
      'Jl. Wijaya Kusuma No. 7, Jakarta'::text,
      'pending'::public.booking_status,
      'KT-DEMO03'::text,
      222::integer,
      'menunggu_verifikasi'::public.payment_status,
      'Dummy booking seed 3'::text
    ),
    (
      'Dummy seed booking 4'::text,
      'Garuda Malam'::text,
      'Nadia Putri'::text,
      '081234567802'::text,
      'Jl. Elang Selatan No. 8, Jakarta'::text,
      'confirmed'::public.booking_status,
      'KT-DEMO04'::text,
      310::integer,
      'terverifikasi'::public.payment_status,
      'Dummy booking seed 4'::text
    ),
    (
      'Dummy seed booking 5'::text,
      'Bintang Timur'::text,
      'Yoga Prasetyo'::text,
      '081234567813'::text,
      'Jl. Anggrek Barat No. 4, Jakarta'::text,
      'cancelled'::public.booking_status,
      'KT-DEMO05'::text,
      155::integer,
      'ditolak'::public.payment_status,
      'Dummy booking seed 5'::text
    )
) as seeded (
  slot_notes,
  team_name,
  contact_name,
  contact_phone,
  address,
  status,
  payment_code,
  payment_unique_number,
  payment_status,
  admin_notes
)
  on slots.notes = seeded.slot_notes
on conflict (slot_id) do update
set team_name = excluded.team_name,
    contact_name = excluded.contact_name,
    contact_phone = excluded.contact_phone,
    address = excluded.address,
    status = excluded.status,
    payment_code = excluded.payment_code,
    payment_unique_number = excluded.payment_unique_number,
    transfer_amount = excluded.transfer_amount,
    payment_method = excluded.payment_method,
    payment_status = excluded.payment_status,
    admin_notes = excluded.admin_notes;
