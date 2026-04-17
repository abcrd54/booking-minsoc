import crypto from "node:crypto";

type MidtransTransactionInput = {
  orderId: string;
  grossAmount: number;
  customer: {
    firstName: string;
    phone: string;
    address: string;
  };
  itemDetails: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
};

export type MidtransStatusResponse = {
  order_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
};

function getMidtransBaseUrl() {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

export function getMidtransClientKey() {
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

  if (!clientKey) {
    throw new Error("Missing NEXT_PUBLIC_MIDTRANS_CLIENT_KEY.");
  }

  return clientKey;
}

function getMidtransServerKey() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey) {
    throw new Error("Missing MIDTRANS_SERVER_KEY.");
  }

  return serverKey;
}

export async function createMidtransSnapTransaction(input: MidtransTransactionInput) {
  const serverKey = getMidtransServerKey();
  const baseUrl = getMidtransBaseUrl();

  const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.grossAmount,
      },
      customer_details: {
        first_name: input.customer.firstName,
        phone: input.customer.phone,
        billing_address: {
          first_name: input.customer.firstName,
          phone: input.customer.phone,
          address: input.customer.address,
        },
      },
      item_details: input.itemDetails,
    }),
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error_messages?.join(", ") || payload.status_message || "Midtrans Snap gagal dibuat.");
  }

  return {
    token: String(payload.token),
    redirectUrl: String(payload.redirect_url),
  };
}

export async function getMidtransTransactionStatus(orderId: string) {
  const serverKey = getMidtransServerKey();
  const baseUrl = process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

  const response = await fetch(`${baseUrl}/v2/${encodeURIComponent(orderId)}/status`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as MidtransStatusResponse;

  if (!response.ok) {
    throw new Error(payload.status_code || "gagal_mengambil_status_midtrans");
  }

  return payload;
}

export function verifyMidtransSignature(input: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}) {
  const serverKey = getMidtransServerKey();
  const expected = crypto
    .createHash("sha512")
    .update(`${input.orderId}${input.statusCode}${input.grossAmount}${serverKey}`)
    .digest("hex");

  return expected === input.signatureKey;
}
