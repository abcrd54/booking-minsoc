import Link from "next/link";
import {
  CalendarClock,
  CircleDollarSign,
  Clock3,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  fallbackFacilityItems,
  fallbackGalleryItems,
  fallbackSettings,
} from "@/lib/booking-data";
import { cn } from "@/lib/utils";

import {
  createScheduleAction,
  updateSettingsAction,
  upsertFacilityItemAction,
  upsertGalleryItemAction,
} from "./actions";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

const slotOptions = [
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
  "18:00 - 19:00",
  "19:00 - 20:00",
  "20:00 - 21:00",
  "21:00 - 22:00",
  "22:00 - 23:00",
  "23:00 - 00:00",
];

type AdminPageProps = {
  searchParams: Promise<{
    error?: string;
    section?: string;
    success?: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default async function SiteDashboard({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const sectionOptions = ["ringkasan", "setelan", "jadwal", "galeri", "fasilitas", "booking"] as const;
  const activeSection = sectionOptions.includes((params.section ?? "ringkasan") as (typeof sectionOptions)[number])
    ? (params.section ?? "ringkasan")
    : "ringkasan";

  if (!hasSupabaseEnv) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-pitch-950 px-6 py-16 text-foreground">
        <Card className="surface-glow w-full max-w-xl border border-mist-700/20 bg-pitch-900">
          <CardContent className="space-y-4 p-8">
            <h1 className="font-headline text-3xl font-black uppercase text-lime-300">Supabase belum diset</h1>
            <p className="leading-7 text-mist-300">
              Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di `.env.local`, lalu
              jalankan SQL di [supabase/schema.sql](/E:/Project/MINSOC/supabase/schema.sql:1).
            </p>
            <Link href="/login" className={cn(buttonVariants())}>
              Buka Login Admin
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { supabase, profile } = await requireAdmin();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    settingsResult,
    { count: bookingsToday = 0 },
    { count: activeMembers = 0 },
    bookingsResult,
    slotsResult,
    galleryResult,
    facilitiesResult,
  ] = await Promise.all([
    supabase
      .from("app_settings")
      .select("id, venue_name, open_time, close_time, maps_coordinates, contact_phone, default_price, prime_start_time, prime_end_time, prime_price, slot_interval_minutes")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
    supabase
      .from("bookings")
      .select("id, team_name, contact_name, contact_phone, address, status, payment_status, schedule_slots(pitch_name, start_at, end_at)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("schedule_slots")
      .select("id, pitch_name, start_at, end_at, status, price")
      .order("start_at", { ascending: true })
      .limit(8),
    supabase.from("site_gallery").select("id, title, image_url, sort_order").order("sort_order", { ascending: true }),
    supabase
      .from("facility_items")
      .select("id, title, description, image_url, sort_order, is_featured")
      .order("sort_order", { ascending: true }),
  ]);

  const settings = settingsResult.data ?? {
    id: 1,
    venue_name: fallbackSettings.venueName,
    open_time: fallbackSettings.openTime,
    close_time: fallbackSettings.closeTime,
    maps_coordinates: fallbackSettings.mapsCoordinates,
    contact_phone: fallbackSettings.contactPhone,
    default_price: fallbackSettings.defaultPrice,
    prime_start_time: fallbackSettings.primeStartTime,
    prime_end_time: fallbackSettings.primeEndTime,
    prime_price: fallbackSettings.primePrice,
    slot_interval_minutes: fallbackSettings.slotIntervalMinutes,
  };
  const bookings = bookingsResult.data ?? [];
  const slots =
    (slotsResult.data ?? []).filter(
      (slot, index, collection) =>
        collection.findIndex(
          (candidate) =>
            candidate.start_at === slot.start_at &&
            candidate.end_at === slot.end_at &&
            candidate.price === slot.price &&
            candidate.status === slot.status,
        ) === index,
    );
  const galleryItems =
    galleryResult.data ?? [];
  const facilityItems =
    facilitiesResult.data ?? [];

  const estimatedRevenue = slots
    .filter((slot) => slot.status === "booked")
    .reduce((sum, slot) => sum + slot.price, 0);

  const statCards = [
    {
      label: "Booking Hari Ini",
      value: String(bookingsToday),
      detail: "Booking masuk pada hari berjalan",
      icon: CalendarClock,
    },
    {
      label: "Revenue Terbooking",
      value: `IDR ${estimatedRevenue.toLocaleString("id-ID")}`,
      detail: "Akumulasi slot dengan status booked",
      icon: CircleDollarSign,
    },
    {
      label: "Member Aktif",
      value: String(activeMembers),
      detail: "User customer yang terdaftar",
      icon: UserRound,
    },
    {
      label: "Admin Aktif",
      value: profile.full_name || "Admin",
      detail: "Role admin tervalidasi",
      icon: ShieldCheck,
    },
  ];

  const navItems = [
    { id: "ringkasan", label: "Ringkasan" },
    { id: "setelan", label: "Setelan Situs" },
    { id: "jadwal", label: "Jadwal Booking" },
    { id: "galeri", label: "Galeri" },
    { id: "fasilitas", label: "Fasilitas" },
    { id: "booking", label: "Booking Masuk" },
  ];

  return (
    <main className="min-h-screen bg-pitch-950 text-foreground">
      <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
        <aside className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900 p-6 lg:fixed lg:left-8 lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[280px]">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-headline text-2xl font-black italic text-lime-300">
                {settings.venue_name.toUpperCase()}
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.3em] text-mist-300">Panel Admin</div>
            </div>
            <LayoutDashboard className="h-6 w-6 text-lime-300" />
          </div>

          <div className="mt-8 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={`/admin?section=${item.id}`}
                className={cn(
                  "block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.22em] transition",
                  activeSection === item.id
                    ? "bg-lime-300/12 text-lime-300"
                    : "text-mist-300 hover:bg-pitch-800 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-lime-300/15 bg-[linear-gradient(160deg,rgba(197,254,0,0.18),rgba(14,14,14,0.2))] p-5">
            <div className="text-xs uppercase tracking-[0.3em] text-lime-100/80">Masuk Sebagai</div>
            <div className="mt-3 break-all font-headline text-lg font-black uppercase text-lime-100 sm:text-2xl">
              {profile.full_name || "Admin"}
            </div>
            <div className="mt-3 text-sm leading-7 text-mist-100">
              Venue aktif dari {settings.open_time} sampai {settings.close_time}. Nomor publik: {settings.contact_phone}
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <Link href="/" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
              Kembali ke Landing
            </Link>
            <form action={logoutAction}>
              <button type="submit" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </form>
          </div>
        </aside>

        <section className="space-y-6 lg:ml-[304px]">
          <header className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900 p-6">
            <div className="text-sm uppercase tracking-[0.35em] text-lime-300">Dashboard Operasional</div>
            <h1 className="mt-3 font-headline text-4xl font-black uppercase tracking-crushed md:text-5xl">
              Setelan Situs
            </h1>
            <p className="mt-4 max-w-2xl text-mist-300">
              Kelola identitas venue, koordinat maps, nomor yang bisa dihubungi, galeri, fasilitas, dan jadwal booking
              dalam satu panel.
            </p>
          </header>

          {params.error ? (
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {decodeURIComponent(params.error)}
            </div>
          ) : null}
          {params.success ? (
            <div className="rounded-xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
              {decodeURIComponent(params.success)}
            </div>
          ) : null}

          {activeSection === "ringkasan" ? (
          <section id="ringkasan" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <Card
                  key={card.label}
                  className={cn(
                    "surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900",
                    index === 1 && "float-slow",
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-sm uppercase tracking-[0.24em] text-mist-300">{card.label}</div>
                      <Icon className="h-5 w-5 shrink-0 text-lime-300" />
                    </div>
                    <div className="mt-6 break-words text-4xl font-black text-lime-100">{card.value}</div>
                    <div className="mt-3 text-sm text-mist-300">{card.detail}</div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
          ) : null}

          {activeSection === "setelan" ? (
          <section id="setelan">
            <Card className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <MapPinned className="h-5 w-5 text-lime-300" />
                  <div className="font-headline text-2xl font-black uppercase">Setelan Situs</div>
                </div>
                <form action={updateSettingsAction} className="grid gap-4 lg:grid-cols-2">
                  <input
                    name="venue_name"
                    required
                    defaultValue={settings.venue_name}
                    placeholder="Nama venue"
                    className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  />
                  <input
                    name="contact_phone"
                    required
                    defaultValue={settings.contact_phone}
                    placeholder="Nomor yang bisa dihubungi"
                    className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  />
                  <input
                    name="default_price"
                    type="number"
                    min="0"
                    required
                    defaultValue={settings.default_price}
                    placeholder="Harga default"
                    className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  />
                  <input
                    name="prime_price"
                    type="number"
                    min="0"
                    required
                    defaultValue={settings.prime_price}
                    placeholder="Harga prime"
                    className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  />
                  <input
                    name="maps_coordinates"
                    required
                    defaultValue={settings.maps_coordinates}
                    placeholder="-6.261493,106.781017"
                    className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40 lg:col-span-2"
                  />
                  <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                    <input
                      name="open_time"
                      type="time"
                      required
                      defaultValue={settings.open_time}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                    <input
                      name="close_time"
                      type="time"
                      required
                      defaultValue={settings.close_time === "24:00" ? "23:59" : settings.close_time}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                    <input
                      name="prime_start_time"
                      type="time"
                      required
                      defaultValue={settings.prime_start_time}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                    <input
                      name="prime_end_time"
                      type="time"
                      required
                      defaultValue={settings.prime_end_time}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </div>
                  <input
                    name="slot_interval_minutes"
                    type="number"
                    min="30"
                    step="30"
                    required
                    defaultValue={settings.slot_interval_minutes}
                    className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40 lg:col-span-2"
                  />
                  <button type="submit" className={cn(buttonVariants(), "lg:col-span-2")}>
                    Simpan Setelan Situs
                  </button>
                </form>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "jadwal" ? (
          <section id="jadwal" className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-lime-300" />
                  <div className="font-headline text-2xl font-black uppercase">Input Jadwal Booking</div>
                </div>
                <div className="mb-6 rounded-xl border border-mist-700/15 bg-pitch-800 px-4 py-4 text-sm leading-7 text-mist-300">
                  Secara default semua tanggal ke depan dianggap kosong. Form ini dipakai jika admin ingin membuat
                  booking manual atau menutup slot tertentu.
                </div>
                <form action={createScheduleAction} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      name="slot_date"
                      type="date"
                      required
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                    <select
                      name="slot_window"
                      required
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    >
                      {slotOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Catatan slot"
                    className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  />
                  <div className="rounded-xl border border-lime-300/15 bg-lime-300/10 px-4 py-4 text-sm leading-7 text-mist-100">
                    Jika ingin input booking manual, isi data pemesan di bawah. Jika dikosongkan, sistem akan menutup
                    slot tersebut. Harga otomatis mengikuti harga default atau jam prime dari Setelan Situs.
                  </div>
                  <input
                    name="contact_name"
                    placeholder="Nama pemesan"
                    className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  />
                  <textarea
                    name="address"
                    rows={3}
                    placeholder="Alamat pemesan"
                    className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  />
                  <input
                    name="contact_phone"
                    placeholder="No. HP pemesan"
                    className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  />
                  <button type="submit" className={cn(buttonVariants(), "w-full")}>
                    Simpan Jadwal
                  </button>
                </form>
              </CardContent>
            </Card>

            <Card className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <CalendarClock className="h-5 w-5 text-lime-300" />
                  <div className="font-headline text-2xl font-black uppercase">Riwayat Booking</div>
                </div>
                <div className="space-y-4">
                  {bookings.length > 0 ? (
                    bookings.map((booking) => {
                      const slot = Array.isArray(booking.schedule_slots)
                        ? booking.schedule_slots[0]
                        : booking.schedule_slots;

                      return (
                        <div
                          key={booking.id}
                          className="rounded-xl border border-mist-700/15 bg-pitch-800 px-4 py-4 text-sm leading-7 text-mist-300"
                        >
                          <div className="font-semibold text-foreground">{booking.contact_name}</div>
                          <div>{slot?.start_at ? formatDateTime(slot.start_at) : "-"}</div>
                          <div>{slot?.pitch_name ?? "Lapangan Utama"}</div>
                          <div>Status booking: {booking.status}</div>
                          <div>Status pembayaran: {booking.payment_status ?? "-"}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-mist-700/15 bg-pitch-800 px-4 py-4 text-sm leading-7 text-mist-300">
                      Belum ada riwayat booking.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "galeri" ? (
          <section id="galeri">
            <Card className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <ImagePlus className="h-5 w-5 text-lime-300" />
                  <div className="font-headline text-2xl font-black uppercase">Kelola Galeri</div>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {galleryItems.map((item) => (
                    <form key={item.id} action={upsertGalleryItemAction} className="space-y-4 rounded-2xl border border-mist-700/15 bg-pitch-800 p-4">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="existing_image_url" value={item.image_url} />
                      <div
                        className="h-44 rounded-xl bg-cover bg-center"
                        style={{ backgroundImage: `url('${item.image_url}')` }}
                      />
                      <input
                        name="title"
                        required
                        defaultValue={item.title}
                        placeholder="Judul galeri"
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                      <input
                        name="sort_order"
                        type="number"
                        required
                        defaultValue={item.sort_order}
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                      <input
                        name="image_file"
                        type="file"
                        accept="image/*"
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 text-sm"
                      />
                      <button type="submit" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
                        Simpan Item Galeri
                      </button>
                    </form>
                  ))}

                  <form action={upsertGalleryItemAction} className="space-y-4 rounded-2xl border border-dashed border-mist-700/20 bg-pitch-800 p-4">
                    <div className="flex h-44 items-center justify-center rounded-xl bg-pitch-950 text-sm text-mist-300">
                      Tambah item galeri baru
                    </div>
                    <input
                      name="title"
                      required
                      placeholder="Judul galeri"
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                    <input
                      name="sort_order"
                      type="number"
                      required
                      defaultValue={galleryItems.length + 1}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                    <input
                      name="image_file"
                      type="file"
                      accept="image/*"
                      required
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 text-sm"
                    />
                    <button type="submit" className={cn(buttonVariants(), "w-full")}>
                      Tambah Galeri
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "fasilitas" ? (
          <section id="fasilitas">
            <Card className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <Phone className="h-5 w-5 text-lime-300" />
                  <div className="font-headline text-2xl font-black uppercase">Kelola Fasilitas</div>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {facilityItems.map((item) => (
                    <form key={item.id} action={upsertFacilityItemAction} className="space-y-4 rounded-2xl border border-mist-700/15 bg-pitch-800 p-4">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="existing_image_url" value={item.image_url} />
                      <div
                        className="h-44 rounded-xl bg-cover bg-center"
                        style={{ backgroundImage: `url('${item.image_url}')` }}
                      />
                      <input
                        name="title"
                        required
                        defaultValue={item.title}
                        placeholder="Nama fasilitas"
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                      <textarea
                        name="description"
                        required
                        rows={3}
                        defaultValue={item.description}
                        placeholder="Deskripsi fasilitas"
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                        <input
                          name="sort_order"
                          type="number"
                          required
                          defaultValue={item.sort_order}
                          className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                        />
                        <label className="flex items-center gap-2 text-sm text-mist-300">
                          <input name="is_featured" type="checkbox" defaultChecked={item.is_featured} />
                          Jadikan utama
                        </label>
                      </div>
                      <input
                        name="image_file"
                        type="file"
                        accept="image/*"
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 text-sm"
                      />
                      <button type="submit" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
                        Simpan Fasilitas
                      </button>
                    </form>
                  ))}

                  <form action={upsertFacilityItemAction} className="space-y-4 rounded-2xl border border-dashed border-mist-700/20 bg-pitch-800 p-4">
                    <div className="flex h-44 items-center justify-center rounded-xl bg-pitch-950 text-sm text-mist-300">
                      Tambah fasilitas baru
                    </div>
                    <input
                      name="title"
                      required
                      placeholder="Nama fasilitas"
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                    <textarea
                      name="description"
                      required
                      rows={3}
                      placeholder="Deskripsi fasilitas"
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <input
                        name="sort_order"
                        type="number"
                        required
                        defaultValue={facilityItems.length + 1}
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                      <label className="flex items-center gap-2 text-sm text-mist-300">
                        <input name="is_featured" type="checkbox" />
                        Jadikan utama
                      </label>
                    </div>
                    <input
                      name="image_file"
                      type="file"
                      accept="image/*"
                      required
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 text-sm"
                    />
                    <button type="submit" className={cn(buttonVariants(), "w-full")}>
                      Tambah Fasilitas
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "booking" ? (
          <section id="booking">
            <Card className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-mist-700/20 px-6 py-5">
                  <div>
                    <div className="text-sm uppercase tracking-[0.3em] text-lime-300">Queue</div>
                    <div className="mt-2 font-headline text-2xl font-black uppercase">Booking Masuk</div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-left">
                    <thead className="text-xs uppercase tracking-[0.22em] text-mist-300">
                      <tr>
                        <th className="px-6 py-4 font-medium">Tim</th>
                        <th className="px-6 py-4 font-medium">Slot</th>
                        <th className="px-6 py-4 font-medium">Nama</th>
                        <th className="px-6 py-4 font-medium">Alamat</th>
                        <th className="px-6 py-4 font-medium">No. HP</th>
                        <th className="px-6 py-4 font-medium">Booking</th>
                        <th className="px-6 py-4 font-medium">Pembayaran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.length > 0 ? (
                        bookings.map((booking) => {
                          const slot = Array.isArray(booking.schedule_slots)
                            ? booking.schedule_slots[0]
                            : booking.schedule_slots;

                          return (
                            <tr key={booking.id} className="border-t border-mist-700/10">
                              <td className="px-6 py-5 font-semibold text-foreground">{booking.team_name}</td>
                              <td className="px-6 py-5 text-mist-300">
                                {slot?.start_at
                                  ? `${formatDateTime(slot.start_at)} - ${new Intl.DateTimeFormat("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                      timeZone: "Asia/Jakarta",
                                    }).format(new Date(slot.end_at))}`
                                  : "-"}
                              </td>
                              <td className="px-6 py-5 text-mist-300">{booking.contact_name}</td>
                              <td className="px-6 py-5 text-mist-300">{booking.address ?? "-"}</td>
                              <td className="px-6 py-5 text-mist-300">{booking.contact_phone ?? "-"}</td>
                              <td className="px-6 py-5 text-mist-300">{booking.status}</td>
                              <td className="px-6 py-5 text-mist-300">{booking.payment_status ?? "-"}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-mist-300">
                            Belum ada booking di database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
