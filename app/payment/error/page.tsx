import { getPaymentCallbackContext, PaymentStatusPage } from "@/app/payment/shared";

type ErrorPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentErrorPage({ searchParams }: ErrorPageProps) {
  const { bookingHref, orderId } = await getPaymentCallbackContext(searchParams);

  return (
    <PaymentStatusPage
      title="Pembayaran Gagal"
      description="Terjadi kendala saat memproses transaksi Anda. Coba ulang dari halaman pembayaran atau gunakan metode pembayaran lain di Midtrans."
      variant="error"
      bookingHref={bookingHref}
      orderId={orderId}
    />
  );
}
