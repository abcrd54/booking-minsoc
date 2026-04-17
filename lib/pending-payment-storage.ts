export const PENDING_PAYMENT_STORAGE_KEY = "minsoc_pending_payment";

export type PendingPaymentSnapshot = {
  bookingId: string;
  orderId: string;
  contactName: string;
  slotLabel: string;
  amount: number;
  paymentStatus: string;
  bookingStatus: string;
  updatedAt: string;
};

export function isPendingPaymentStatus(paymentStatus: string, bookingStatus: string) {
  return paymentStatus === "menunggu_verifikasi" && bookingStatus === "pending";
}
