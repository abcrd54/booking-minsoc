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

delete from public.schedule_slots
where notes like 'Dummy seed %'
  and not exists (
    select 1
    from public.bookings
    where public.bookings.slot_id = public.schedule_slots.id
  );
