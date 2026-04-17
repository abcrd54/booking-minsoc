import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  expireMidtransTransaction,
  getMidtransTransactionStatus,
  MIDTRANS_PENDING_TIMEOUT_MINUTES,
  type MidtransStatusResponse,
  verifyMidtransSignature,
} from "@/lib/midtrans";

function getPendingTimeoutThreshold() {
  return new Date(Date.now() - MIDTRANS_PENDING_TIMEOUT_MINUTES * 60 * 1000).toISOString();
}

function isPendingBookingTimedOut(createdAt: string) {
  return new Date(createdAt).getTime() <= Date.now() - MIDTRANS_PENDING_TIMEOUT_MINUTES * 60 * 1000;
}

async function expirePendingBookingRecord(input: {
  bookingId: string;
  slotId: string;
  orderId?: string | null;
  reason: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (input.orderId) {
    try {
      await expireMidtransTransaction(input.orderId);
    } catch {
      // Midtrans may already consider the transaction expired or unavailable.
    }
  }

  await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      payment_status: "kedaluwarsa",
      admin_notes: input.reason,
    })
    .eq("id", input.bookingId);

  await supabase
    .from("schedule_slots")
    .update({
      status: "available",
      notes: null,
    })
    .eq("id", input.slotId);
}

function revalidateBookingSurfaces() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/pembayaran");
  revalidatePath("/payment/finish");
  revalidatePath("/payment/unfinish");
  revalidatePath("/payment/error");
}

function mapMidtransStatusToBooking(payload: MidtransStatusResponse) {
  const transactionStatus = payload.transaction_status ?? "";
  const fraudStatus = payload.fraud_status ?? "";

  if (transactionStatus === "capture" && fraudStatus === "challenge") {
    return {
      bookingStatus: "pending",
      paymentStatus: "menunggu_verifikasi",
      slotStatus: "pending",
      adminNotes: "Menunggu challenge Midtrans",
    } as const;
  }

  if (transactionStatus === "capture" || transactionStatus === "settlement" || transactionStatus === "authorize") {
    return {
      bookingStatus: "confirmed",
      paymentStatus: "terverifikasi",
      slotStatus: "booked",
      adminNotes: "Pembayaran Midtrans berhasil",
    } as const;
  }

  if (transactionStatus === "pending") {
    return {
      bookingStatus: "pending",
      paymentStatus: "menunggu_verifikasi",
      slotStatus: "pending",
      adminNotes: "Menunggu pembayaran Midtrans",
    } as const;
  }

  if (transactionStatus === "expire") {
    return {
      bookingStatus: "cancelled",
      paymentStatus: "kedaluwarsa",
      slotStatus: "available",
      adminNotes: "Pembayaran Midtrans kedaluwarsa",
    } as const;
  }

  return {
    bookingStatus: "cancelled",
    paymentStatus: "ditolak",
    slotStatus: "available",
    adminNotes: "Pembayaran Midtrans ditolak",
  } as const;
}

export function isValidMidtransNotification(payload: MidtransStatusResponse) {
  return Boolean(
    payload.order_id &&
      payload.status_code &&
      payload.gross_amount &&
      payload.signature_key &&
      verifyMidtransSignature({
        orderId: payload.order_id,
        statusCode: payload.status_code,
        grossAmount: payload.gross_amount,
        signatureKey: payload.signature_key,
      }),
  );
}

export async function applyMidtransStatusToBooking(payload: MidtransStatusResponse) {
  if (!payload.order_id) {
    throw new Error("missing_order_id");
  }

  const supabase = createSupabaseAdminClient();
  const update = mapMidtransStatusToBooking(payload);
  const { data: currentBooking, error: currentBookingError } = await supabase
    .from("bookings")
    .select("id, slot_id, created_at, status, payment_status")
    .eq("payment_code", payload.order_id)
    .single();

  if (currentBookingError || !currentBooking) {
    throw new Error("booking_not_found");
  }

  if (
    currentBooking.status === "pending" &&
    currentBooking.payment_status === "menunggu_verifikasi" &&
    isPendingBookingTimedOut(currentBooking.created_at)
  ) {
    await expirePendingBookingRecord({
      bookingId: currentBooking.id,
      slotId: currentBooking.slot_id,
      orderId: payload.order_id,
      reason: `Pembayaran melewati batas ${MIDTRANS_PENDING_TIMEOUT_MINUTES} menit`,
    });
    revalidateBookingSurfaces();
    return;
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .update({
      status: update.bookingStatus,
      payment_status: update.paymentStatus,
      payment_method: payload.payment_type ?? "midtrans_snap",
      admin_notes: update.adminNotes,
    })
    .eq("id", currentBooking.id)
    .select("slot_id")
    .single();

  if (bookingError || !booking) {
    throw new Error("booking_not_found");
  }

  await supabase
    .from("schedule_slots")
    .update({
      status: update.slotStatus,
      notes:
        update.slotStatus === "booked"
          ? "Booking Midtrans terkonfirmasi"
          : update.slotStatus === "pending"
            ? "Menunggu pembayaran Midtrans"
            : null,
    })
    .eq("id", booking.slot_id);

  revalidateBookingSurfaces();
}

export async function syncBookingFromMidtrans(orderId: string) {
  const status = await getMidtransTransactionStatus(orderId);
  await applyMidtransStatusToBooking(status);
  return status;
}

export async function cancelPendingMidtransBooking(bookingId: string, orderId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, slot_id, status, payment_status, payment_method, payment_code")
    .eq("id", bookingId)
    .eq("payment_code", orderId)
    .maybeSingle();

  if (error || !booking) {
    throw new Error("booking_not_found");
  }

  if (booking.status !== "pending" || booking.payment_status !== "menunggu_verifikasi") {
    throw new Error("booking_is_not_pending");
  }

  try {
    await expireMidtransTransaction(orderId);
  } catch {
    // Ignore Midtrans expire errors during manual cancellation.
  }

  const { error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      payment_status: "ditolak",
      admin_notes: "Dibatalkan customer sebelum pembayaran selesai",
    })
    .eq("id", bookingId);

  if (bookingUpdateError) {
    throw new Error("failed_to_cancel_booking");
  }

  await supabase
    .from("schedule_slots")
    .update({
      status: "available",
      notes: null,
    })
    .eq("id", booking.slot_id);

  revalidateBookingSurfaces();
}

export async function syncPendingMidtransBookings() {
  const supabase = createSupabaseAdminClient();
  const { data: pendingBookings } = await supabase
    .from("bookings")
    .select("payment_code")
    .in("status", ["pending", "confirmed"]);

  if (!pendingBookings?.length) {
    return;
  }

  await Promise.all(
    pendingBookings
      .map((booking) => booking.payment_code)
      .filter(Boolean)
      .map(async (paymentCode) => {
        try {
          await syncBookingFromMidtrans(String(paymentCode));
        } catch {
          return null;
        }
      }),
  );
}

export async function expireStalePendingMidtransBookings() {
  const supabase = createSupabaseAdminClient();
  const { data: staleBookings } = await supabase
    .from("bookings")
    .select("id, slot_id, payment_code")
    .eq("status", "pending")
    .eq("payment_status", "menunggu_verifikasi")
    .lte("created_at", getPendingTimeoutThreshold());

  if (!staleBookings?.length) {
    return 0;
  }

  await Promise.all(
    staleBookings.map((booking) =>
      expirePendingBookingRecord({
        bookingId: booking.id,
        slotId: booking.slot_id,
        orderId: booking.payment_code,
        reason: `Pembayaran melewati batas ${MIDTRANS_PENDING_TIMEOUT_MINUTES} menit`,
      }),
    ),
  );

  revalidateBookingSurfaces();

  return staleBookings.length;
}

export async function expirePendingMidtransBooking(bookingId: string, orderId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, slot_id, payment_code, status, payment_status")
    .eq("id", bookingId)
    .eq("payment_code", orderId)
    .maybeSingle();

  if (error || !booking) {
    throw new Error("booking_not_found");
  }

  if (booking.status !== "pending" || booking.payment_status !== "menunggu_verifikasi") {
    return false;
  }

  await expirePendingBookingRecord({
    bookingId: booking.id,
    slotId: booking.slot_id,
    orderId: booking.payment_code,
    reason: `Pembayaran melewati batas ${MIDTRANS_PENDING_TIMEOUT_MINUTES} menit`,
  });

  revalidateBookingSurfaces();

  return true;
}
