import { NextResponse } from "next/server";

import { applyMidtransStatusToBooking, isValidMidtransNotification } from "@/lib/midtrans-booking";

type MidtransNotificationPayload = {
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as MidtransNotificationPayload;

  if (!isValidMidtransNotification(payload)) {
    return NextResponse.json({ message: "invalid_signature" }, { status: 401 });
  }

  try {
    await applyMidtransStatusToBooking(payload);
  } catch {
    return NextResponse.json({ message: "booking_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
