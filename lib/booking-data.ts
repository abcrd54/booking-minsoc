export type ScheduleSlotView = {
  id: string;
  pitchName: string;
  startAt: string;
  endAt: string;
  price: number;
  status: "available" | "pending" | "booked" | "blocked";
  notes?: string | null;
};

export type BookingSettings = {
  venueName: string;
  openTime: string;
  closeTime: string;
  mapsCoordinates: string;
  contactPhone: string;
  defaultPrice: number;
  primeStartTime: string;
  primeEndTime: string;
  primePrice: number;
  slotIntervalMinutes: number;
  siteLogoUrl?: string | null;
  faviconUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  googleAnalyticsId?: string | null;
};

export type GalleryItem = {
  id: string;
  title: string;
  imageUrl: string;
  sortOrder: number;
};

export type FacilityItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isFeatured?: boolean;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export const fallbackSettings: BookingSettings = {
  venueName: "Kinetic Turf",
  openTime: "09:00",
  closeTime: "24:00",
  mapsCoordinates: "-6.261493,106.781017",
  contactPhone: "081234567890",
  defaultPrice: 350000,
  primeStartTime: "17:00",
  primeEndTime: "22:00",
  primePrice: 450000,
  slotIntervalMinutes: 60,
  siteLogoUrl: null,
  faviconUrl: null,
  seoTitle: "Kinetic Turf",
  seoDescription: "Booking lapangan mini soccer premium dengan jadwal yang mudah dan cepat.",
  seoKeywords: "booking lapangan, mini soccer, sewa lapangan, futsal, kinetic turf",
  googleAnalyticsId: null,
};

export const fallbackGalleryItems: GalleryItem[] = [
  {
    id: "gallery-1",
    title: "Pertandingan Malam",
    imageUrl:
      "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80",
    sortOrder: 1,
  },
  {
    id: "gallery-2",
    title: "Area Bench Pemain",
    imageUrl:
      "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80",
    sortOrder: 2,
  },
  {
    id: "gallery-3",
    title: "Nuansa Stadion",
    imageUrl:
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
    sortOrder: 3,
  },
];

export const fallbackFacilityItems: FacilityItem[] = [
  {
    id: "facility-featured",
    title: "Lampu Malam Intensitas Tinggi",
    description: "Sistem LED kelas stadion yang meminimalkan bayangan untuk performa maksimal.",
    imageUrl:
      "https://images.unsplash.com/photo-1486286701208-1d58e9338013?auto=format&fit=crop&w=1600&q=80",
    sortOrder: 0,
    isFeatured: true,
  },
  {
    id: "facility-1",
    title: "Parkir Luas",
    description: "Area parkir aman untuk lebih dari 50 kendaraan dan bus tim.",
    imageUrl:
      "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=1200&q=80",
    sortOrder: 1,
  },
  {
    id: "facility-2",
    title: "Ruang Tunggu",
    description: "Ruang tunggu ber-AC dengan jendela langsung ke lapangan.",
    imageUrl:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80",
    sortOrder: 2,
  },
  {
    id: "facility-3",
    title: "Toilet Bersih",
    description: "Toilet dan shower higienis yang siap dipakai setiap hari.",
    imageUrl:
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
    sortOrder: 3,
  },
  {
    id: "facility-4",
    title: "Mushola",
    description: "Ruang ibadah nyaman untuk seluruh pengunjung.",
    imageUrl:
      "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80",
    sortOrder: 4,
  },
  {
    id: "facility-5",
    title: "Kantin Kinetic",
    description: "Isi energi dengan makanan ringan, minuman, dan kopi.",
    imageUrl:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
    sortOrder: 5,
  },
];

export const fallbackFaqItems: FaqItem[] = [
  {
    id: "faq-1",
    question: "Apakah bisa reschedule jadwal?",
    answer: "Ya, admin bisa memindahkan booking sesuai slot kosong yang tersedia setelah pembayaran Midtrans berhasil dan booking dikonfirmasi.",
    sortOrder: 1,
  },
  {
    id: "faq-2",
    question: "Apakah harga sudah termasuk sewa bola?",
    answer: "Harga booking sudah termasuk bola standar pertandingan dan rompi latihan.",
    sortOrder: 2,
  },
  {
    id: "faq-3",
    question: "Bagaimana alur konfirmasi booking?",
    answer: "Customer membayar lewat Midtrans Snap, status pembayaran diperbarui otomatis, lalu admin mengonfirmasi booking di dashboard.",
    sortOrder: 3,
  },
];
