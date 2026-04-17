import { NextResponse } from "next/server";

import { syncBookingFromMidtrans } from "@/lib/midtrans-booking";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    bookingId?: string;
    orderId?: string;
  };

  if (!payload.bookingId && !payload.orderId) {
    return NextResponse.json({ message: "invalid_request" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  let orderId = payload.orderId;

  if (!orderId && payload.bookingId) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("payment_code")
      .eq("id", payload.bookingId)
      .maybeSingle();

    orderId = booking?.payment_code ?? undefined;
  }

  if (!orderId) {
    return NextResponse.json({ message: "booking_not_found" }, { status: 404 });
  }

  try {
    await syncBookingFromMidtrans(orderId);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "failed_to_sync_midtrans_success" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
