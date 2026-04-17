import { NextResponse } from "next/server";

import {
  cancelPendingMidtransBooking,
  expirePendingMidtransBooking,
  expireStalePendingMidtransBookings,
  syncBookingFromMidtrans,
} from "@/lib/midtrans-booking";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type PendingPaymentSnapshot } from "@/lib/pending-payment-storage";

function toSnapshot(booking: {
  id: string;
  payment_code: string | null;
  contact_name: string | null;
  transfer_amount: number | null;
  payment_status: string;
  status: string;
  updated_at: string;
  schedule_slots:
    | {
        start_at: string;
        end_at: string;
      }
    | {
        start_at: string;
        end_at: string;
      }[]
    | null;
}) {
  const slot = Array.isArray(booking.schedule_slots) ? booking.schedule_slots[0] : booking.schedule_slots;
  let slotLabel = "Slot booking";

  if (slot?.start_at) {
    const startLabel = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date(slot.start_at));
    const endLabel = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date(slot.end_at));

    slotLabel = `${startLabel} - ${endLabel}`;
  }

  return {
    bookingId: booking.id,
    orderId: booking.payment_code ?? "",
    contactName: booking.contact_name ?? "Pemesan",
    slotLabel,
    amount: booking.transfer_amount ?? 0,
    paymentStatus: booking.payment_status,
    bookingStatus: booking.status,
    updatedAt: booking.updated_at,
  } satisfies PendingPaymentSnapshot;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("booking");
  const orderId = searchParams.get("order_id");

  if (!bookingId || !orderId) {
    return NextResponse.json({ booking: null }, { status: 400 });
  }

  await expireStalePendingMidtransBookings();

  const supabase = createSupabaseAdminClient();
  let { data: booking } = await supabase
    .from("bookings")
    .select("id, payment_code, contact_name, transfer_amount, payment_status, status, updated_at, payment_method, schedule_slots(start_at, end_at)")
    .eq("id", bookingId)
    .eq("payment_code", orderId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ booking: null }, { status: 404 });
  }

  try {
    await syncBookingFromMidtrans(orderId);
    const refreshed = await supabase
      .from("bookings")
      .select("id, payment_code, contact_name, transfer_amount, payment_status, status, updated_at, payment_method, schedule_slots(start_at, end_at)")
      .eq("id", bookingId)
      .eq("payment_code", orderId)
      .maybeSingle();

    booking = refreshed.data ?? booking;
  } catch {
    // Fall back to current database state when Midtrans sync is unavailable.
  }

  return NextResponse.json({ booking: toSnapshot(booking) });
}

export async function DELETE(request: Request) {
  const payload = (await request.json()) as {
    bookingId?: string;
    orderId?: string;
  };

  if (!payload.bookingId || !payload.orderId) {
    return NextResponse.json({ message: "invalid_request" }, { status: 400 });
  }

  try {
    await cancelPendingMidtransBooking(payload.bookingId, payload.orderId);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "failed_to_cancel_booking" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    bookingId?: string;
    orderId?: string;
  };

  if (!payload.bookingId || !payload.orderId) {
    return NextResponse.json({ message: "invalid_request" }, { status: 400 });
  }

  try {
    const expired = await expirePendingMidtransBooking(payload.bookingId, payload.orderId);
    return NextResponse.json({ ok: true, expired });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "failed_to_expire_booking" },
      { status: 400 },
    );
  }
}
