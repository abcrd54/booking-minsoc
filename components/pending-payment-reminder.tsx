"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  isPendingPaymentStatus,
  PENDING_PAYMENT_STORAGE_KEY,
  type PendingPaymentSnapshot,
} from "@/lib/pending-payment-storage";
import { cn } from "@/lib/utils";

type ReminderState =
  | ({ active: true } & PendingPaymentSnapshot)
  | {
      active: false;
    };

function readStoredReminder() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingPaymentSnapshot;
  } catch {
    window.localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
    return null;
  }
}

function clearStoredReminder() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
  }
}

export function PendingPaymentReminder() {
  const [reminder, setReminder] = useState<ReminderState>({ active: false });
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function syncReminder() {
      const stored = readStoredReminder();

      if (!stored) {
        if (isMounted) {
          setReminder({ active: false });
        }
        return;
      }

      try {
        const params = new URLSearchParams({
          booking: stored.bookingId,
          order_id: stored.orderId,
        });
        const response = await fetch(`/api/bookings/pending?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          clearStoredReminder();
          if (isMounted) {
            setReminder({ active: false });
          }
          return;
        }

        const payload = (await response.json()) as { booking: PendingPaymentSnapshot | null };

        if (!payload.booking || !isPendingPaymentStatus(payload.booking.paymentStatus, payload.booking.bookingStatus)) {
          clearStoredReminder();
          if (isMounted) {
            setReminder({ active: false });
          }
          return;
        }

        window.localStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(payload.booking));

        if (isMounted) {
          setReminder({ active: true, ...payload.booking });
          setIsDismissed(false);
        }
      } catch {
        if (isMounted) {
          setReminder({ active: true, ...stored });
        }
      }
    }

    void syncReminder();
    window.addEventListener("focus", syncReminder);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", syncReminder);
    };
  }, []);

  async function handleCancel() {
    if (!reminder.active || isCancelling) {
      return;
    }

    setIsCancelling(true);

    try {
      const response = await fetch("/api/bookings/pending", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: reminder.bookingId,
          orderId: reminder.orderId,
        }),
      });

      if (!response.ok) {
        setIsCancelling(false);
        return;
      }

      clearStoredReminder();
      setReminder({ active: false });
    } catch {
      setIsCancelling(false);
      return;
    }

    setIsCancelling(false);
  }

  if (!reminder.active || isDismissed) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[80] sm:left-auto sm:right-6 sm:w-full sm:max-w-md">
      <Card className="surface-glow border border-amber-300/20 bg-pitch-900 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
        <CardContent className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-amber-300/10 text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">Pembayaran Pending</div>
                <div className="mt-1 font-headline text-xl font-black uppercase text-foreground">
                  Lanjutkan pembayaran
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="rounded-full p-2 text-mist-300 transition hover:bg-pitch-800 hover:text-foreground"
              aria-label="Tutup pengingat pembayaran"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 text-sm leading-7 text-mist-300">
            <p>Booking atas nama {reminder.contactName} masih menunggu pembayaran.</p>
            <p>{reminder.slotLabel}</p>
            <p className="font-semibold text-lime-100">Rp {reminder.amount.toLocaleString("id-ID")}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/pembayaran?booking=${encodeURIComponent(reminder.bookingId)}`}
              className={cn(buttonVariants(), "w-full whitespace-normal px-4 text-center text-[11px] tracking-[0.14em] sm:text-sm sm:tracking-[0.22em]")}
            >
              <CreditCard className="h-4 w-4" />
              Bayar Sekarang
            </Link>
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={isCancelling}
              className={cn(buttonVariants({ variant: "secondary" }), "w-full whitespace-normal px-4 text-center text-[11px] tracking-[0.14em] sm:text-sm sm:tracking-[0.22em]")}
            >
              {isCancelling ? "Membatalkan..." : "Batalkan Booking"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
