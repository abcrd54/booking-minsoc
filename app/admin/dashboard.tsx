import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  LogOut,
  MapPinned,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fallbackSettings } from "@/lib/booking-data";
import { cn } from "@/lib/utils";

import { createScheduleAction, updateSettingsAction } from "./actions";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{
    error?: string;
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

export default async function AdminDashboard({ searchParams }: AdminPageProps) {
  const params = await searchParams;

  if (!hasSupabaseEnv) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-pitch-950 px-6 py-16 text-foreground">
        <Card className="surface-glow w-full max-w-xl border border-mist-700/20 bg-pitch-900">
          <CardContent className="space-y-4 p-8">
            <h1 className="font-headline text-3xl font-black uppercase text-lime-300">Supabase belum diset</h1>
            <p className="leading-7 text-mist-300">
              Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di `.env.local`, lalu jalankan SQL di [supabase/schema.sql](/E:/Project/MINSOC/supabase/schema.sql:1).
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

  const [settingsResult, { count: bookingsToday = 0 }, { count: activeMembers = 0 }, bookingsResult, slotsResult] =
    await Promise.all([
      supabase
        .from("app_settings")
        .select("id, venue_name, open_time, close_time, slot_interval_minutes")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "customer"),
      supabase
        .from("bookings")
        .select("id, team_name, contact_name, status, schedule_slots(pitch_name, start_at, end_at)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("schedule_slots")
        .select("id, pitch_name, start_at, end_at, status, price")
        .order("start_at", { ascending: true })
        .limit(8),
    ]);

  const bookings = bookingsResult.data ?? [];
  const slots = slotsResult.data ?? [];
  const settings = settingsResult.data ?? {
    id: 1,
    venue_name: fallbackSettings.venueName,
    open_time: fallbackSettings.openTime,
    close_time: fallbackSettings.closeTime,
    slot_interval_minutes: fallbackSettings.slotIntervalMinutes,
  };
  const estimatedRevenue = slots
    .filter((slot) => slot.status === "booked")
    .reduce((sum, slot) => sum + slot.price, 0);

  const statCards = [
    {
      label: "Booking Hari Ini",
      value: String(bookingsToday),
      detail: "Data real-time dari Supabase",
      icon: CalendarClock,
    },
    {
      label: "Revenue Terbooking",
      value: `IDR ${estimatedRevenue.toLocaleString("id-ID")}`,
      detail: "Akumulasi slot status booked",
      icon: CircleDollarSign,
    },
    {
      label: "Member Aktif",
      value: String(activeMembers),
      detail: "User customer terdaftar",
      icon: UserRound,
    },
    {
      label: "Admin Aktif",
      value: profile.full_name || "Admin",
      detail: "Role tervalidasi lewat profiles",
      icon: ShieldCheck,
    },
  ];

  const activities = [
    "Admin dapat input slot baru langsung dari form Schedule Control.",
    "Bookings terbaru otomatis tampil dari tabel bookings.",
    "Semua route admin dilindungi Supabase Auth dan pengecekan role admin.",
  ];

  return (
    <main className="min-h-screen bg-pitch-950 text-foreground">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-6 py-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-headline text-2xl font-black italic text-lime-300">KINETIC TURF</div>
              <div className="mt-2 text-xs uppercase tracking-[0.3em] text-mist-300">Admin Control</div>
            </div>
            <LayoutDashboard className="h-6 w-6 text-lime-300" />
          </div>

          <div className="mt-8 space-y-3">
            <div className="rounded-xl bg-lime-300/12 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-lime-300">
              Dashboard Overview
            </div>
            <a href="#bookings" className="block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.22em] text-mist-300 transition hover:bg-pitch-800 hover:text-foreground">
              Booking Queue
            </a>
            <a href="#schedule" className="block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.22em] text-mist-300 transition hover:bg-pitch-800 hover:text-foreground">
              Schedule Control
            </a>
            <a href="#activity" className="block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.22em] text-mist-300 transition hover:bg-pitch-800 hover:text-foreground">
              Activity Feed
            </a>
          </div>

          <div className="mt-8 rounded-2xl border border-lime-300/15 bg-[linear-gradient(160deg,rgba(197,254,0,0.18),rgba(14,14,14,0.2))] p-5">
            <div className="text-xs uppercase tracking-[0.3em] text-lime-100/80">Signed In As</div>
            <div className="mt-3 font-headline text-3xl font-black uppercase text-lime-100">
              {profile.full_name || "Admin"}
            </div>
            <div className="mt-3 text-sm leading-7 text-mist-100">
              Role `{profile.role}` aktif. Venue berjalan pada {settings.open_time} - {settings.close_time}.
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <Link href="/" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
              Back to Landing
            </Link>
            <form action={logoutAction}>
              <button type="submit" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </form>
          </div>
        </aside>

        <section className="space-y-6">
          <header className="surface-glow flex flex-col gap-6 rounded-2xl border border-mist-700/20 bg-pitch-900 p-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.35em] text-lime-300">Operational Dashboard</div>
              <h1 className="mt-3 font-headline text-4xl font-black uppercase tracking-crushed md:text-5xl">
                Booking Control Center
              </h1>
              <p className="mt-4 max-w-2xl text-mist-300">
                Dashboard ini memakai Supabase Auth untuk admin dan Supabase DB untuk jadwal serta booking.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#bookings" className={cn(buttonVariants())}>
                Review Bookings
              </a>
              <a href="#schedule" className={cn(buttonVariants({ variant: "secondary" }))}>
                Open Schedule
              </a>
            </div>
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <Card
                  key={card.label}
                  className={cn(
                    "surface-glow reveal-up rounded-2xl border border-mist-700/20 bg-pitch-900",
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
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <Card id="bookings" className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-mist-700/20 px-6 py-5">
                  <div>
                    <div className="text-sm uppercase tracking-[0.3em] text-lime-300">Queue</div>
                    <div className="mt-2 font-headline text-2xl font-black uppercase">Latest Bookings</div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-lime-300" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left">
                    <thead className="text-xs uppercase tracking-[0.22em] text-mist-300">
                      <tr>
                        <th className="px-6 py-4 font-medium">Team</th>
                        <th className="px-6 py-4 font-medium">Slot</th>
                        <th className="px-6 py-4 font-medium">Field</th>
                        <th className="px-6 py-4 font-medium">PIC</th>
                        <th className="px-6 py-4 font-medium">Status</th>
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
                              <td className="px-6 py-5 text-mist-300">{slot?.pitch_name ?? "-"}</td>
                              <td className="px-6 py-5 text-mist-300">{booking.contact_name}</td>
                              <td className="px-6 py-5">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                                    booking.status === "confirmed" && "bg-lime-300/15 text-lime-300",
                                    booking.status === "pending" && "bg-amber-300/15 text-amber-200",
                                    booking.status === "rescheduled" && "bg-sky-300/15 text-sky-200",
                                    booking.status === "cancelled" && "bg-red-400/15 text-red-200",
                                  )}
                                >
                                  {booking.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-mist-300">
                            Belum ada booking di database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <CalendarClock className="h-5 w-5 text-lime-300" />
                    <div className="font-headline text-2xl font-black uppercase">Jam Operasional</div>
                  </div>
                  <form action={updateSettingsAction} className="space-y-4">
                    <input
                      name="venue_name"
                      required
                      defaultValue={settings.venue_name}
                      placeholder="Nama Venue"
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
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
                    <input
                      name="slot_interval_minutes"
                      type="number"
                      min="30"
                      step="30"
                      required
                      defaultValue={settings.slot_interval_minutes}
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                    <button type="submit" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
                      Update Jam Operasional
                    </button>
                  </form>
                </CardContent>
              </Card>

              <Card id="schedule" className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-lime-300" />
                    <div className="font-headline text-2xl font-black uppercase">Input Jadwal Booking</div>
                  </div>
                  <form action={createScheduleAction} className="space-y-4">
                    <input
                      name="pitch_name"
                      required
                      placeholder="Nama Lapangan"
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        name="slot_date"
                        type="date"
                        required
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                      <input
                        name="price"
                        type="number"
                        min="0"
                        required
                        placeholder="Harga"
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        name="start_time"
                        type="time"
                        required
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                      <input
                        name="end_time"
                        type="time"
                        required
                        className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                      />
                    </div>
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Catatan slot, mis. sparring / maintenance / promo"
                      className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                    />
                    <button type="submit" className={cn(buttonVariants(), "w-full")}>
                      Simpan Jadwal
                    </button>
                  </form>
                </CardContent>
              </Card>

              <Card id="activity" className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <MapPinned className="h-5 w-5 text-lime-300" />
                    <div className="font-headline text-2xl font-black uppercase">Recent Slots</div>
                  </div>
                  <div className="space-y-4">
                    {slots.length > 0 ? (
                      slots.map((slot) => (
                        <div key={slot.id} className="rounded-xl border border-mist-700/15 bg-pitch-800 px-4 py-4 text-sm leading-7 text-mist-300">
                          <div className="font-semibold text-foreground">{slot.pitch_name}</div>
                          <div>{formatDateTime(slot.start_at)}</div>
                          <div>Status: {slot.status}</div>
                          <div>Harga: IDR {slot.price.toLocaleString("id-ID")}</div>
                        </div>
                      ))
                    ) : (
                      activities.map((activity) => (
                        <div key={activity} className="rounded-xl border border-mist-700/15 bg-pitch-800 px-4 py-4 text-sm leading-7 text-mist-300">
                          {activity}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
