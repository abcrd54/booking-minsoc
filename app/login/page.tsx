import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  let venueName = "Kinetic Turf";

  if (hasSupabaseEnv) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.from("app_settings").select("venue_name").eq("id", 1).maybeSingle();
      if (data?.venue_name) {
        venueName = data.venue_name;
      }
    } catch {}
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-pitch-950 px-6 py-16 text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(197,254,0,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(157,241,151,0.1),transparent_24%)]" />
      <Card className="surface-glow relative w-full max-w-md border border-mist-700/20 bg-pitch-900">
        <CardContent className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="font-headline text-3xl font-black italic text-lime-300">{venueName.toUpperCase()}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.3em] text-mist-300">Admin Sign In</div>
            </div>
            <ShieldCheck className="h-7 w-7 text-lime-300" />
          </div>

          {!hasSupabaseEnv ? (
            <div className="space-y-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-7 text-amber-100">
              <div>Supabase belum dikonfigurasi.</div>
              <div>Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di `.env.local` dulu.</div>
            </div>
          ) : (
            <form action={loginAction} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  placeholder="admin@kineticturf.com"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-xl border border-mist-700/20 bg-pitch-800 px-4 py-3 outline-none transition focus:border-lime-300/40"
                  placeholder="••••••••"
                />
              </div>
              {params.error ? (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                  {decodeURIComponent(params.error)}
                </div>
              ) : null}
              <button type="submit" className={cn(buttonVariants({ size: "xl" }), "w-full")}>
                <LockKeyhole className="h-4 w-4" />
                Masuk Admin
              </button>
            </form>
          )}

          <div className="mt-6">
            <Link href="/" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
              Kembali ke Landing Page
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
