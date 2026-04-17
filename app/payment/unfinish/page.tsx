import { getPaymentCallbackContext, PaymentStatusPage } from "@/app/payment/shared";

type UnfinishPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentUnfinishPage({ searchParams }: UnfinishPageProps) {
  const { bookingHref, orderId } = await getPaymentCallbackContext(searchParams);

  return (
    <PaymentStatusPage
      title="Pembayaran Belum Selesai"
      description="Transaksi sudah dibuat, tetapi pembayaran Anda belum selesai. Anda bisa melanjutkan pembayaran dari halaman booking selama token Midtrans masih aktif."
      variant="pending"
      bookingHref={bookingHref}
      orderId={orderId}
    />
  );
}
