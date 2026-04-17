import { MIDTRANS_PENDING_TIMEOUT_MINUTES } from "@/lib/midtrans";

type FonnteResponse = {
  status?: boolean;
  detail?: string;
  reason?: string;
};

function getFonnteToken() {
  return process.env.FONNTE_TOKEN ?? "";
}

function getAppBaseUrl() {
  const explicitBaseUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;

  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, "")}`;
  }

  return "";
}

export function isFonnteConfigured() {
  return Boolean(getFonnteToken() && getAppBaseUrl());
}

export function buildPaymentUrl(bookingId: string) {
  const baseUrl = getAppBaseUrl();

  if (!baseUrl) {
    throw new Error("Missing APP_BASE_URL or VERCEL_URL for payment link generation.");
  }

  return `${baseUrl}/pembayaran?booking=${encodeURIComponent(bookingId)}`;
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

  const paymentUrl = buildPaymentUrl(input.bookingId);
  const body = new URLSearchParams({
    target: input.contactPhone,
    message: [
      `Halo ${input.contactName},`,
      "",
      "Booking lapangan Anda sudah dibuat dan masih menunggu pembayaran.",
      `Order ID: ${input.orderId}`,
      `Jadwal: ${input.slotLabel}`,
      `Nominal: Rp ${input.amount.toLocaleString("id-ID")}`,
      `Batas pembayaran: ${MIDTRANS_PENDING_TIMEOUT_MINUTES} menit sejak link dibuat.`,
      "",
      "Lanjutkan pembayaran melalui link berikut:",
      paymentUrl,
      "",
      "Jika melewati batas waktu, transaksi dianggap gagal dan slot akan tersedia kembali.",
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
    throw new Error(payload.reason || payload.detail || "Failed to send WhatsApp payment link.");
  }

  return payload;
}
