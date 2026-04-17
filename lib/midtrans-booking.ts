import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMidtransTransactionStatus, type MidtransStatusResponse, verifyMidtransSignature } from "@/lib/midtrans";

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

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .update({
      status: update.bookingStatus,
      payment_status: update.paymentStatus,
      payment_method: payload.payment_type ?? "midtrans_snap",
      admin_notes: update.adminNotes,
    })
    .eq("payment_code", payload.order_id)
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
}

export async function syncBookingFromMidtrans(orderId: string) {
  const status = await getMidtransTransactionStatus(orderId);
  await applyMidtransStatusToBooking(status);
  return status;
}

export async function syncPendingMidtransBookings() {
  const supabase = createSupabaseAdminClient();
  const { data: pendingBookings } = await supabase
    .from("bookings")
    .select("payment_code")
    .eq("payment_method", "midtrans_snap")
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
