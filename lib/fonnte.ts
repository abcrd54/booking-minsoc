import { MIDTRANS_PENDING_TIMEOUT_MINUTES } from "@/lib/midtrans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type FonnteResponse = {
  status?: boolean;
  detail?: string;
  reason?: string;
  id?: string[] | string;
  target?: string;
};

function getFonnteToken() {
  return process.env.FONNTE_TOKEN ?? "";
}

export function isFonnteConfigured() {
  return Boolean(getFonnteToken());
}

async function getSiteName() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("app_settings")
      .select("venue_name")
      .eq("id", 1)
      .maybeSingle();

    return data?.venue_name?.trim() || "Kinetic Turf";
  } catch {
    return "Kinetic Turf";
  }
}

export function normalizePhoneForWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("62")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  return digits;
}

export async function sendPaymentLinkWhatsApp(input: {
  bookingId: string;
  orderId: string;
  contactName: string;
  contactPhone: string;
  amount: number;
  slotLabel: string;
}) {
  const token = getFonnteToken();

  if (!token) {
    throw new Error("Missing FONNTE_TOKEN.");
  }

  const normalizedPhone = normalizePhoneForWhatsApp(input.contactPhone);
  const siteName = await getSiteName();

  if (!normalizedPhone) {
    throw new Error("Invalid contact phone for Fonnte.");
  }

  const body = new URLSearchParams({
    target: normalizedPhone,
    message: [
      `Halo ${input.contactName},`,
      `**${siteName}**`,
      "",
      "Booking berhasil dibuat.",
      `Kode booking: ${input.orderId}`,
      `Detail booking: ${input.slotLabel}`,
      `Total pembayaran: Rp ${input.amount.toLocaleString("id-ID")}`,
      `Batas pembayaran: ${MIDTRANS_PENDING_TIMEOUT_MINUTES} menit.`,
      "",
      "Silakan lanjutkan pembayaran dari halaman website menggunakan kode booking tersebut.",
    ].join("\n"),
    countryCode: "62",
    preview: "false",
  });

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json()) as FonnteResponse;

  if (!response.ok || payload.status === false) {
    const error = new Error(payload.reason || payload.detail || "Failed to send WhatsApp payment link.");

    console.error("Fonnte send failed", {
      bookingId: input.bookingId,
      orderId: input.orderId,
      rawPhone: input.contactPhone,
      normalizedPhone,
      httpStatus: response.status,
      payload,
    });

    throw error;
  }

  console.info("Fonnte send success", {
    bookingId: input.bookingId,
    orderId: input.orderId,
    rawPhone: input.contactPhone,
    normalizedPhone,
    payload,
  });

  return payload;
}

export async function sendPaymentSuccessWhatsApp(input: {
  bookingId: string;
  orderId: string;
  contactName: string;
  contactPhone: string;
  slotLabel: string;
  amount: number;
}) {
  const token = getFonnteToken();

  if (!token) {
    throw new Error("Missing FONNTE_TOKEN.");
  }

  const normalizedPhone = normalizePhoneForWhatsApp(input.contactPhone);
  const siteName = await getSiteName();

  if (!normalizedPhone) {
    throw new Error("Invalid contact phone for Fonnte.");
  }

  const body = new URLSearchParams({
    target: normalizedPhone,
    message: [
      `Halo ${input.contactName},`,
      `**${siteName}**`,
      "",
      "Pembayaran booking Anda berhasil diterima.",
      `Kode booking: ${input.orderId}`,
      `Detail booking: ${input.slotLabel}`,
      `Total pembayaran: Rp ${input.amount.toLocaleString("id-ID")}`,
      "",
      "Booking Anda sudah terkonfirmasi. Sampai jumpa di lapangan.",
    ].join("\n"),
    countryCode: "62",
    preview: "false",
  });

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json()) as FonnteResponse;

  if (!response.ok || payload.status === false) {
    console.error("Fonnte payment success send failed", {
      bookingId: input.bookingId,
      orderId: input.orderId,
      rawPhone: input.contactPhone,
      normalizedPhone,
      httpStatus: response.status,
      payload,
    });

    throw new Error(payload.reason || payload.detail || "Failed to send WhatsApp payment success.");
  }

  console.info("Fonnte payment success send success", {
    bookingId: input.bookingId,
    orderId: input.orderId,
    rawPhone: input.contactPhone,
    normalizedPhone,
    payload,
  });

  return payload;
}
