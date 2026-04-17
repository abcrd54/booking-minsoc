"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PaymentStatusVariant = "success" | "pending" | "error";

type PaymentStatusPageProps = {
  title: string;
  description: string;
  variant: PaymentStatusVariant;
  bookingHref?: string | null;
  orderId?: string | null;
};

const variantStyles: Record<
  PaymentStatusVariant,
  {
    badgeClassName: string;
    icon: typeof CheckCircle2;
    label: string;
  }
> = {
  success: {
    badgeClassName: "bg-lime-300/10 text-lime-300",
    icon: CheckCircle2,
    label: "Pembayaran Berhasil",
  },
  pending: {
    badgeClassName: "bg-amber-300/10 text-amber-300",
    icon: Clock3,
    label: "Pembayaran Menunggu",
  },
  error: {
    badgeClassName: "bg-red-400/10 text-red-200",
    icon: AlertTriangle,
    label: "Pembayaran Bermasalah",
  },
};

export function PaymentStatusPage({
  title,
  description,
  variant,
  bookingHref,
  orderId,
}: PaymentStatusPageProps) {
  const config = variantStyles[variant];
  const Icon = config.icon;

  return (
    <main className="min-h-screen bg-pitch-950 px-6 py-16 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Card className="surface-glow border border-mist-700/20 bg-pitch-900">
          <CardContent className="space-y-6 p-8 text-center">
            <div
              className={cn(
                "mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em]",
                config.badgeClassName,
              )}
            >
              <Icon className="h-4 w-4" />
              {config.label}
            </div>

            <div className="space-y-3">
              <h1 className="font-headline text-3xl font-black uppercase md:text-5xl">{title}</h1>
              <p className="mx-auto max-w-2xl text-mist-300">{description}</p>
            </div>

            {orderId ? (
              <div className="rounded-xl bg-pitch-800 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Order ID</div>
                <div className="mt-2 font-headline text-xl font-black uppercase text-lime-100">{orderId}</div>
              </div>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row">
              {bookingHref ? (
                <Link href={bookingHref} className={cn(buttonVariants(), "w-full")}>
                  Lihat Pembayaran
                </Link>
              ) : null}
              <Link
                href="/"
                className={cn(buttonVariants({ variant: bookingHref ? "secondary" : "default" }), "w-full")}
              >
                Kembali ke Beranda
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
