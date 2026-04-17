import { PaymentStatusPage } from "@/app/payment/_components/payment-status-page";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { syncBookingFromMidtrans } from "@/lib/midtrans-booking";

type PaymentCallbackParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getPaymentCallbackContext(searchParams: Promise<PaymentCallbackParams>) {
  const params = await searchParams;
  const orderId = getSingleParam(params.order_id) ?? getSingleParam(params.orderId) ?? null;

  let bookingHref: string | null = null;

  if (!orderId || !hasSupabaseEnv) {
    return { bookingHref, orderId };
  }

  try {
    await syncBookingFromMidtrans(orderId);
  } catch {
    // Keep rendering the callback page even if Midtrans sync fails.
  }

  const supabase = createSupabaseAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("payment_code", orderId)
    .maybeSingle();

  if (booking?.id) {
    bookingHref = `/pembayaran?booking=${encodeURIComponent(booking.id)}`;
  }

  return { bookingHref, orderId };
}

export { PaymentStatusPage };
