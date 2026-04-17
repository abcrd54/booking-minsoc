"use client";

import { useEffect } from "react";

import {
  isPendingPaymentStatus,
  PENDING_PAYMENT_STORAGE_KEY,
  type PendingPaymentSnapshot,
} from "@/lib/pending-payment-storage";

type PaymentReminderSyncProps = PendingPaymentSnapshot;

export function PaymentReminderSync(props: PaymentReminderSyncProps) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isPendingPaymentStatus(props.paymentStatus, props.bookingStatus)) {
      window.localStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(props));
      return;
    }

    window.localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
  }, [props]);

  return null;
}
