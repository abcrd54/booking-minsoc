import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  MapPin,
  Star,
} from "lucide-react";

import { LandingNav } from "@/components/landing-nav";
import { BookingCalendarVirtual } from "@/components/booking-calendar-virtual";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  fallbackFacilityItems,
  fallbackGalleryItems,
  fallbackSettings,
  type BookingSettings,
  type FacilityItem,
  type GalleryItem,
  type ScheduleSlotView,
} from "@/lib/booking-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    quote:
      "Rumputnya beda banget sama lapangan lain. Empuk dan gripnya enak buat sprint. Lampunya juga terang parah!",
    name: "Rizky Darmadi",
    role: "Kapten, FC Nusantara",
    initials: "RD",
  },
  {
    quote:
      "Booking lewat web gampang banget, tinggal klik jadwal beres. Kantinnya juga makanannya enak buat nongkrong abis main.",
    name: "Sarah Meira",
    role: "Influencer Olahraga",
    initials: "SM",
  },
  {
    quote:
      "Terbaik di Jakarta Selatan sih. Fasilitas mandinya bersih, parkir gak ribet. Definisi premium mini soccer.",
    name: "Bagus Adrian",
    role: "Pemain Rekreasi",
    initials: "BA",
  },
];

const faqs = [
  {
    question: "Apakah bisa reschedule jadwal?",
    answer:
      "Ya, reschedule dapat dilakukan maksimal 24 jam sebelum jadwal main dengan menghubungi admin via WhatsApp.",
  },
  {
    question: "Apakah harga sudah termasuk sewa bola?",
    answer:
      "Setiap booking lapangan sudah mendapatkan peminjaman 2 bola standar FIFA dan 1 set rompi (bibs).",
  },
  {
    question: "Berapa kapasitas pemain per tim?",
    answer:
      "Lapangan kami didesain untuk format 7vs7 atau 8vs8 untuk kenyamanan maksimal.",
  },
];

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Venue", href: "#facilities" },
  { label: "Jadwal", href: "#pricing" },
  { label: "Galeri", href: "#gallery" },
  { label: "Ulasan", href: "#reviews" },
  { label: "FAQ", href: "#faq" },
];

async function getBookingCalendarData() {
  if (!hasSupabaseEnv) {
    return {
      settings: fallbackSettings,
      slots: [],
      galleryItems: fallbackGalleryItems,
      facilityItems: fallbackFacilityItems,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const [settingsResult, slotsResult, bookingsResult, galleryResult, facilitiesResult] = await Promise.all([
      supabase
        .from("app_settings")
        .select("venue_name, open_time, close_time, maps_coordinates, contact_phone, default_price, prime_start_time, prime_end_time, prime_price, slot_interval_minutes")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("schedule_slots")
        .select("id, pitch_name, start_at, end_at, price, status, notes")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(5000),
      supabase
        .from("bookings")
        .select("slot_id, status, payment_status")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("site_gallery").select("id, title, image_url, sort_order").order("sort_order", { ascending: true }),
      supabase
        .from("facility_items")
        .select("id, title, description, image_url, sort_order, is_featured")
        .order("sort_order", { ascending: true }),
    ]);

    const settings: BookingSettings =
      settingsResult.data
        ? {
            venueName: settingsResult.data.venue_name,
            openTime: settingsResult.data.open_time,
            closeTime: settingsResult.data.close_time,
            mapsCoordinates: settingsResult.data.maps_coordinates,
            contactPhone: settingsResult.data.contact_phone,
            defaultPrice: settingsResult.data.default_price,
            primeStartTime: settingsResult.data.prime_start_time,
            primeEndTime: settingsResult.data.prime_end_time,
            primePrice: settingsResult.data.prime_price,
            slotIntervalMinutes: settingsResult.data.slot_interval_minutes,
          }
        : fallbackSettings;

    const bookedSlotIds = new Set(
      (bookingsResult.data ?? [])
        .map((booking) => booking.slot_id)
        .filter((slotId): slotId is string => Boolean(slotId)),
    );

    const slots: ScheduleSlotView[] =
      slotsResult.data?.map((slot) => ({
        id: slot.id,
        pitchName: slot.pitch_name,
        startAt: slot.start_at,
        endAt: slot.end_at,
        price: slot.price,
        status: bookedSlotIds.has(slot.id) ? "booked" : slot.status,
        notes: slot.notes,
      })) ?? [];

    const galleryItems: GalleryItem[] =
      galleryResult.data?.map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.image_url,
        sortOrder: item.sort_order,
      })) ?? [];

    const facilityItems: FacilityItem[] =
      facilitiesResult.data?.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: item.image_url,
        sortOrder: item.sort_order,
        isFeatured: item.is_featured,
      })) ?? [];

    return {
      settings,
      slots,
      galleryItems,
      facilityItems,
    };
  } catch {
    return {
      settings: fallbackSettings,
      slots: [],
      galleryItems: fallbackGalleryItems,
      facilityItems: fallbackFacilityItems,
    };
  }
}

export default async function HomePage() {
  const bookingCalendarData = await getBookingCalendarData();
  const featuredFacility =
    bookingCalendarData.facilityItems.find((item) => item.isFeatured) ?? bookingCalendarData.facilityItems[0];
  const regularFacilities = bookingCalendarData.facilityItems.filter((item) => item.id !== featuredFacility?.id);
  const mapQuery = encodeURIComponent(bookingCalendarData.settings.mapsCoordinates);
  const mapEmbedUrl = bookingCalendarData.settings.mapsCoordinates.startsWith("http")
    ? bookingCalendarData.settings.mapsCoordinates
    : `https://www.google.com/maps?q=${mapQuery}&z=15&output=embed`;

  return (
    <main className="overflow-x-hidden bg-pitch-950 text-foreground">
      <LandingNav brandName={bookingCalendarData.settings.venueName} items={navItems} />

      <section
        id="home"
        className="relative flex min-h-screen items-center overflow-hidden px-4 pt-36 md:px-6 lg:px-12"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,254,0,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(157,241,151,0.14),transparent_30%)]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60 grayscale transition duration-1000 hover:grayscale-0"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBnIF7CLPM-Djb0udnYI9dj72LQexkpMEGFrCbkfyqAAlF_qQK7HBjeWXCQL2d9s7PJPt1Hzvf81oTLf_oAUFvvzKu7liP4-XGbm_e9khtx9MZZxgSlazPdaCect-NCqsEuQF4xQrNfQEZXL99ZZRSL1Xnabj4P8TSjfd2FRU7MuMlC5STfTer0Vu-CwUaUQ_Yv2DsaQPmtN4q_lsJhVyj806GiTgDHxYCFYbdXT_rdr3Hns_L8Soi6GEWuGoEc-KPcFpS_NuFW038')",
          }}
        />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="relative z-10 mx-auto flex w-full max-w-[1600px] items-end justify-between gap-10">
          <div className="max-w-5xl">
            <h1 className="reveal-up reveal-delay-1 break-words font-headline text-4xl font-black uppercase leading-[0.9] tracking-crushed sm:text-6xl lg:text-8xl">
              Booking Lapangan <span className="italic text-lime-100">Mini Soccer</span> Jadi Lebih Mudah
            </h1>
            <p className="reveal-up reveal-delay-2 mt-8 max-w-xl text-lg font-medium leading-relaxed text-mist-300 md:text-xl">
              Rasakan atmosfer pertandingan malam di lapangan mini soccer premium dengan pencahayaan
              profesional, fasilitas lengkap, dan booking tanpa ribet.
            </p>
            <div className="reveal-up reveal-delay-3 mt-10 flex flex-col gap-4 sm:flex-row">
              <a href="#pricing" className={cn(buttonVariants({ size: "xl" }), "text-lg")}>
                Cek Jadwal
                <ArrowRight className="h-5 w-5" />
              </a>
              <a href="#facilities" className={cn(buttonVariants({ variant: "secondary", size: "xl" }), "text-lg")}>
                Lihat Fasilitas
              </a>
            </div>
          </div>
          <div className="absolute bottom-10 left-6 hidden flex-col items-center gap-2 opacity-50 lg:left-12 xl:flex">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.35em] text-mist-300/60">
              Gulir ke Bawah
            </span>
            <div className="h-16 w-px bg-lime-300/80" />
          </div>
        </div>
      </section>

      <section id="facilities" className="bg-pitch-950 px-4 py-20 md:px-6 lg:px-12">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-16">
            <span className="mb-4 block font-headline text-sm uppercase tracking-[0.4em] text-lime-300">
              Fasilitas Premium
            </span>
            <h2 className="font-headline text-4xl font-extrabold uppercase tracking-crushed md:text-5xl">
              Fasilitas Kelas Atas
            </h2>
          </div>
          <div className="grid auto-rows-[220px] grid-cols-1 gap-4 md:auto-rows-[260px] md:grid-cols-12">
            {featuredFacility ? (
              <Card className="surface-glow group relative overflow-hidden md:col-span-8 md:row-span-2">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-55 transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${featuredFacility.imageUrl}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pitch-950 via-pitch-950/20 to-transparent" />
                <CardContent className="relative flex h-full flex-col justify-end p-8">
                  <h3 className="font-headline text-3xl font-bold uppercase text-lime-100">
                    {featuredFacility.title}
                  </h3>
                  <p className="mt-2 max-w-md text-mist-300">{featuredFacility.description}</p>
                </CardContent>
              </Card>
            ) : null}

            {regularFacilities.map((facility, index) => (
              <Card
                key={facility.id}
                className={cn(
                  "surface-glow group relative overflow-hidden transition-all hover:-translate-y-1 md:col-span-4",
                  index === 0 && "border-l-2 border-lime-300",
                )}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-35 transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${facility.imageUrl}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pitch-950 via-pitch-950/70 to-pitch-950/35" />
                <CardContent className="relative flex h-full flex-col justify-end p-8">
                  <h3 className="font-headline text-xl font-bold uppercase">{facility.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-mist-300">{facility.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative bg-pitch-900 px-4 py-20 md:px-6 lg:px-12">
        <div className="pointer-events-none absolute right-0 top-0 hidden overflow-hidden text-[12rem] font-black leading-none text-white/5 lg:block">
          JADWAL
        </div>
        <div className="mx-auto max-w-[1600px]">
          <div className="relative z-10 mb-16 text-center">
            <span className="mb-4 block font-headline text-sm uppercase tracking-[0.4em] text-lime-300">
              Pilih Jadwal Main
            </span>
            <h2 className="font-headline text-4xl font-extrabold uppercase tracking-crushed md:text-5xl">
              Cek Ketersediaan Lapangan
            </h2>
            <p className="mt-4 text-mist-300">Pilih tanggal, tentukan jam main, lalu lanjutkan booking.</p>
          </div>
          <BookingCalendarVirtual settings={bookingCalendarData.settings} slots={bookingCalendarData.slots} />
        </div>
      </section>

      <section id="gallery" className="bg-pitch-900 px-4 py-20 md:px-6 lg:px-12">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-16">
            <span className="mb-4 block font-headline text-sm uppercase tracking-[0.4em] text-lime-300">
              Galeri Venue
            </span>
            <h2 className="font-headline text-4xl font-extrabold uppercase tracking-crushed md:text-5xl">
              Suasana Lapangan
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {bookingCalendarData.galleryItems.map((item, index) => (
              <Card
                key={item.id}
                className={cn(
                  "surface-glow group relative overflow-hidden",
                  index === 0 ? "md:col-span-2" : "md:col-span-1",
                )}
              >
                <div
                  className="h-[240px] bg-cover bg-center transition-transform duration-700 group-hover:scale-105 sm:h-[300px]"
                  style={{ backgroundImage: `url('${item.imageUrl}')` }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-pitch-950 to-transparent p-6">
                  <h3 className="font-headline text-2xl font-bold uppercase text-lime-100">{item.title}</h3>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="reviews" className="bg-pitch-950 px-4 py-20 md:px-6 lg:px-12">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="mb-4 block font-headline text-sm uppercase tracking-[0.4em] text-lime-300">
                Cerita Pemain
              </span>
              <h2 className="font-headline text-4xl font-extrabold uppercase tracking-crushed md:text-5xl">
                Testimoni Lapangan
              </h2>
            </div>
            <div className="flex gap-4">
              <a
                href="#review-1"
                className={cn(buttonVariants({ variant: "secondary", size: "icon" }))}
                aria-label="Ke testimoni pertama"
              >
                <ArrowRight className="h-5 w-5 rotate-180" />
              </a>
              <a
                href="#review-3"
                className={cn(buttonVariants({ size: "icon" }))}
                aria-label="Ke testimoni terakhir"
              >
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={testimonial.name}
                id={`review-${index + 1}`}
                className={cn(
                  "surface-glow min-w-[280px] max-w-[320px] shrink-0 scroll-mt-32 transition-transform duration-300 hover:-translate-y-1 sm:min-w-[320px] sm:max-w-[400px]",
                  index % 2 === 0 ? "bg-pitch-900" : "bg-pitch-800",
                )}
              >
                <CardContent className="p-8 md:p-10">
                  <div className="mb-6 flex gap-1 text-lime-300">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mb-8 text-xl italic leading-8 text-foreground">{`"${testimonial.quote}"`}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-lime-300 bg-pitch-800 font-headline font-bold text-lime-300">
                      {testimonial.initials}
                    </div>
                    <div>
                      <div className="font-headline text-base font-bold uppercase">{testimonial.name}</div>
                      <div className="text-xs uppercase tracking-[0.18em] text-mist-300">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-pitch-900 px-4 py-20 md:px-6 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-16 text-center font-headline text-4xl font-extrabold uppercase tracking-crushed md:text-5xl">
            Pertanyaan Umum
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                className="surface-glow group overflow-hidden border-b border-mist-700/20 bg-pitch-800"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-lg font-semibold marker:content-none">
                  <span>{faq.question}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-sm leading-7 text-mist-300">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="location" className="relative overflow-hidden bg-pitch-750">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 grayscale"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA4g9z4QBs3gLxLcDV9ZV8CNO-ZGbsoZfr2AErVi0K4lMoZEyR1ri2I_45byaciNGxUhl-4kzwqYtgD3U6xR3myzmONKkDOYq0QxJXLzxJqgZzVYT7r3R_KfbleCaMuM8tmrhs_k007JLPq4ScruNn4XjN4lZPT_jFwxbuyJ4xDNzVcIKnNl1qaE00gTtLiZ360csth8GbKiEY7o5Pe5aNPuR5UCjRd4GsSZmJOnumna2rhgCF-rkKTZwC_rvYDGwDxcpPrXYg6nDU')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-pitch-950/85 via-pitch-950/35 to-pitch-950/85" />
        <div className="relative mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-12 md:px-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-center lg:px-12">
          <Card className="surface-glow order-2 w-full border-l-4 border-lime-300 bg-pitch-950 shadow-stadium lg:order-1">
            <CardContent className="p-8">
              <h3 className="mb-4 font-headline text-2xl font-black uppercase">Lokasi</h3>
              <p className="mb-6 break-words leading-8 text-mist-300">
                {bookingCalendarData.settings.venueName.toUpperCase()}
                <br />
                Koordinat Maps: {bookingCalendarData.settings.mapsCoordinates}
                <br />
                Hubungi: {bookingCalendarData.settings.contactPhone}
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants())}
                >
                  <MapPin className="h-4 w-4" />
                  Buka Rute
                </a>
                <a
                  href={`https://wa.me/${bookingCalendarData.settings.contactPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "secondary" }))}
                >
                  Hubungi Admin
                </a>
              </div>
            </CardContent>
          </Card>

          <div className="order-1 min-w-0 lg:order-2">
            <div className="surface-glow overflow-hidden rounded-2xl border border-mist-700/20 bg-pitch-950 shadow-stadium">
              <div className="flex items-center justify-between gap-4 border-b border-mist-700/20 px-4 py-4 sm:px-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-lime-300">Peta Lokasi</div>
                  <div className="mt-1 text-sm text-mist-300">Peta otomatis dari Setelan Situs</div>
                </div>
                <div className="relative hidden h-12 w-12 items-center justify-center sm:flex">
                  <div className="absolute inset-0 animate-ping rounded-full bg-lime-300/20" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-lime-300 shadow-lime">
                    <MapPin className="h-6 w-6 text-lime-700" />
                  </div>
                </div>
              </div>
              <div className="aspect-[4/5] w-full sm:aspect-[16/10] lg:aspect-[16/9]">
                <iframe
                  title="Peta lokasi lapangan"
                  src={mapEmbedUrl}
                  className="h-full w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-pitch-950 to-stone-950 px-4 py-24 text-center md:px-6 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-300/50 to-transparent" />
        <div className="mx-auto max-w-4xl">
          <h2 className="font-headline text-5xl font-black uppercase italic tracking-crushed md:text-7xl lg:text-8xl">
            Siap Main?
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-mist-300 md:text-xl">
            Jangan sampai kehabisan slot. Booking sekarang dan kuasai lapangan malam ini.
          </p>
          <div className="mt-12 flex flex-col justify-center gap-4 sm:flex-row">
            <a href="#pricing" className={cn(buttonVariants({ size: "xl" }), "px-12 text-base")}>
              Booking Sekarang
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-stone-950 px-4 py-16 md:px-6 lg:px-12">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-8 md:flex-row">
          <div className="text-center md:text-left">
            <Link href="/" className="font-headline text-xl font-bold italic text-foreground">
              {bookingCalendarData.settings.venueName.toUpperCase()}
            </Link>
            <div className="mt-4 text-xs uppercase tracking-[0.3em] text-mist-300/70">
              Hak cipta 2026 Kinetic Turf. Seluruh hak dilindungi.
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs uppercase tracking-[0.3em] text-mist-300/80">
            <a href="#pricing">Booking</a>
            <a href="#faq">FAQ</a>
            <a href="#location">Lokasi</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
