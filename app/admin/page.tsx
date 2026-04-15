export { default, dynamic } from "./site-dashboard"; /*
import {
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  MapPinned,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statCards = [
  {
    label: "Booking Hari Ini",
    value: "24",
    detail: "+6 dibanding kemarin",
    icon: CalendarClock,
  },
  {
    label: "Revenue Hari Ini",
    value: "IDR 9.8jt",
    detail: "82% slot terisi",
    icon: CircleDollarSign,
  },
  {
    label: "Member Aktif",
    value: "138",
    detail: "12 tim langganan",
    icon: UserRound,
  },
  {
    label: "Tingkat Approval",
    value: "96%",
    detail: "Reschedule tertangani cepat",
    icon: ShieldCheck,
  },
];

const upcomingBookings = [
  {
    team: "FC Nusantara",
    slot: "16 Apr 2026 • 19:00 - 20:00",
    field: "Field A",
    status: "Confirmed",
    contact: "Rizky Darmadi",
  },
  {
    team: "Weekend Warriors",
    slot: "16 Apr 2026 • 20:00 - 21:00",
    field: "Field B",
    status: "Pending Payment",
    contact: "Sarah Meira",
  },
  {
    team: "Mataram United",
    slot: "16 Apr 2026 • 21:00 - 22:00",
    field: "Field A",
    status: "Confirmed",
    contact: "Bagus Adrian",
  },
  {
    team: "Tactical Seven",
    slot: "17 Apr 2026 • 08:00 - 09:00",
    field: "Field B",
    status: "Reschedule Requested",
    contact: "Kevin Saputra",
  },
];

const activities = [
  "Pembayaran FC Nusantara berhasil diverifikasi admin.",
  "Request reschedule Tactical Seven masuk dan menunggu approval.",
  "Slot 19:00 Field A terisi penuh untuk tiga hari ke depan.",
  "Lead baru masuk dari form booking landing page.",
];

const quickActions = [
  "Konfirmasi pembayaran manual",
  "Buka slot promo jam siang",
  "Update harga season night",
  "Broadcast WhatsApp reminder",
];

export default function AdminPage() {
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
            <div className="text-xs uppercase tracking-[0.3em] text-lime-100/80">Shift Status</div>
            <div className="mt-3 font-headline text-3xl font-black uppercase text-lime-100">Live Ops</div>
            <div className="mt-3 text-sm leading-7 text-mist-100">
              2 admin online, 4 payment pending, dan 1 reschedule request perlu ditinjau.
            </div>
          </div>

          <div className="mt-8">
            <Link href="/" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
              Back to Landing
            </Link>
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
                Monitor slot, approval, payment, dan performa harian dalam satu dashboard frontend-only.
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
                    <div className="flex items-start justify-between">
                      <div className="text-sm uppercase tracking-[0.24em] text-mist-300">{card.label}</div>
                      <Icon className="h-5 w-5 text-lime-300" />
                    </div>
                    <div className="mt-6 text-4xl font-black text-lime-100">{card.value}</div>
                    <div className="mt-3 text-sm text-mist-300">{card.detail}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <Card id="bookings" className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-mist-700/20 px-6 py-5">
                  <div>
                    <div className="text-sm uppercase tracking-[0.3em] text-lime-300">Queue</div>
                    <div className="mt-2 font-headline text-2xl font-black uppercase">Upcoming Bookings</div>
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
                      {upcomingBookings.map((booking) => (
                        <tr key={`${booking.team}-${booking.slot}`} className="border-t border-mist-700/10">
                          <td className="px-6 py-5 font-semibold text-foreground">{booking.team}</td>
                          <td className="px-6 py-5 text-mist-300">{booking.slot}</td>
                          <td className="px-6 py-5 text-mist-300">{booking.field}</td>
                          <td className="px-6 py-5 text-mist-300">{booking.contact}</td>
                          <td className="px-6 py-5">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                                booking.status === "Confirmed" && "bg-lime-300/15 text-lime-300",
                                booking.status === "Pending Payment" && "bg-amber-300/15 text-amber-200",
                                booking.status === "Reschedule Requested" && "bg-sky-300/15 text-sky-200",
                              )}
                            >
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card id="schedule" className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-lime-300" />
                    <div className="font-headline text-2xl font-black uppercase">Schedule Control</div>
                  </div>
                  <div className="mt-6 space-y-4">
                    {[
                      ["Field A • 19:00", "Booked"],
                      ["Field A • 20:00", "Booked"],
                      ["Field B • 19:00", "Open"],
                      ["Field B • 20:00", "Promo"],
                    ].map(([label, state]) => (
                      <div key={label} className="flex items-center justify-between rounded-xl bg-pitch-800 px-4 py-4">
                        <span className="font-medium">{label}</span>
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                            state === "Booked" && "bg-lime-300/15 text-lime-300",
                            state === "Open" && "bg-white/10 text-white",
                            state === "Promo" && "bg-fuchsia-300/15 text-fuchsia-200",
                          )}
                        >
                          {state}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card id="activity" className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <MapPinned className="h-5 w-5 text-lime-300" />
                    <div className="font-headline text-2xl font-black uppercase">Activity Feed</div>
                  </div>
                  <div className="mt-6 space-y-4">
                    {activities.map((activity) => (
                      <div key={activity} className="rounded-xl border border-mist-700/15 bg-pitch-800 px-4 py-4 text-sm leading-7 text-mist-300">
                        {activity}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="surface-glow rounded-2xl border border-mist-700/20 bg-pitch-900">
            <CardContent className="p-6">
              <div className="mb-6 font-headline text-2xl font-black uppercase">Quick Actions</div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {quickActions.map((action) => (
                  <div
                    key={action}
                    className="rounded-2xl border border-lime-300/10 bg-pitch-800 px-5 py-5 text-sm uppercase tracking-[0.2em] text-mist-100 transition hover:-translate-y-1 hover:border-lime-300/25"
                  >
                    {action}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}*/
