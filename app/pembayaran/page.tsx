import Link from "next/link";
import { Copy, Landmark, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PembayaranPageProps = {
  searchParams: Promise<{
    kode?: string;
    slot?: string;
    lapangan?: string;
    nama?: string;
    nominal?: string;
  }>;
};

export default async function PembayaranPage({ searchParams }: PembayaranPageProps) {
  const params = await searchParams;

  const kode = params.kode ?? "-";
  const slot = params.slot ?? "-";
  const lapangan = params.lapangan ?? "-";
  const nama = params.nama ?? "-";
  const nominal = params.nominal ?? "-";

  return (
    <main className="min-h-screen bg-pitch-950 px-6 py-16 text-foreground">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-lime-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-lime-300">
            <ShieldCheck className="h-4 w-4" />
            Pembayaran Internal
          </div>
          <h1 className="font-headline text-4xl font-black uppercase tracking-crushed md:text-6xl">
            Selesaikan Pembayaran
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-mist-300">
            Gunakan kode unik dan nominal transfer unik di bawah ini. Sistem akan mencocokkan transaksi berdasarkan kode dan nominal tanpa payment gateway pihak ketiga.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="surface-glow border border-mist-700/20 bg-pitch-900">
            <CardContent className="space-y-5 p-8">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Nama Pemesan</div>
                <div className="mt-2 font-headline text-2xl font-bold uppercase">{nama}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Lapangan</div>
                <div className="mt-2 text-lg font-semibold">{lapangan}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Slot</div>
                <div className="mt-2 text-lg font-semibold">{slot}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Kode Pembayaran</div>
                <div className="mt-2 rounded-xl bg-pitch-800 px-4 py-4 font-headline text-2xl font-black uppercase text-lime-100">
                  {kode}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Nominal Transfer</div>
                <div className="mt-2 font-headline text-4xl font-black text-lime-100">
                  Rp {Number(nominal).toLocaleString("id-ID")}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-glow border border-mist-700/20 bg-pitch-900">
            <CardContent className="space-y-6 p-8">
              <div className="flex items-center gap-3">
                <Landmark className="h-5 w-5 text-lime-300" />
                <div className="font-headline text-2xl font-black uppercase">Instruksi Pembayaran</div>
              </div>

              <div className="rounded-2xl bg-pitch-800 p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-mist-300">Bank Tujuan</div>
                <div className="mt-2 text-xl font-bold">Bank Kinetic Turf</div>
                <div className="mt-4 text-xs uppercase tracking-[0.24em] text-mist-300">Nomor Rekening</div>
                <div className="mt-2 flex items-center justify-between gap-4 rounded-xl border border-mist-700/20 bg-pitch-950 px-4 py-4">
                  <span className="font-headline text-2xl font-black">8800 1122 3344</span>
                  <Copy className="h-5 w-5 text-lime-300" />
                </div>
                <div className="mt-3 text-sm text-mist-300">a.n. PT Kinetic Turf Indonesia</div>
              </div>

              <div className="space-y-3 text-sm leading-7 text-mist-300">
                <p>1. Transfer tepat sesuai nominal yang ditampilkan, termasuk tiga digit unik di belakang.</p>
                <p>2. Simpan kode pembayaran <span className="font-bold text-lime-100">{kode}</span> sebagai referensi.</p>
                <p>3. Sistem akan menandai pembayaran untuk diverifikasi setelah nominal cocok dengan kode unik transaksi.</p>
                <p>4. Jika dalam 15 menit belum terverifikasi, admin akan melakukan pengecekan manual.</p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
                  Kembali ke Beranda
                </Link>
                <Link href="/login" className={cn(buttonVariants(), "w-full")}>
                  Admin Verifikasi
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
