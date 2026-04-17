"use client";

import Script from "next/script";
import { useState } from "react";

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
  clientKey: string;
  snapToken: string;
  isProduction: boolean;
};

export function MidtransSnapClient({ clientKey, snapToken, isProduction }: MidtransSnapClientProps) {
  const [message, setMessage] = useState("Klik tombol di bawah untuk membuka pembayaran Midtrans Snap.");

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
          onClick={() => {
            if (!window.snap) {
              setMessage("Snap Midtrans belum siap. Coba lagi beberapa detik.");
              return;
            }

            window.snap.pay(snapToken, {
              onSuccess: () => setMessage("Pembayaran berhasil. Status booking akan diperbarui otomatis."),
              onPending: () => setMessage("Transaksi dibuat. Silakan selesaikan pembayaran di Midtrans."),
              onError: () => setMessage("Pembayaran gagal. Anda bisa coba lagi."),
              onClose: () => setMessage("Popup Midtrans ditutup. Anda bisa membukanya lagi kapan saja."),
            });
          }}
          className={cn(buttonVariants(), "w-full")}
        >
          Bayar dengan Midtrans
        </button>
        <div className="rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-4 text-sm leading-7 text-mist-300">
          {message}
        </div>
      </div>
    </>
  );
}
