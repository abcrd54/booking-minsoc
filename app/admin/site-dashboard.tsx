import Link from "next/link";
import { Montserrat } from "next/font/google";
import { CalendarClock, CircleDollarSign, ImagePlus, LayoutDashboard, ListChecks, LogOut, MapPinned, Phone, ShieldCheck, UserRound } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { AdminSectionNav } from "@/components/admin-section-nav";
import { AdminBookingCalendar } from "@/components/admin-booking-calendar.new";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { syncPendingMidtransBookings } from "@/lib/midtrans-booking";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  fallbackFacilityItems,
  fallbackFaqItems,
  fallbackGalleryItems,
  fallbackSettings,
} from "@/lib/booking-data";
import { cn } from "@/lib/utils";

import {
  deleteFacilityItemAction,
  deleteFaqItemAction,
  deleteGalleryItemAction,
  rejectBookingAction,
  updateSettingsAction,
  upsertFacilityItemAction,
  upsertFaqItemAction,
  upsertGalleryItemAction,
} from "./actions";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat-admin",
});

type AdminPageProps = {
  searchParams: Promise<{
    error?: string;
    section?: string;
    success?: string;
    date?: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-300/15 text-amber-200";
    case "booked":
    case "confirmed":
    case "terverifikasi":
      return "bg-lime-300/15 text-lime-300";
    case "blocked":
    case "cancelled":
    case "ditolak":
      return "bg-red-400/15 text-red-200";
    default:
      return "bg-white/10 text-white";
  }
}


export default async function SiteDashboard({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const sectionOptions = ["ringkasan", "setelan", "jadwal", "faq", "galeri", "fasilitas", "booking"] as const;
  const activeSection = sectionOptions.includes((params.section ?? "ringkasan") as (typeof sectionOptions)[number])
    ? (params.section ?? "ringkasan")
    : "ringkasan";
  const selectedDate =
    params.date ?? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());

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
  await syncPendingMidtransBookings();
  const upcomingStart = new Date();
  upcomingStart.setHours(0, 0, 0, 0);

  const [
    settingsResult,
    { count: pendingBookings = 0 },
    { count: confirmedBookings = 0 },
    { count: activeMembers = 0 },
    bookingsResult,
    slotsResult,
    galleryResult,
    facilitiesResult,
    faqResult,
  ] = await Promise.all([
    supabase
      .from("app_settings")
      .select("id, venue_name, open_time, close_time, maps_coordinates, contact_phone, default_price, prime_start_time, prime_end_time, prime_price, slot_interval_minutes, site_logo_url, favicon_url, seo_title, seo_description, seo_keywords, google_analytics_id")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")
      .eq("payment_status", "terverifikasi"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
    supabase
      .from("bookings")
      .select("id, slot_id, team_name, contact_name, contact_phone, address, status, payment_status, payment_method, transfer_amount, admin_notes, created_at, schedule_slots(id, pitch_name, start_at, end_at, price, status, notes)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("schedule_slots")
      .select("id, pitch_name, start_at, end_at, status, price, notes")
      .gte("start_at", upcomingStart.toISOString())
      .order("start_at", { ascending: true })
      .limit(5000),
    supabase.from("site_gallery").select("id, title, image_url, sort_order").order("sort_order", { ascending: true }),
    supabase
      .from("facility_items")
      .select("id, title, description, image_url, sort_order, is_featured")
      .order("sort_order", { ascending: true }),
    supabase.from("faq_items").select("id, question, answer, sort_order").order("sort_order", { ascending: true }),
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
    site_logo_url: fallbackSettings.siteLogoUrl,
    favicon_url: fallbackSettings.faviconUrl,
    seo_title: fallbackSettings.seoTitle,
    seo_description: fallbackSettings.seoDescription,
    seo_keywords: fallbackSettings.seoKeywords,
    google_analytics_id: fallbackSettings.googleAnalyticsId,
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
    galleryResult.data?.map((item) => ({
      id: item.id,
      title: item.title,
      imageUrl: item.image_url,
      sortOrder: item.sort_order,
    })) ?? fallbackGalleryItems;
  const facilityItems =
    facilitiesResult.data?.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      sortOrder: item.sort_order,
      isFeatured: item.is_featured,
    })) ?? fallbackFacilityItems;
  const faqItems =
    faqResult.data?.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      sortOrder: item.sort_order,
    })) ?? fallbackFaqItems;
  const estimatedRevenue = bookings
    .filter((booking) => booking.status === "confirmed" && booking.payment_status === "terverifikasi")
    .reduce((sum, booking) => sum + (booking.transfer_amount ?? 0), 0);

  const statCards = [
    {
      label: "Booking Pending",
      value: String(pendingBookings),
      detail: "Menunggu pembayaran Midtrans",
      icon: CalendarClock,
    },
    {
      label: "Revenue Terverifikasi",
      value: `IDR ${estimatedRevenue.toLocaleString("id-ID")}`,
      detail: "Akumulasi booking confirmed",
      icon: CircleDollarSign,
    },
    {
      label: "Member Aktif",
      value: String(activeMembers),
      detail: "User customer yang terdaftar",
      icon: UserRound,
    },
    {
      label: "Booking Confirmed",
      value: String(confirmedBookings),
      detail: "Otomatis dari Midtrans",
      icon: ShieldCheck,
    },
  ];

  const navItems = [
    { id: "ringkasan", label: "Ringkasan" },
    { id: "setelan", label: "Setelan Situs" },
    { id: "jadwal", label: "Jadwal Booking" },
    { id: "faq", label: "FAQ" },
    { id: "galeri", label: "Galeri" },
    { id: "fasilitas", label: "Fasilitas" },
    { id: "booking", label: "Booking Masuk" },
  ];

  return (
    <main className={`${montserrat.className} min-h-screen bg-pitch-950 text-foreground`}>
      <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
        <aside className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900 p-6 lg:fixed lg:left-8 lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[280px]">
          <div className="flex items-center justify-between">
            <div>
              {settings.site_logo_url ? (
                <img src={settings.site_logo_url} alt={settings.venue_name} className="h-12 w-auto max-w-[180px] object-contain" />
              ) : (
                <div className="font-headline text-2xl font-black italic text-lime-300">
                  {settings.venue_name.toUpperCase()}
                </div>
              )}
              <div className="mt-2 text-xs uppercase tracking-[0.3em] text-mist-300">Panel Admin</div>
            </div>
            <LayoutDashboard className="h-6 w-6 text-lime-300" />
          </div>

          <AdminSectionNav items={navItems} activeSection={activeSection} />

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
              <SubmitButton variant="secondary" className="w-full" pendingText="Keluar...">
                <LogOut className="h-4 w-4" />
                Logout
              </SubmitButton>
            </form>
          </div>
        </aside>

        <section className="space-y-6 lg:ml-[304px]">
          <header className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900 p-6">
            <div className="text-sm uppercase tracking-[0.35em] text-lime-300">Dashboard Operasional</div>
            <h1 className="mt-3 font-headline text-4xl font-black uppercase tracking-crushed md:text-5xl">
              {navItems.find((item) => item.id === activeSection)?.label ?? "Dashboard"}
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
                  <input type="hidden" name="existing_site_logo_url" value={settings.site_logo_url ?? ""} />
                  <input type="hidden" name="existing_favicon_url" value={settings.favicon_url ?? ""} />
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Nama Situs</span>
                    <input
                      name="venue_name"
                      required
                      defaultValue={settings.venue_name}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Nomor yang Bisa Dihubungi</span>
                    <input
                      name="contact_phone"
                      required
                      defaultValue={settings.contact_phone}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Harga Default</span>
                    <input
                      name="default_price"
                      type="number"
                      min="0"
                      required
                      defaultValue={settings.default_price}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Harga Prime</span>
                    <input
                      name="prime_price"
                      type="number"
                      min="0"
                      required
                      defaultValue={settings.prime_price}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </label>
                  <label className="space-y-2 lg:col-span-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Koordinat Maps / URL Embed</span>
                    <input
                      name="maps_coordinates"
                      required
                      defaultValue={settings.maps_coordinates}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Jam Buka</span>
                      <input
                        name="open_time"
                        type="time"
                        required
                        defaultValue={settings.open_time}
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Jam Tutup</span>
                      <input
                        name="close_time"
                        type="time"
                        required
                        defaultValue={settings.close_time === "24:00" ? "23:59" : settings.close_time}
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Jam Prime Mulai</span>
                      <input
                        name="prime_start_time"
                        type="time"
                        required
                        defaultValue={settings.prime_start_time}
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Jam Prime Selesai</span>
                      <input
                        name="prime_end_time"
                        type="time"
                        required
                        defaultValue={settings.prime_end_time}
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </label>
                  </div>
                  <label className="space-y-2 lg:col-span-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Interval Slot Menit</span>
                    <input
                      name="slot_interval_minutes"
                      type="number"
                      min="30"
                      step="30"
                      required
                      defaultValue={settings.slot_interval_minutes}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </label>
                  <label className="space-y-2 lg:col-span-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Judul SEO / Title Browser</span>
                    <input
                      name="seo_title"
                      defaultValue={settings.seo_title ?? settings.venue_name}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </label>
                  <label className="space-y-2 lg:col-span-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Deskripsi SEO</span>
                    <textarea
                      name="seo_description"
                      rows={3}
                      defaultValue={settings.seo_description ?? ""}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </label>
                  <label className="space-y-2 lg:col-span-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Kata Kunci SEO</span>
                    <input
                      name="seo_keywords"
                      defaultValue={settings.seo_keywords ?? ""}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">ID Google Analytics</span>
                    <input
                      name="google_analytics_id"
                      defaultValue={settings.google_analytics_id ?? ""}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Upload Logo Situs</span>
                    <input
                      name="site_logo_file"
                      type="file"
                      accept="image/*"
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Upload Favicon</span>
                    <input
                      name="favicon_file"
                      type="file"
                      accept="image/*"
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 text-sm"
                    />
                  </label>
                  <div className="rounded-xl border border-mist-700/20 bg-pitch-800 p-4">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-mist-300">Preview Logo</div>
                    {settings.site_logo_url ? (
                      <img src={settings.site_logo_url} alt={settings.venue_name} className="h-14 w-auto object-contain" />
                    ) : (
                      <div className="font-headline text-lg font-black uppercase text-lime-300">{settings.venue_name}</div>
                    )}
                  </div>
                  <div className="rounded-xl border border-mist-700/20 bg-pitch-800 p-4">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-mist-300">Preview Favicon</div>
                    {settings.favicon_url ? (
                      <img src={settings.favicon_url} alt="favicon" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="text-sm text-mist-300">Belum ada favicon.</div>
                    )}
                  </div>
                  <SubmitButton className="lg:col-span-2" pendingText="Menyimpan setelan...">
                    Simpan Setelan Situs
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "jadwal" ? (
          <section id="jadwal">
            <Card className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <CalendarClock className="h-5 w-5 text-lime-300" />
                  <div className="font-headline text-2xl font-black uppercase">Kalender Slot & Detail Pemesan</div>
                </div>
                <AdminBookingCalendar
                  initialDate={selectedDate}
                  settings={{
                    openTime: settings.open_time,
                    closeTime: settings.close_time,
                    defaultPrice: settings.default_price,
                    primeStartTime: settings.prime_start_time,
                    primeEndTime: settings.prime_end_time,
                    primePrice: settings.prime_price,
                    slotIntervalMinutes: settings.slot_interval_minutes,
                  }}
                  slots={slots.map((slot) => ({
                    id: slot.id,
                    startAt: slot.start_at,
                    endAt: slot.end_at,
                    price: slot.price,
                    status: slot.status,
                    notes: slot.notes ?? null,
                  }))}
                  bookings={bookings.map((booking) => ({
                    id: booking.id,
                    slotId: booking.slot_id,
                    contactName: booking.contact_name,
                    contactPhone: booking.contact_phone,
                    address: booking.address,
                    bookingStatus: booking.status,
                    paymentStatus: booking.payment_status,
                    adminNotes: booking.admin_notes,
                  }))}
                />
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "faq" ? (
          <section id="faq">
            <Card className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <ListChecks className="h-5 w-5 text-lime-300" />
                  <div className="font-headline text-2xl font-black uppercase">Kelola FAQ</div>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {faqItems.map((item) => (
                    <div key={item.id} className="space-y-3 rounded-2xl border border-mist-700/15 bg-pitch-800 p-4">
                      <form action={upsertFaqItemAction} className="space-y-3">
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          name="question"
                          required
                          defaultValue={item.question}
                          className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                        />
                        <textarea
                          name="answer"
                          rows={4}
                          required
                          defaultValue={item.answer}
                          className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                        />
                        <input
                          name="sort_order"
                          type="number"
                          required
                          defaultValue={item.sortOrder}
                          className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                        />
                        <SubmitButton variant="secondary" className="w-full" pendingText="Menyimpan FAQ...">
                          Simpan FAQ
                        </SubmitButton>
                      </form>
                      <form action={deleteFaqItemAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <SubmitButton variant="secondary" className="w-full border-red-400/30 text-red-200 hover:bg-red-400/10" pendingText="Menghapus FAQ...">
                          Hapus FAQ
                        </SubmitButton>
                      </form>
                    </div>
                  ))}

                  <form action={upsertFaqItemAction} className="space-y-4 rounded-2xl border border-dashed border-mist-700/20 bg-pitch-800 p-4">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Pertanyaan FAQ</span>
                      <input
                        name="question"
                        required
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Jawaban FAQ</span>
                      <textarea
                        name="answer"
                        rows={4}
                        required
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Urutan Tampil</span>
                      <input
                        name="sort_order"
                        type="number"
                        required
                        defaultValue={faqItems.length + 1}
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </label>
                    <SubmitButton className="w-full" pendingText="Menambahkan FAQ...">
                      Tambah FAQ
                    </SubmitButton>
                  </form>
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
                    <div key={item.id} className="space-y-3 rounded-2xl border border-mist-700/15 bg-pitch-800 p-4">
                      <form action={upsertGalleryItemAction} className="space-y-4">
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="existing_image_url" value={item.imageUrl} />
                        <div
                          className="h-44 rounded-xl bg-cover bg-center"
                          style={{ backgroundImage: `url('${item.imageUrl}')` }}
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
                          defaultValue={item.sortOrder}
                          className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                        />
                        <input
                          name="image_file"
                          type="file"
                          accept="image/*"
                          className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 text-sm"
                        />
                        <SubmitButton variant="secondary" className="w-full" pendingText="Menyimpan galeri...">
                          Simpan Item Galeri
                        </SubmitButton>
                      </form>
                      <form action={deleteGalleryItemAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <SubmitButton variant="secondary" className="w-full border-red-400/30 text-red-200 hover:bg-red-400/10" pendingText="Menghapus galeri...">
                          Hapus Item
                        </SubmitButton>
                      </form>
                    </div>
                  ))}

                  <form action={upsertGalleryItemAction} className="space-y-4 rounded-2xl border border-dashed border-mist-700/20 bg-pitch-800 p-4">
                    <div className="flex h-44 items-center justify-center rounded-xl bg-pitch-950 text-sm text-mist-300">
                      Tambah item galeri baru
                    </div>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Judul Galeri</span>
                      <input
                        name="title"
                        required
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Urutan Tampil</span>
                      <input
                        name="sort_order"
                        type="number"
                        required
                        defaultValue={galleryItems.length + 1}
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Upload Gambar</span>
                      <input
                        name="image_file"
                        type="file"
                        accept="image/*"
                        required
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 text-sm"
                      />
                    </label>
                    <SubmitButton className="w-full" pendingText="Menambahkan galeri...">
                      Tambah Galeri
                    </SubmitButton>
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
                    <div key={item.id} className="space-y-3 rounded-2xl border border-mist-700/15 bg-pitch-800 p-4">
                      <form action={upsertFacilityItemAction} className="space-y-4">
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="existing_image_url" value={item.imageUrl} />
                        <div
                          className="h-44 rounded-xl bg-cover bg-center"
                          style={{ backgroundImage: `url('${item.imageUrl}')` }}
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
                            defaultValue={item.sortOrder}
                            className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                          />
                          <label className="flex items-center gap-2 text-sm text-mist-300">
                            <input name="is_featured" type="checkbox" defaultChecked={item.isFeatured} />
                            Jadikan utama
                          </label>
                        </div>
                        <input
                          name="image_file"
                          type="file"
                          accept="image/*"
                          className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 text-sm"
                        />
                        <SubmitButton variant="secondary" className="w-full" pendingText="Menyimpan fasilitas...">
                          Simpan Fasilitas
                        </SubmitButton>
                      </form>
                      <form action={deleteFacilityItemAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <SubmitButton variant="secondary" className="w-full border-red-400/30 text-red-200 hover:bg-red-400/10" pendingText="Menghapus fasilitas...">
                          Hapus Fasilitas
                        </SubmitButton>
                      </form>
                    </div>
                  ))}

                  <form action={upsertFacilityItemAction} className="space-y-4 rounded-2xl border border-dashed border-mist-700/20 bg-pitch-800 p-4">
                    <div className="flex h-44 items-center justify-center rounded-xl bg-pitch-950 text-sm text-mist-300">
                      Tambah fasilitas baru
                    </div>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Nama Fasilitas</span>
                      <input
                        name="title"
                        required
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Deskripsi Fasilitas</span>
                      <textarea
                        name="description"
                        required
                        rows={3}
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Urutan Tampil</span>
                        <input
                          name="sort_order"
                          type="number"
                          required
                          defaultValue={facilityItems.length + 1}
                          className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm text-mist-300">
                        <input name="is_featured" type="checkbox" />
                        Jadikan utama
                      </label>
                    </div>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Upload Gambar</span>
                      <input
                        name="image_file"
                        type="file"
                        accept="image/*"
                        required
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 text-sm"
                      />
                    </label>
                    <SubmitButton className="w-full" pendingText="Menambahkan fasilitas...">
                      Tambah Fasilitas
                    </SubmitButton>
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
                  <table className="w-full min-w-[980px] text-left">
                    <thead className="text-xs uppercase tracking-[0.22em] text-mist-300">
                      <tr>
                        <th className="px-6 py-4 font-medium">Tim</th>
                        <th className="px-6 py-4 font-medium">Slot</th>
                        <th className="px-6 py-4 font-medium">Nama</th>
                        <th className="px-6 py-4 font-medium">Alamat</th>
                        <th className="px-6 py-4 font-medium">No. HP</th>
                        <th className="px-6 py-4 font-medium">Booking</th>
                        <th className="px-6 py-4 font-medium">Pembayaran</th>
                        <th className="px-6 py-4 font-medium">Sumber</th>
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
                              <td className="px-6 py-5">
                                <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", statusBadge(booking.status))}>
                                  {booking.status}
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", statusBadge(booking.payment_status ?? ""))}>
                                  {booking.payment_status ?? "-"}
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex gap-2">
                                  <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", booking.payment_method === "midtrans_snap" ? "bg-lime-300/15 text-lime-300" : "bg-white/10 text-white")}>
                                    {booking.payment_method === "midtrans_snap" ? "Midtrans" : booking.payment_method ?? "-"}
                                  </span>
                                  <form action={rejectBookingAction}>
                                    <input type="hidden" name="booking_id" value={booking.id} />
                                    <input type="hidden" name="slot_id" value={booking.slot_id} />
                                    <SubmitButton variant="secondary" disabled={booking.status === "cancelled"} className="h-9 border-red-400/30 px-3 text-[10px] text-red-200 hover:bg-red-400/10" pendingText="Membatalkan...">
                                      Batalkan
                                    </SubmitButton>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-10 text-center text-mist-300">
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
