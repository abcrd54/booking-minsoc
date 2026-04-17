import { getPaymentCallbackContext, PaymentStatusPage } from "@/app/payment/shared";

type FinishPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentFinishPage({ searchParams }: FinishPageProps) {
  const { bookingHref, orderId } = await getPaymentCallbackContext(searchParams);

  return (
    <PaymentStatusPage
      title="Pembayaran Selesai"
      description="Transaksi Anda sudah diterima. Status booking akan diperbarui otomatis setelah konfirmasi dari Midtrans selesai diproses."
      variant="success"
      bookingHref={bookingHref}
      orderId={orderId}
    />
  );
}
