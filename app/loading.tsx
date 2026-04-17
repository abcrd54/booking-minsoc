export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-pitch-950 px-6 text-foreground">
      <div className="relative flex flex-col items-center gap-8">
        <div className="absolute h-40 w-40 rounded-full bg-lime-300/10 blur-3xl" />

        <div className="relative flex items-center justify-center">
          <div className="h-28 w-28 animate-spin rounded-full border-2 border-lime-300/15 border-t-lime-300" />
          <div className="absolute h-16 w-16 rounded-full border border-lime-300/30 bg-pitch-900/80" />
          <div className="absolute h-3 w-3 animate-pulse rounded-full bg-lime-300 shadow-[0_0_24px_rgba(197,254,0,0.55)]" />
        </div>

        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[0.35em] text-lime-300">Loading Route</div>
          <div className="mt-3 font-headline text-3xl font-black uppercase tracking-crushed">
            Menyiapkan Halaman
          </div>
          <div className="mt-3 max-w-sm text-sm leading-7 text-mist-300">
            Mohon tunggu sebentar. Data booking dan pembayaran sedang dimuat.
          </div>
        </div>
      </div>
    </main>
  );
}
