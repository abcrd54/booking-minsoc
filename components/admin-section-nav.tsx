"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { cn } from "@/lib/utils";

type AdminSectionNavProps = {
  items: Array<{
    id: string;
    label: string;
  }>;
  activeSection: string;
};

export function AdminSectionNav({ items, activeSection }: AdminSectionNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  useEffect(() => {
    setPendingSection(null);
  }, [pathname, searchParams]);

  return (
    <div className="mt-8 space-y-3">
      {items.map((item) => {
        const isActive = activeSection === item.id;
        const isCurrentPending = pendingSection === item.id && isPending;

        return (
          <Link
            key={item.id}
            href={`/admin?section=${item.id}`}
            onClick={(event) => {
              event.preventDefault();
              setPendingSection(item.id);
              startTransition(() => {
                router.push(`/admin?section=${item.id}`);
              });
            }}
            className={cn(
              "block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.22em] transition",
              isActive
                ? "bg-lime-300/12 text-lime-300"
                : "text-mist-300 hover:bg-pitch-800 hover:text-foreground",
              isCurrentPending && "animate-pulse",
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span>{item.label}</span>
              {isCurrentPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            </span>
          </Link>
        );
      })}

      {isPending ? (
        <div className="rounded-xl border border-lime-300/15 bg-lime-300/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-lime-200">
          Memuat section...
        </div>
      ) : null}
    </div>
  );
}
