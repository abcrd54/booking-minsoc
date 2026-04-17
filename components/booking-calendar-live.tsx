"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Info, MoonStar, SunMedium, X } from "lucide-react";

import { createBookingAction } from "@/app/booking/actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import type { BookingSettings, ScheduleSlotView } from "@/lib/booking-data";
import { getSlotIsoRange, getSlotPrice, getSlotWindows } from "@/lib/slot-utils";
import { cn } from "@/lib/utils";

type BookingCalendarProps = {
  settings: BookingSettings;
  slots: ScheduleSlotView[];
};

type CalendarCell = {
  date: Date;
  dayKey: string;
  isCurrentMonth: boolean;
};

const weekdayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function getSlotMapKey(startAt: string, endAt: string) {
  return `${new Date(startAt).toISOString()}|${new Date(endAt).toISOString()}`;
}

function formatDayKey(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
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

function getSlotHourInJakarta(value: string) {
  return new Date(value).getUTCHours() + 7;
}

export function BookingCalendarLive({ settings, slots }: BookingCalendarProps) {
  const todayDayKey = useMemo(() => formatDayKey(new Date().toISOString()), []);
  const [selectedDay, setSelectedDay] = useState(todayDayKey);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() => getMonthStart(parseDayKey(todayDayKey)));
  const datePickerRef = useRef<HTMLDivElement>(null);

  const existingSlotMap = useMemo(() => {
    const map = new Map<string, ScheduleSlotView>();
    slots.forEach((slot) => {
      map.set(getSlotMapKey(slot.startAt, slot.endAt), slot);
    });
    return map;
  }, [slots]);

  const slotWindows = useMemo(
    () =>
      getSlotWindows({
        openTime: settings.openTime,
        closeTime: settings.closeTime,
        slotIntervalMinutes: settings.slotIntervalMinutes,
      }),
    [settings.closeTime, settings.openTime, settings.slotIntervalMinutes],
  );

  const activeDaySlots = useMemo(() => {
    return slotWindows.map((window) => {
      const { startAt, endAt } = getSlotIsoRange(selectedDay, window.startTime, window.endTime);
      const existingSlot = existingSlotMap.get(getSlotMapKey(startAt, endAt));

      return (
        existingSlot ?? {
          id: `virtual:${selectedDay}:${window.startTime}`,
          pitchName: "Lapangan Utama",
          startAt,
          endAt,
          price: getSlotPrice(window.startTime, {
            defaultPrice: settings.defaultPrice,
            primeStartTime: settings.primeStartTime,
            primeEndTime: settings.primeEndTime,
            primePrice: settings.primePrice,
          }),
          status: "available" as const,
          notes: null,
        }
      );
    });
  }, [
    existingSlotMap,
    selectedDay,
    settings.defaultPrice,
    settings.primeEndTime,
    settings.primePrice,
    settings.primeStartTime,
    slotWindows,
  ]);

  const visibleSlots = useMemo(() => {
    const now = Date.now();
    return activeDaySlots.filter((slot) => {
      if (selectedDay !== todayDayKey) {
        return true;
      }
      return new Date(slot.startAt).getTime() >= now;
    });
  }, [activeDaySlots, selectedDay, todayDayKey]);

  const selectedSlot =
    visibleSlots.find((slot) => slot.id === selectedSlotId && slot.status === "available") ??
    visibleSlots.find((slot) => slot.status === "available") ??
    visibleSlots[0];
  const calendarCells = useMemo(() => getCalendarCells(displayMonth), [displayMonth]);

  useEffect(() => {
    const nextAvailableSlot = visibleSlots.find((slot) => slot.status === "available") ?? visibleSlots[0];
    setSelectedSlotId(nextAvailableSlot?.id ?? "");
  }, [visibleSlots]);

  useEffect(() => {
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

  const morningSlots = visibleSlots.filter((slot) => getSlotHourInJakarta(slot.startAt) < 12);
  const afternoonSlots = visibleSlots.filter((slot) => {
    const hour = getSlotHourInJakarta(slot.startAt);
    return hour >= 12 && hour < 17;
  });
  const primeSlots = visibleSlots.filter((slot) => {
    const hour = getSlotHourInJakarta(slot.startAt);
    return hour >= 17 && hour < 22;
  });
  const lateNightSlots = visibleSlots.filter((slot) => getSlotHourInJakarta(slot.startAt) >= 22);

  const selectedDayLabel = formatFullDayLabelFromDayKey(selectedDay);
  const selectedSlotLabel = selectedSlot
    ? `${selectedDayLabel} | ${formatTime(selectedSlot.startAt)} - ${formatTime(selectedSlot.endAt)}`
    : "";

  const renderSlotCard = (slot: ScheduleSlotView, selected = false) => (
    <button
      key={slot.id}
      type="button"
      disabled={slot.status !== "available"}
      onClick={() => setSelectedSlotId(slot.id)}
      className={cn(
        "relative rounded-lg border p-4 text-left transition-all",
        selected &&
          slot.status === "available" &&
          "border-transparent bg-lime-300 text-lime-700 shadow-[0_0_20px_rgba(197,254,0,0.18)]",
        !selected && slot.status === "available" && "border-mist-700/10 bg-pitch-950 hover:bg-pitch-700",
        !selected && slot.status === "pending" && "cursor-not-allowed border-transparent bg-amber-300/10",
        !selected && slot.status === "booked" && "cursor-not-allowed border-transparent bg-pitch-750/40",
        !selected && slot.status === "blocked" && "border-transparent bg-red-400/10",
      )}
    >
      {selected && slot.status === "available" ? (
        <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.24em]">Dipilih</span>
      ) : null}
      {slot.status === "pending" ? (
        <span className="absolute right-3 top-3 rounded-full border border-amber-300/20 bg-amber-400 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-pitch-950">
          Pending
        </span>
      ) : null}
      {slot.status === "booked" ? (
        <span className="absolute right-3 top-3 rounded-full border border-red-300/20 bg-red-400 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white">
          Booked
        </span>
      ) : null}
      {slot.status === "blocked" ? (
        <span className="absolute right-3 top-3 rounded-full border border-red-300/20 bg-red-950 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-red-100">
          Ditutup
        </span>
      ) : null}
      <span
        className={cn(
          "mb-1 block pr-16 text-[10px] font-bold uppercase",
          selected && slot.status === "available"
            ? "text-lime-700"
            : slot.status === "available"
              ? "text-mist-300"
              : slot.status === "pending"
                ? "text-amber-100/80"
                : "text-mist-300/50 line-through",
        )}
      >
        {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
      </span>
      <span
        className={cn(
          "block pr-16 font-headline text-lg font-bold",
          selected && slot.status === "available"
            ? "text-lime-700"
            : slot.status === "available"
              ? "text-foreground"
              : slot.status === "pending"
                ? "text-amber-100"
                : "text-mist-300/50 line-through",
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
                <span className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-lime-500">Pilih Tanggal</span>
                <h2 className="break-words font-headline text-xl font-bold uppercase sm:text-2xl">{selectedDayLabel}</h2>
              </div>

              <div ref={datePickerRef} className="relative w-full shrink-0 self-start sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen((current) => !current)}
                  className="group flex w-full min-w-[220px] items-center justify-between gap-3 rounded-2xl border border-mist-700/20 bg-[linear-gradient(180deg,rgba(21,21,21,0.98),rgba(10,10,10,0.94))] px-4 py-3 text-left shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition hover:border-lime-300/35 hover:shadow-[0_22px_60px_rgba(197,254,0,0.08)] sm:w-auto"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lime-300/20 bg-lime-300/10 text-lime-300">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-300/80">Tanggal Main</div>
                      <div className="truncate font-headline text-sm font-bold uppercase text-foreground">{selectedDayLabel}</div>
                    </div>
                  </div>
                  <div className="rounded-full border border-mist-700/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-mist-300 transition group-hover:border-lime-300/30 group-hover:text-lime-100">
                    Ubah
                  </div>
                </button>

                {isDatePickerOpen ? (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-full min-w-[290px] max-w-[360px] rounded-[28px] border border-mist-700/20 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(8,8,8,0.98))] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:w-[360px]">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <button type="button" onClick={() => setDisplayMonth((current) => addMonths(current, -1))} className="flex h-10 w-10 items-center justify-center rounded-full border border-mist-700/20 bg-pitch-900 text-mist-300 transition hover:border-lime-300/35 hover:text-lime-100">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="text-center">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-300/80">Kalender Booking</div>
                        <div className="mt-1 font-headline text-lg font-bold uppercase text-foreground">{formatMonthLabel(displayMonth)}</div>
                      </div>
                      <button type="button" onClick={() => setDisplayMonth((current) => addMonths(current, 1))} className="flex h-10 w-10 items-center justify-center rounded-full border border-mist-700/20 bg-pitch-900 text-mist-300 transition hover:border-lime-300/35 hover:text-lime-100">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {weekdayLabels.map((label) => (
                        <div key={label} className="pb-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-mist-300/70">
                          {label}
                        </div>
                      ))}
                      {calendarCells.map((cell) => {
                        const isSelected = cell.dayKey === selectedDay;
                        const isPastDay = cell.dayKey < todayDayKey;

                        return (
                          <button
                            key={cell.dayKey}
                            type="button"
                            disabled={isPastDay}
                            onClick={() => {
                              setSelectedDay(cell.dayKey);
                              setIsDatePickerOpen(false);
                            }}
                            className={cn(
                              "flex aspect-square items-center justify-center rounded-2xl border text-sm font-bold transition",
                              isPastDay && "cursor-not-allowed border-transparent text-mist-300/20",
                              isSelected && "border-transparent bg-lime-300 text-lime-700 shadow-[0_10px_30px_rgba(197,254,0,0.2)]",
                              !isSelected && !isPastDay && cell.isCurrentMonth && "border-lime-300/20 bg-lime-300/10 text-lime-100 hover:border-lime-300/40 hover:bg-lime-300/15",
                              !cell.isCurrentMonth && !isPastDay && "border-transparent text-mist-300/45",
                            )}
                          >
                            {cell.date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-mist-700/20 bg-pitch-900 px-4 py-4 text-sm text-mist-300">
              Semua tanggal mulai hari ini ke depan otomatis kosong. Slot akan berubah menjadi pending saat customer mengirim booking, lalu menjadi booked setelah pembayaran terverifikasi dan admin mengonfirmasi.
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-start gap-3 rounded-lg border-l-4 border-lime-500 bg-pitch-800/50 p-4 sm:mt-8 sm:gap-4 sm:p-6">
          <Info className="mt-0.5 h-5 w-5 text-lime-500" />
          <p className="text-sm leading-relaxed text-mist-300">
            Jam operasional mengikuti pengaturan admin. Saat ini lapangan dibuka dari <span className="font-bold text-lime-100">{settings.openTime}</span> sampai <span className="font-bold text-lime-100">{settings.closeTime}</span>.
          </p>
        </div>
      </div>

      <div className="col-span-12 min-w-0 space-y-6 sm:space-y-8 lg:col-span-7">
        <div className="flex flex-col gap-3 border-b border-mist-700/20 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col">
            <span className="font-headline text-sm font-bold uppercase tracking-[0.22em] text-lime-500">Pilih Jam Main</span>
            <h3 className="break-words font-headline text-2xl font-black uppercase tracking-tight sm:text-3xl">{selectedDayLabel}</h3>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4"><SunMedium className="h-5 w-5 text-mist-300" /><h4 className="font-headline text-sm font-bold uppercase tracking-wider">Sesi Pagi</h4></div>
            {morningSlots.length > 0 ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">{morningSlots.map((slot) => renderSlotCard(slot, selectedSlot?.id === slot.id))}</div> : <div className="rounded-xl border border-dashed border-mist-700/20 px-4 py-5 text-sm text-mist-300">Belum ada slot pagi pada tanggal ini.</div>}
          </section>
          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4"><CalendarDays className="h-5 w-5 text-mist-100" /><h4 className="font-headline text-sm font-bold uppercase tracking-wider text-mist-100">Sesi Sore</h4></div>
            {afternoonSlots.length > 0 ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">{afternoonSlots.map((slot) => renderSlotCard(slot, selectedSlot?.id === slot.id))}</div> : <div className="rounded-xl border border-dashed border-mist-700/20 px-4 py-5 text-sm text-mist-300">Belum ada slot sore pada tanggal ini.</div>}
          </section>
          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4"><CalendarDays className="h-5 w-5 text-lime-300" /><h4 className="font-headline text-sm font-bold uppercase tracking-wider text-lime-300">Jam Favorit</h4></div>
            {primeSlots.length > 0 ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">{primeSlots.map((slot) => renderSlotCard(slot, selectedSlot?.id === slot.id))}</div> : <div className="rounded-xl border border-dashed border-mist-700/20 px-4 py-5 text-sm text-mist-300">Belum ada slot favorit pada tanggal ini.</div>}
          </section>
          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4"><MoonStar className="h-5 w-5 text-mist-300" /><h4 className="font-headline text-sm font-bold uppercase tracking-wider">Sesi Malam</h4></div>
            {lateNightSlots.length > 0 ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">{lateNightSlots.map((slot) => renderSlotCard(slot, selectedSlot?.id === slot.id))}</div> : <div className="rounded-xl border border-dashed border-mist-700/20 px-4 py-5 text-sm text-mist-300">Belum ada slot malam pada tanggal ini.</div>}
          </section>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-4 rounded-lg border border-mist-700/20 bg-pitch-800 p-4 sm:gap-6 sm:p-6 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-col">
            <h5 className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-lime-500">Ringkasan Pilihan</h5>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span className="font-headline text-base font-bold sm:text-lg">{selectedSlot ? "1 Slot Dipilih" : "Belum Ada Slot"}</span>
              <span className="text-mist-300">•</span>
              <span className="font-headline text-base font-bold text-lime-100 sm:text-lg">{selectedSlot ? `Rp ${selectedSlot.price.toLocaleString("id-ID")}` : "-"}</span>
            </div>
          </div>
          <button type="button" disabled={!selectedSlot || selectedSlot.status !== "available"} onClick={() => setIsModalOpen(true)} className={cn(buttonVariants({ size: "lg" }), "w-full px-8 py-4 md:w-auto")}>Lanjut Booking</button>
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
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-full p-2 hover:bg-pitch-800"><X className="h-5 w-5" /></button>
            </div>

            <form action={createBookingAction} className="space-y-4 p-6">
              <input type="hidden" name="slot_id" value={selectedSlot.id} />
              <input type="hidden" name="slot_label" value={selectedSlotLabel} />
              <input type="hidden" name="pitch_name" value={selectedSlot.pitchName} />
              <input type="hidden" name="base_price" value={selectedSlot.price} />
              <input type="hidden" name="start_at" value={selectedSlot.startAt} />
              <input type="hidden" name="end_at" value={selectedSlot.endAt} />

              <div className="rounded-xl bg-pitch-800 px-4 py-4 text-sm text-mist-300">
                <div className="font-semibold text-foreground">{selectedSlot.pitchName}</div>
                <div className="mt-1">{selectedDayLabel}</div>
                <div>{formatTime(selectedSlot.startAt)} - {formatTime(selectedSlot.endAt)}</div>
                <div className="mt-2 font-bold text-lime-100">Rp {selectedSlot.price.toLocaleString("id-ID")}</div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-mist-300">Nama</label>
                <input name="contact_name" required className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40" placeholder="Nama lengkap pemesan" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-mist-300">Alamat</label>
                <textarea name="address" required rows={3} className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40" placeholder="Alamat lengkap" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-mist-300">No. HP</label>
                <input name="contact_phone" required className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40" placeholder="08xxxxxxxxxx" />
              </div>

              <div className="rounded-xl border border-lime-300/15 bg-lime-300/10 px-4 py-4 text-sm leading-7 text-mist-100">
                Setelah submit, sistem akan membuka Midtrans Snap agar customer bisa langsung memilih metode pembayaran.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => setIsModalOpen(false)} className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>Batal</button>
                <SubmitButton className="w-full" pendingText="Membuat booking...">Bayar Sekarang</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
