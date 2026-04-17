"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

import { cn } from "@/lib/utils";

type FlashToastState =
  | {
      kind: "success" | "error";
      message: string;
    }
  | null;

export function FlashToast() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<FlashToastState>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      setToast({
        kind: "success",
        message: decodeURIComponent(success),
      });
      return;
    }

    if (error) {
      setToast({
        kind: "error",
        message: decodeURIComponent(error),
      });
      return;
    }

    setToast(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3800);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) {
    return null;
  }

  const isSuccess = toast.kind === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;

  return (
    <div className="pointer-events-none fixed right-4 top-5 z-[110] w-[calc(100%-2rem)] max-w-md sm:right-6 sm:top-6">
      <div
        className={cn(
          "pointer-events-auto animate-[toast-in_0.28s_ease-out] rounded-2xl border px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl",
          isSuccess
            ? "border-lime-300/20 bg-pitch-900/95 text-lime-100"
            : "border-red-400/20 bg-pitch-900/95 text-red-100",
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              isSuccess ? "bg-lime-300/12 text-lime-300" : "bg-red-400/12 text-red-300",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.24em]",
                isSuccess ? "text-lime-300" : "text-red-300",
              )}
            >
              {isSuccess ? "Berhasil Disimpan" : "Terjadi Kendala"}
            </div>
            <div className="mt-1 text-sm leading-6 text-foreground">{toast.message}</div>
          </div>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-full p-1.5 text-mist-300 transition hover:bg-pitch-800 hover:text-foreground"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
