"use client";

import { useMemo, useState } from "react";
import { CalendarDays, MoonStar, SunMedium } from "lucide-react";

import { createScheduleAction } from "@/app/admin/actions";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getSlotIsoRange, getSlotPrice, getSlotWindows } from "@/lib/slot-utils";
import { cn } from "@/lib/utils";

type AdminBookingCalendarProps = {
  initialDate: string;
  settings: {
    openTime: string;
    closeTime: string;
    defaultPrice: number;
    primeStartTime: string;
    primeEndTime: string;
    primePrice: number;
    slotIntervalMinutes: number;
  };
  slots: Array<{
    id: string;
    startAt: string;
    endAt: string;
    price: number;
    status: string;
    notes: string | null;
  }>;
  bookings: Array<{
    id: string;
    slotId: string;
    contactName: string | null;
    contactPhone: string | null;
    address: string | null;
    bookingStatus: string | null;
    paymentStatus: string | null;
    adminNotes: string | null;
  }>;
};

function getSlotMapKey(startAt: string, endAt: string) {
  return `${new Date(startAt).toISOString()}|${new Date(endAt).toISOString()}`;
}

function formatTimeOnly(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatSelectedDayLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}T00:00:00+07:00`));
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

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Menunggu";
    case "booked":
    case "confirmed":
      return "Booked";
    case "blocked":
      return "Ditutup";
    case "cancelled":
    case "ditolak":
      return "Ditolak";
    case "available":
      return "Tersedia";
    default:
      return status;
  }
}

export function AdminBookingCalendar({ initialDate, settings, slots, bookings }: AdminBookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const todayDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  const slotWindows = useMemo(
    () =>
      getSlotWindows({
        openTime: settings.openTime,
        closeTime: settings.closeTime,
        slotIntervalMinutes: settings.slotIntervalMinutes,
      }),
    [settings.closeTime, settings.openTime, settings.slotIntervalMinutes],
  );

  const slotMap = useMemo(() => {
    const map = new Map<string, (typeof slots)[number]>();
    slots.forEach((slot) => {
      map.set(getSlotMapKey(slot.startAt, slot.endAt), slot);
    });
    return map;
  }, [slots]);

  const bookingMap = useMemo(() => {
    return new Map(bookings.map((booking) => [booking.slotId, booking]));
  }, [bookings]);

  const daySlots = useMemo(() => {
    return slotWindows.map((window) => {
      const { startAt, endAt } = getSlotIsoRange(selectedDate, window.startTime, window.endTime);
      const existingSlot = slotMap.get(getSlotMapKey(startAt, endAt));
      const booking = existingSlot ? bookingMap.get(existingSlot.id) ?? null : null;

      return {
        id: existingSlot?.id ?? `virtual:${selectedDate}:${window.startTime}`,
        slotWindow: `${window.startTime} - ${window.endTime}`,
        slotDate: selectedDate,
        startAt,
        endAt,
        price:
          existingSlot?.price ??
          getSlotPrice(window.startTime, {
            defaultPrice: settings.defaultPrice,
            primeStartTime: settings.primeStartTime,
            primeEndTime: settings.primeEndTime,
            primePrice: settings.primePrice,
          }),
        status: existingSlot?.status ?? "available",
        notes: existingSlot?.notes ?? null,
        booking,
      };
    });
  }, [
    bookingMap,
    selectedDate,
    settings.defaultPrice,
    settings.primeEndTime,
    settings.primePrice,
    settings.primeStartTime,
    slotMap,
    slotWindows,
  ]);

  const visibleDaySlots = useMemo(() => {
    const now = Date.now();

    return daySlots.map((slot) => ({
      ...slot,
      isPast: selectedDate === todayDate && new Date(slot.startAt).getTime() < now,
    }));
  }, [daySlots, selectedDate, todayDate]);

  const selectedSlot =
    visibleDaySlots.find((slot) => slot.id === selectedSlotId && slot.status === "available" && !slot.isPast) ??
    visibleDaySlots.find((slot) => slot.status === "available" && !slot.isPast) ??
    null;

  const morningSlots = visibleDaySlots.filter((slot) => new Date(slot.startAt).getUTCHours() + 7 < 12);
  const afternoonSlots = visibleDaySlots.filter((slot) => {
    const hour = new Date(slot.startAt).getUTCHours() + 7;
    return hour >= 12 && hour < 17;
  });
  const primeSlots = visibleDaySlots.filter((slot) => {
    const hour = new Date(slot.startAt).getUTCHours() + 7;
    return hour >= 17 && hour < 22;
  });
  const lateNightSlots = visibleDaySlots.filter((slot) => new Date(slot.startAt).getUTCHours() + 7 >= 22);

  const renderSlotCard = (slot: (typeof visibleDaySlots)[number]) => {
    const isSelectable = slot.status === "available" && !slot.isPast;
    const isSelected = selectedSlot?.id === slot.id && isSelectable;

    if ((slot.status === "booked" || slot.status === "pending") && slot.booking) {
      return (
        <details
          key={slot.id}
          className={cn(
            "group rounded-lg border p-4 transition-all",
            slot.status === "pending" && "border-transparent bg-amber-300/10",
            slot.status === "booked" && "border-transparent bg-pitch-750/40",
            slot.isPast && "opacity-60",
          )}
        >
          <summary className={cn("relative list-none marker:content-none", slot.isPast ? "cursor-not-allowed" : "cursor-pointer")}>
            <span className="mb-1 block pr-16 text-[10px] font-bold uppercase text-mist-300/60">
              {formatTimeOnly(slot.startAt)} - {formatTimeOnly(slot.endAt)}
            </span>
            <span className="block pr-16 font-headline text-lg font-bold text-mist-300/60">
              Rp {slot.price.toLocaleString("id-ID")}
            </span>
            <span className={cn("absolute right-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em]", statusBadge(slot.status))}>
              {statusLabel(slot.status)}
            </span>
            <div className={cn("mt-3 text-[10px] font-black uppercase tracking-[0.2em]", slot.isPast ? "text-mist-300/50" : "text-lime-300")}>
              {slot.isPast ? "Slot lampau" : "Klik untuk detail"}
            </div>
          </summary>
          {!slot.isPast ? (
            <div className="mt-4 border-t border-mist-700/15 pt-4 text-sm leading-7 text-mist-300">
              <div>Nama Pemesan: {slot.booking.contactName ?? "-"}</div>
              <div>Alamat: {slot.booking.address ?? "-"}</div>
              <div>No. HP: {slot.booking.contactPhone ?? "-"}</div>
              <div>Status Booking: {slot.booking.bookingStatus ?? "-"}</div>
              <div>Status Pembayaran: {slot.booking.paymentStatus ?? "-"}</div>
              <div>Catatan Data Pemesan: {slot.booking.adminNotes ?? "-"}</div>
              <div>Catatan Slot: {slot.notes ?? "-"}</div>
            </div>
          ) : null}
        </details>
      );
    }

    return (
      <button
        key={slot.id}
        type="button"
        disabled={!isSelectable}
        onClick={() => setSelectedSlotId(slot.id)}
        className={cn(
          "relative rounded-lg border p-4 text-left transition-all",
          isSelected && "border-transparent bg-lime-300 text-lime-700 shadow-[0_0_20px_rgba(197,254,0,0.18)]",
          !isSelected && slot.status === "available" && "border-mist-700/10 bg-pitch-950 hover:bg-pitch-700",
          slot.isPast && "cursor-not-allowed opacity-45",
          slot.status === "blocked" && "border-transparent bg-red-400/10 text-red-100",
        )}
      >
        {isSelected ? <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.24em]">Dipilih</span> : null}
        <span className={cn("mb-1 block pr-16 text-[10px] font-bold uppercase", isSelected ? "text-lime-700" : slot.status === "available" ? "text-mist-300" : "text-red-100")}>
          {formatTimeOnly(slot.startAt)} - {formatTimeOnly(slot.endAt)}
        </span>
        <span className={cn("block pr-16 font-headline text-lg font-bold", isSelected ? "text-lime-700" : slot.status === "available" ? "text-foreground" : "text-red-100")}>
          Rp {slot.price.toLocaleString("id-ID")}
        </span>
        <span className={cn("absolute right-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em]", statusBadge(slot.status))}>
          {statusLabel(slot.status)}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6 rounded-2xl border border-mist-700/15 bg-pitch-800 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-lime-300">Pilih Tanggal</div>
          <div className="mt-2 font-headline text-2xl font-black uppercase text-foreground">
            {formatSelectedDayLabel(selectedDate)}
          </div>
        </div>
        <label className="w-full max-w-md space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-300/80">Tanggal Booking</span>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-lime-300" />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              min={todayDate}
              className="w-full rounded-2xl border border-lime-300/20 bg-[linear-gradient(180deg,rgba(21,21,21,0.98),rgba(10,10,10,0.94))] py-3 pl-12 pr-4 text-foreground shadow-[0_18px_50px_rgba(0,0,0,0.28)] outline-none transition [color-scheme:dark] focus:border-lime-300/40 focus:shadow-[0_22px_60px_rgba(197,254,0,0.08)]"
            />
          </div>
        </label>
      </div>

      <div className="space-y-8">
        <section>
          <div className="mb-4 flex items-center gap-4">
            <SunMedium className="h-5 w-5 text-mist-300" />
            <h4 className="font-headline text-sm font-bold uppercase tracking-wider">Sesi Pagi</h4>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">{morningSlots.map(renderSlotCard)}</div>
        </section>
        <section>
          <div className="mb-4 flex items-center gap-4">
            <CalendarDays className="h-5 w-5 text-mist-100" />
            <h4 className="font-headline text-sm font-bold uppercase tracking-wider text-mist-100">Sesi Sore</h4>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">{afternoonSlots.map(renderSlotCard)}</div>
        </section>
        <section>
          <div className="mb-4 flex items-center gap-4">
            <CalendarDays className="h-5 w-5 text-lime-300" />
            <h4 className="font-headline text-sm font-bold uppercase tracking-wider text-lime-300">Jam Favorit</h4>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">{primeSlots.map(renderSlotCard)}</div>
        </section>
        <section>
          <div className="mb-4 flex items-center gap-4">
            <MoonStar className="h-5 w-5 text-mist-300" />
            <h4 className="font-headline text-sm font-bold uppercase tracking-wider">Sesi Malam</h4>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">{lateNightSlots.map(renderSlotCard)}</div>
        </section>
      </div>

      <div className="rounded-xl border border-lime-300/15 bg-lime-300/10 px-4 py-4 text-sm leading-7 text-mist-100">
        Slot lampau hari ini tidak bisa dipilih. Pilih slot yang masih tersedia, lalu isi data pemesan untuk membuat pesanan manual.
      </div>

      <form action={createScheduleAction} className="space-y-4 rounded-2xl border border-mist-700/15 bg-pitch-900 p-4">
        <input type="hidden" name="slot_date" value={selectedDate} />
        <input type="hidden" name="slot_window" value={selectedSlot?.slotWindow ?? ""} />
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Slot Dipilih</span>
          <div className="rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 text-sm text-mist-100">
            {selectedSlot ? `${selectedSlot.slotWindow} | Rp ${selectedSlot.price.toLocaleString("id-ID")}` : "Pilih slot terlebih dahulu"}
          </div>
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Nama Pemesan</span>
          <input
            name="contact_name"
            className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Alamat Pemesan</span>
          <textarea
            name="address"
            rows={3}
            className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-mist-300">No. HP Pemesan</span>
          <input
            name="contact_phone"
            className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-mist-300">Catatan Slot</span>
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-3 outline-none transition focus:border-lime-300/40"
          />
        </label>
        <SubmitButton disabled={!selectedSlot} className="w-full" pendingText="Menyimpan jadwal...">
          Buat Pesanan Manual
        </SubmitButton>
      </form>
    </div>
  );
}
