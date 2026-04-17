"use client";

import { useEffect, useRef, useState } from "react";

type PaymentCountdownProps = {
  bookingId: string;
  orderId: string;
  createdAt: string;
  isActive: boolean;
  timeoutMinutes: number;
};

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PaymentCountdown({ bookingId, orderId, createdAt, isActive, timeoutMinutes }: PaymentCountdownProps) {
  const deadline = new Date(createdAt).getTime() + timeoutMinutes * 60 * 1000;
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      setRemaining(0);
      return;
    }

    const tick = () => {
      const next = Math.max(0, deadline - Date.now());
      setRemaining(next);
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [deadline, isActive]);

  useEffect(() => {
    if (!isActive || remaining > 0 || hasExpiredRef.current) {
      return;
    }

    hasExpiredRef.current = true;

    void fetch("/api/bookings/pending", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookingId,
        orderId,
      }),
    }).finally(() => {
      window.location.reload();
    });
  }, [bookingId, isActive, orderId, remaining]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm text-amber-100">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Batas Pembayaran</div>
      <div className="mt-2 font-headline text-3xl font-black text-foreground">{formatRemaining(remaining)}</div>
      <div className="mt-2 leading-7">
        Selesaikan pembayaran dalam {timeoutMinutes} menit. Setelah waktu habis, transaksi akan di-expire di Midtrans dan slot kembali tersedia.
      </div>
    </div>
  );
}
