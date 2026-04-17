"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
};

type LandingNavProps = {
  brandName: string,
  brandLogoUrl?: string | null,
  items: NavItem[];
};

export function LandingNav({ brandName, brandLogoUrl, items }: LandingNavProps) {
  const [activeHref, setActiveHref] = useState(items[0]?.href ?? "#home");

  useEffect(() => {
    const sections = items
      .map((item) => {
        const element = document.querySelector<HTMLElement>(item.href);
        return element ? { href: item.href, element } : null;
      })
      .filter((item): item is { href: string; element: HTMLElement } => Boolean(item));

    const updateActiveSection = () => {
      const activationLine = 180;
      const current =
        sections.find((section) => {
          const rect = section.element.getBoundingClientRect();
          return rect.top <= activationLine && rect.bottom > activationLine;
        }) ??
        sections.findLast((section) => section.element.getBoundingClientRect().top <= activationLine);

      if (current) {
        setActiveHref(current.href);
        return;
      }

      if (window.scrollY < 120 && items[0]) {
        setActiveHref(items[0].href);
      }
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("hashchange", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("hashchange", updateActiveSection);
    };
  }, [items]);

  return (
    <nav className="glass-nav fixed inset-x-0 top-0 z-50 bg-stone-950/80 shadow-2xl shadow-lime-900/10">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-4 px-4 py-4 md:px-6 lg:px-12">
        <div className="relative flex w-full items-center justify-center">
          <Link
            href="/"
            className="shrink-0 text-center font-headline text-xl font-black italic tracking-tight text-lime-300 md:text-2xl"
          >
            {brandLogoUrl ? (
              <img
                src={brandLogoUrl}
                alt={brandName}
                className="h-12 w-auto max-w-[180px] object-contain md:h-14 md:max-w-[220px]"
              />
            ) : (
              brandName.toUpperCase()
            )}
          </Link>
        </div>

        <div className="no-scrollbar flex w-full justify-center gap-2 overflow-x-auto md:gap-6">
          {items.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setActiveHref(item.href)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 font-headline text-xs font-medium uppercase tracking-tight transition-colors md:border-0 md:px-0 md:py-0 md:text-sm",
                activeHref === item.href
                  ? "border-lime-300 bg-lime-300/10 text-lime-300 md:border-b-2 md:border-lime-300 md:bg-transparent md:pb-1"
                  : "border-mist-700/20 text-mist-300 hover:text-stone-100",
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
