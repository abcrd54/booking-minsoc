"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Info, MoonStar, SunMedium, X } from "lucide-react";

import { createBookingAction } from "@/app/booking/actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BookingSettings, ScheduleSlotView } from "@/lib/booking-data";
import { cn } from "@/lib/utils";

type BookingCalendarProps = {
  settings: BookingSettings;
  slots: ScheduleSlotView[];
};

type GroupedDay = {
  dayKey: string;
  dayLabel: string;
  fullLabel: string;
  slots: ScheduleSlotView[];
};

type CalendarCell = {
  date: Date;
  dayKey: string;
  isCurrentMonth: boolean;
};

function formatDayKey(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatFullDayLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatFullDayLabelFromDayKey(value: string) {
  return formatFullDayLabel(`${value}T00:00:00+07:00`);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function parseDayKey(dayKey: string) {
  return new Date(`${dayKey}T00:00:00+07:00`);
}

function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(value);
}

function getMonthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function getCalendarCells(monthDate: Date) {
  const monthStart = getMonthStart(monthDate);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -firstWeekday);

  return Array.from({ length: 42 }, (_, index): CalendarCell => {
    const date = addDays(gridStart, index);

    return {
      date,
      dayKey: formatDayKey(date.toISOString()),
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

const weekdayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function BookingCalendarOpenPicker({ settings, slots }: BookingCalendarProps) {
  const groupedDays = useMemo<GroupedDay[]>(() => {
    const map = new Map<string, GroupedDay>();

    slots
      .slice()
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .forEach((slot) => {
        const dayKey = formatDayKey(slot.startAt);
        const existing = map.get(dayKey);

        if (existing) {
          existing.slots.push(slot);
          return;
        }

        map.set(dayKey, {
          dayKey,
          dayLabel: formatDayLabel(slot.startAt),
          fullLabel: formatFullDayLabel(slot.startAt),
          slots: [slot],
        });
      });

    return Array.from(map.values());
  }, [slots]);

  const [selectedDay, setSelectedDay] = useState(groupedDays[0]?.dayKey ?? "");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() =>
    selectedDay ? getMonthStart(parseDayKey(selectedDay)) : getMonthStart(new Date()),
  );
  const datePickerRef = useRef<HTMLInputElement>(null);
  const availableDayKeys = useMemo(() => new Set(groupedDays.map((day) => day.dayKey)), [groupedDays]);
  const calendarCells = useMemo(() => getCalendarCells(displayMonth), [displayMonth]);

  const activeDay = groupedDays.find((day) => day.dayKey === selectedDay);
  const selectedSlot =
    activeDay?.slots.find((slot) => slot.id === selectedSlotId) ??
    activeDay?.slots.find((slot) => slot.status === "available") ??
    activeDay?.slots[0];

  useEffect(() => {
    const nextAvailableSlot =
      activeDay?.slots.find((slot) => slot.status === "available") ?? activeDay?.slots[0];
    setSelectedSlotId(nextAvailableSlot?.id ?? "");
  }, [selectedDay, activeDay]);

  useEffect(() => {
    if (!selectedDay) {
      return;
    }

    setDisplayMonth(getMonthStart(parseDayKey(selectedDay)));
  }, [selectedDay]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!datePickerRef.current?.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const morningSlots =
    activeDay?.slots.filter((slot) => new Date(slot.startAt).getUTCHours() + 7 < 12) ?? [];
  const primeSlots =
    activeDay?.slots.filter((slot) => {
      const hour = new Date(slot.startAt).getUTCHours() + 7;
      return hour >= 17 && hour < 22;
    }) ?? [];
  const lateNightSlots =
    activeDay?.slots.filter((slot) => new Date(slot.startAt).getUTCHours() + 7 >= 22) ?? [];

  const selectedDayLabel = selectedDay
    ? formatFullDayLabelFromDayKey(selectedDay)
    : groupedDays[0]?.fullLabel ?? "Belum Ada Jadwal";
  const selectedSlotLabel = selectedSlot
    ? `${selectedDayLabel} • ${formatTime(selectedSlot.startAt)} - ${formatTime(selectedSlot.endAt)}`
    : "";

  const openDatePicker = () => {
    const input = datePickerRef.current;
    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };

    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }

    input.click();
  };

  const renderSlotCard = (slot: ScheduleSlotView, selected = false) => (
    <button
      key={slot.id}
      type="button"
      disabled={slot.status !== "available"}
      onClick={() => setSelectedSlotId(slot.id)}
      className={cn(
        "rounded-lg border p-4 text-left transition-all",
        selected &&
          "border-transparent bg-lime-300 text-lime-700 shadow-[0_0_20px_rgba(197,254,0,0.18)]",
        !selected && slot.status === "available" && "border-mist-700/10 bg-pitch-950 hover:bg-pitch-700",
        !selected && slot.status === "booked" && "cursor-not-allowed border-transparent bg-pitch-750/40",
        !selected && slot.status === "blocked" && "border-transparent bg-red-400/10",
      )}
    >
      {selected ? (
        <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.24em]">Dipilih</span>
      ) : null}
      <span
        className={cn(
          "mb-1 block text-[10px] font-bold uppercase",
          selected
            ? "text-lime-700"
            : slot.status === "available"
              ? "text-mist-300"
              : "text-mist-300/40 line-through",
        )}
      >
        {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
      </span>
      <span
        className={cn(
          "block font-headline text-lg font-bold",
          selected
            ? "text-lime-700"
            : slot.status === "available"
              ? "text-foreground"
              : "text-mist-300/40 line-through",
        )}
      >
        Rp {slot.price.toLocaleString("id-ID")}
      </span>
    </button>
  );

  return (
    <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="col-span-12 min-w-0 lg:col-span-5">
        <Card className="surface-glow border border-mist-700/10 bg-pitch-950">
          <CardContent className="p-5 sm:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-lime-500">
                  Pilih Tanggal
                </span>
                <h2 className="break-words font-headline text-xl font-bold uppercase sm:text-2xl">
                  {selectedDayLabel}
                </h2>
                <span className="mt-3 inline-flex w-fit rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-lime-100">
                  Date Picker Aktif
                </span>
              </div>

              <div className="relative shrink-0 self-start">
                <input
                  ref={datePickerRef}
                  type="date"
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                  className="pointer-events-none absolute h-0 w-0 opacity-0"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={openDatePicker}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-mist-700/30 transition hover:border-lime-300/50 hover:bg-pitch-900"
                  aria-label="Buka pilihan tanggal"
                >
                  <CalendarDays className="h-5 w-5" />
                </button>
              </div>
            </div>

            {groupedDays.length === 0 ? (
              <div className="rounded-xl border border-dashed border-mist-700/20 bg-pitch-900 px-4 py-8 text-center text-sm text-mist-300">
                Belum ada jadwal yang dibuka.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-start gap-3 rounded-lg border-l-4 border-lime-500 bg-pitch-800/50 p-4 sm:mt-8 sm:gap-4 sm:p-6">
          <Info className="mt-0.5 h-5 w-5 text-lime-500" />
          <p className="text-sm leading-relaxed text-mist-300">
            Jam operasional mengikuti pengaturan admin. Saat ini lapangan dibuka dari{" "}
            <span className="font-bold text-lime-100">{settings.openTime}</span> sampai{" "}
            <span className="font-bold text-lime-100">{settings.closeTime}</span>.
          </p>
        </div>
      </div>

      <div className="col-span-12 min-w-0 space-y-6 sm:space-y-8 lg:col-span-7">
        <div className="flex flex-col gap-3 border-b border-mist-700/20 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col">
            <span className="font-headline text-sm font-bold uppercase tracking-[0.22em] text-lime-500">
              Pilih Jam Main
            </span>
            <h3 className="break-words font-headline text-2xl font-black uppercase tracking-tight sm:text-3xl">
              {selectedDayLabel}
            </h3>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="h-3 w-3 rounded-full bg-pitch-750" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Terisi</span>
            <span className="ml-4 h-3 w-3 rounded-full bg-lime-300" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-mist-300">Dipilih</span>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4">
              <SunMedium className="h-5 w-5 text-mist-300" />
              <h4 className="font-headline text-sm font-bold uppercase tracking-wider">Sesi Pagi</h4>
            </div>
            {morningSlots.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
                {morningSlots.map((slot) => renderSlotCard(slot, selectedSlot?.id === slot.id))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-mist-700/20 px-4 py-5 text-sm text-mist-300">
                Belum ada slot pagi pada tanggal ini.
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4">
              <CalendarDays className="h-5 w-5 text-lime-300" />
              <h4 className="font-headline text-sm font-bold uppercase tracking-wider text-lime-300">
                Jam Favorit
              </h4>
            </div>
            {primeSlots.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
                {primeSlots.map((slot) => renderSlotCard(slot, selectedSlot?.id === slot.id))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-mist-700/20 px-4 py-5 text-sm text-mist-300">
                Belum ada slot favorit pada tanggal ini.
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4">
              <MoonStar className="h-5 w-5 text-mist-300" />
              <h4 className="font-headline text-sm font-bold uppercase tracking-wider">Sesi Malam</h4>
            </div>
            {lateNightSlots.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
                {lateNightSlots.map((slot) => renderSlotCard(slot, selectedSlot?.id === slot.id))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-mist-700/20 px-4 py-5 text-sm text-mist-300">
                Belum ada slot malam pada tanggal ini.
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-4 rounded-lg border border-mist-700/20 bg-pitch-800 p-4 sm:gap-6 sm:p-6 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-col">
            <h5 className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-lime-500">
              Ringkasan Pilihan
            </h5>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span className="font-headline text-base font-bold sm:text-lg">
                {selectedSlot ? "1 Slot Dipilih" : "Belum Ada Slot"}
              </span>
              <span className="text-mist-300">•</span>
              <span className="font-headline text-base font-bold text-lime-100 sm:text-lg">
                {selectedSlot ? `Rp ${selectedSlot.price.toLocaleString("id-ID")}` : "-"}
              </span>
            </div>
          </div>
          <button
            type="button"
            disabled={!selectedSlot || selectedSlot.status !== "available"}
            onClick={() => setIsModalOpen(true)}
            className={cn(buttonVariants({ size: "lg" }), "w-full px-8 py-4 md:w-auto")}
          >
            Lanjut Booking
          </button>
        </div>
      </div>

      {isModalOpen && selectedSlot ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-mist-700/20 bg-pitch-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-mist-700/20 px-6 py-5">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-lime-300">Form Booking</div>
                <div className="mt-2 font-headline text-2xl font-black uppercase">Isi Data Pemesan</div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 hover:bg-pitch-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={createBookingAction} className="space-y-4 p-6">
              <input type="hidden" name="slot_id" value={selectedSlot.id} />
              <input type="hidden" name="slot_label" value={selectedSlotLabel} />
              <input type="hidden" name="pitch_name" value={selectedSlot.pitchName} />
              <input type="hidden" name="base_price" value={selectedSlot.price} />

              <div className="rounded-xl bg-pitch-800 px-4 py-4 text-sm text-mist-300">
                <div className="font-semibold text-foreground">{selectedSlot.pitchName}</div>
                <div className="mt-1">{selectedDayLabel}</div>
                <div>
                  {formatTime(selectedSlot.startAt)} - {formatTime(selectedSlot.endAt)}
                </div>
                <div className="mt-2 font-bold text-lime-100">Rp {selectedSlot.price.toLocaleString("id-ID")}</div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-mist-300">Nama</label>
                <input
                  name="contact_name"
                  required
                  className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  placeholder="Nama lengkap pemesan"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-mist-300">Alamat</label>
                <textarea
                  name="address"
                  required
                  rows={3}
                  className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  placeholder="Alamat lengkap"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-mist-300">No. HP</label>
                <input
                  name="contact_phone"
                  required
                  className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  placeholder="08xxxxxxxxxx"
                />
              </div>

              <div className="rounded-xl border border-lime-300/15 bg-lime-300/10 px-4 py-4 text-sm leading-7 text-mist-100">
                Setelah submit, sistem membuat kode pembayaran unik. Pembayaran dilakukan lewat transfer
                internal dan diverifikasi sistem tanpa pihak ketiga.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
                >
                  Batal
                </button>
                <button type="submit" className={cn(buttonVariants(), "w-full")}>
                  Lanjut ke Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
