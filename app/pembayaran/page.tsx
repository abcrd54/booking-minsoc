import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";

import { MidtransSnapClient } from "@/app/pembayaran/midtrans-snap-client";
import { PaymentCountdown } from "@/app/pembayaran/payment-countdown";
import { PaymentReminderSync } from "@/app/pembayaran/payment-reminder-sync";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMidtransClientKey, MIDTRANS_PENDING_TIMEOUT_MINUTES } from "@/lib/midtrans";
import { expireStalePendingMidtransBookings, syncBookingFromMidtrans } from "@/lib/midtrans-booking";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

type PembayaranPageProps = {
  searchParams: Promise<{
    booking?: string;
    paid?: string;
  }>;
};

export default async function PembayaranPage({ searchParams }: PembayaranPageProps) {
  const params = await searchParams;
  const bookingId = params.booking ?? "";
  const isPaidSuccess = params.paid === "success";

  if (!bookingId) {
    return (
      <main className="min-h-screen bg-pitch-950 px-6 py-16 text-foreground">
        <div className="mx-auto max-w-3xl">
          <Card className="surface-glow border border-mist-700/20 bg-pitch-900">
            <CardContent className="space-y-6 p-8 text-center">
              <h1 className="font-headline text-3xl font-black uppercase">Booking tidak ditemukan</h1>
              <Link href="/" className={cn(buttonVariants())}>
                Kembali ke Beranda
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const supabase = createSupabaseAdminClient();
  const clientKey = getMidtransClientKey();
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  await expireStalePendingMidtransBookings();
  let { data: booking } = await supabase
    .from("bookings")
    .select("id, team_name, contact_name, payment_code, transfer_amount, payment_status, payment_token, payment_method, status, created_at, schedule_slots(pitch_name, start_at, end_at, price)")
    .eq("id", bookingId)
    .maybeSingle();

  if (booking?.payment_code && booking.payment_method === "midtrans_snap") {
    try {
      await syncBookingFromMidtrans(booking.payment_code);
      const refreshed = await supabase
        .from("bookings")
        .select("id, team_name, contact_name, payment_code, transfer_amount, payment_status, payment_token, payment_method, status, created_at, schedule_slots(pitch_name, start_at, end_at, price)")
        .eq("id", bookingId)
        .maybeSingle();

      booking = refreshed.data ?? booking;
    } catch {
      // Keep existing booking data when Midtrans status sync is unavailable.
    }
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-pitch-950 px-6 py-16 text-foreground">
        <div className="mx-auto max-w-3xl">
          <Card className="surface-glow border border-mist-700/20 bg-pitch-900">
            <CardContent className="space-y-6 p-8 text-center">
              <h1 className="font-headline text-3xl font-black uppercase">Data pembayaran tidak ditemukan</h1>
              <Link href="/" className={cn(buttonVariants())}>
                Kembali ke Beranda
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const slot = Array.isArray(booking.schedule_slots) ? booking.schedule_slots[0] : booking.schedule_slots;
  const slotLabel = slot?.start_at
    ? new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }).format(new Date(slot.start_at))
    : "-";
  const endTime = slot?.end_at
    ? new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }).format(new Date(slot.end_at))
    : "-";
  const reminderSlotLabel = `${slotLabel} - ${endTime}`;
  const isExpiredState = booking.payment_status === "kedaluwarsa" || booking.status === "cancelled";
  const pageTitle = isPaidSuccess
    ? "Pembayaran Berhasil"
    : isExpiredState
      ? "Pembayaran Gagal"
      : "Selesaikan Pembayaran";
  const pageDescription = isPaidSuccess
    ? "Booking berhasil dibuat. Silakan kembali ke beranda sambil menunggu status pembayaran dikonfirmasi otomatis oleh Midtrans."
    : isExpiredState
      ? `Waktu pembayaran sudah lewat ${MIDTRANS_PENDING_TIMEOUT_MINUTES} menit. Booking dianggap gagal dan slot sudah tersedia kembali.`
      : "Buka popup Midtrans Snap untuk memilih metode pembayaran. Status pembayaran akan diperbarui otomatis setelah Midtrans mengirim notifikasi.";

  return (
    <main className="min-h-screen bg-pitch-950 px-6 py-16 text-foreground">
      <PaymentReminderSync
        bookingId={booking.id}
        orderId={booking.payment_code ?? ""}
        contactName={booking.contact_name}
        slotLabel={reminderSlotLabel}
        amount={Number(booking.transfer_amount ?? slot?.price ?? 0)}
        paymentStatus={booking.payment_status}
        bookingStatus={booking.status}
        updatedAt={new Date().toISOString()}
      />
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-lime-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-lime-300">
            <ShieldCheck className="h-4 w-4" />
            Midtrans Snap
          </div>
          <h1 className="font-headline text-4xl font-black uppercase tracking-crushed md:text-6xl">
            {pageTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-mist-300">
            {pageDescription}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="surface-glow border border-mist-700/20 bg-pitch-900">
            <CardContent className="space-y-5 p-8">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Nama Pemesan</div>
                <div className="mt-2 font-headline text-2xl font-bold uppercase">{booking.contact_name}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Lapangan</div>
                <div className="mt-2 text-lg font-semibold">{slot?.pitch_name ?? "Lapangan Utama"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Slot</div>
                <div className="mt-2 text-lg font-semibold">{slotLabel} - {endTime}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Order ID</div>
                <div className="mt-2 rounded-xl bg-pitch-800 px-4 py-4 font-headline text-xl font-black uppercase text-lime-100">
                  {booking.payment_code}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Nominal</div>
                <div className="mt-2 font-headline text-4xl font-black text-lime-100">
                  Rp {Number(booking.transfer_amount ?? slot?.price ?? 0).toLocaleString("id-ID")}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Status Pembayaran</div>
                <div className="mt-2 text-lg font-semibold uppercase">{booking.payment_status}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-glow border border-mist-700/20 bg-pitch-900">
            <CardContent className="space-y-6 p-8">
              <div className="font-headline text-2xl font-black uppercase">
                {isPaidSuccess ? "Status Booking" : isExpiredState ? "Pembayaran Ditutup" : "Pembayaran Midtrans"}
              </div>

              <div className="space-y-3 text-sm leading-7 text-mist-300">
                <p>1. Klik tombol pembayaran untuk membuka Midtrans Snap.</p>
                <p>2. Pilih metode pembayaran yang tersedia di Midtrans.</p>
                <p>3. Selesaikan pembayaran maksimal dalam {MIDTRANS_PENDING_TIMEOUT_MINUTES} menit.</p>
                <p>4. Setelah pembayaran sukses, status booking akan diperbarui otomatis dari Midtrans.</p>
              </div>

              {isPaidSuccess ? (
                <div className="rounded-xl border border-lime-300/20 bg-lime-300/10 px-4 py-4 text-sm text-lime-100">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-lime-300/12 text-lime-300">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-lime-300">Booking Berhasil</div>
                      <div className="mt-2 leading-7">
                        Booking berhasil, silakan kembali ke beranda. Status akan diperbarui otomatis setelah konfirmasi Midtrans masuk.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <PaymentCountdown
                  bookingId={booking.id}
                  orderId={booking.payment_code ?? ""}
                  createdAt={booking.created_at}
                  isActive={booking.status === "pending" && booking.payment_status === "menunggu_verifikasi"}
                  timeoutMinutes={MIDTRANS_PENDING_TIMEOUT_MINUTES}
                />
              )}

              {booking.payment_token && booking.status === "pending" && booking.payment_status === "menunggu_verifikasi" ? (
                <MidtransSnapClient bookingId={booking.id} clientKey={clientKey} snapToken={booking.payment_token} isProduction={isProduction} />
              ) : booking.payment_status === "kedaluwarsa" || booking.status === "cancelled" ? (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-4 text-sm text-red-100">
                  Waktu pembayaran sudah lewat {MIDTRANS_PENDING_TIMEOUT_MINUTES} menit. Booking ini dianggap gagal dan slot sudah tersedia kembali.
                </div>
              ) : (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-4 text-sm text-red-100">
                  Token pembayaran Midtrans belum tersedia.
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
                  Kembali ke Beranda
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
