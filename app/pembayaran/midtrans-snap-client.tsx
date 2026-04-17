"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

type MidtransSnapClientProps = {
  bookingId: string;
  clientKey: string;
  snapToken: string;
  isProduction: boolean;
};

export function MidtransSnapClient({ bookingId, clientKey, snapToken, isProduction }: MidtransSnapClientProps) {
  const router = useRouter();
  const [message, setMessage] = useState("Klik tombol di bawah untuk membuka pembayaran Midtrans Snap.");
  const [isOpening, setIsOpening] = useState(false);

  return (
    <>
      <Script
        src={isProduction ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js"}
        data-client-key={clientKey}
        strategy="afterInteractive"
      />
      <div className="space-y-4">
        <button
          type="button"
          disabled={isOpening}
          onClick={() => {
            if (!window.snap) {
              setMessage("Snap Midtrans belum siap. Coba lagi beberapa detik.");
              return;
            }

            setIsOpening(true);
            window.snap.pay(snapToken, {
              onSuccess: async (result) => {
                setMessage("Pembayaran berhasil. Menyinkronkan status booking...");

                const orderId =
                  typeof result === "object" &&
                  result !== null &&
                  "order_id" in result &&
                  typeof result.order_id === "string"
                    ? result.order_id
                    : undefined;

                try {
                  await fetch("/api/midtrans/success-sync", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      bookingId,
                      orderId,
                    }),
                  });
                } finally {
                  setIsOpening(false);
                  window.location.assign(`/?success=${encodeURIComponent("pembayaran_berhasil")}`);
                }
              },
              onPending: () => {
                setIsOpening(false);
                setMessage("Transaksi dibuat. Silakan selesaikan pembayaran di Midtrans.");
              },
              onError: () => {
                setIsOpening(false);
                setMessage("Pembayaran gagal. Anda bisa coba lagi.");
              },
              onClose: () => {
                setIsOpening(false);
                setMessage("Popup Midtrans ditutup. Anda bisa membukanya lagi kapan saja.");
              },
            });
          }}
          className={cn(buttonVariants(), "w-full")}
        >
          {isOpening ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Membuka Snap...
            </>
          ) : (
            "Bayar Sekarang"
          )}
        </button>
        <div className="rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-4 text-sm leading-7 text-mist-300">
          {message}
        </div>
      </div>
    </>
  );
}
