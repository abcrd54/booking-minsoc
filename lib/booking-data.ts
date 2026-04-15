export type ScheduleSlotView = {
  id: string;
  pitchName: string;
  startAt: string;
  endAt: string;
  price: number;
  status: "available" | "booked" | "blocked";
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

export const fallbackScheduleSlots: ScheduleSlotView[] = [
  {
    id: "slot-2026-04-15-09",
    pitchName: "Lapangan Utama",
    startAt: "2026-04-15T09:00:00+07:00",
    endAt: "2026-04-15T10:00:00+07:00",
    price: 350000,
    status: "available",
  },
  {
    id: "slot-2026-04-15-10",
    pitchName: "Lapangan Utama",
    startAt: "2026-04-15T10:00:00+07:00",
    endAt: "2026-04-15T11:00:00+07:00",
    price: 350000,
    status: "booked",
  },
  {
    id: "slot-2026-04-15-19",
    pitchName: "Lapangan Utama",
    startAt: "2026-04-15T19:00:00+07:00",
    endAt: "2026-04-15T20:00:00+07:00",
    price: 500000,
    status: "available",
  },
  {
    id: "slot-2026-04-15-20",
    pitchName: "Lapangan Utama",
    startAt: "2026-04-15T20:00:00+07:00",
    endAt: "2026-04-15T21:00:00+07:00",
    price: 500000,
    status: "booked",
  },
  {
    id: "slot-2026-04-16-09",
    pitchName: "Lapangan Utama",
    startAt: "2026-04-16T09:00:00+07:00",
    endAt: "2026-04-16T10:00:00+07:00",
    price: 350000,
    status: "available",
  },
  {
    id: "slot-2026-04-16-18",
    pitchName: "Lapangan Utama",
    startAt: "2026-04-16T18:00:00+07:00",
    endAt: "2026-04-16T19:00:00+07:00",
    price: 500000,
    status: "blocked",
    notes: "Turnamen internal",
  },
  {
    id: "slot-2026-04-17-21",
    pitchName: "Lapangan Utama",
    startAt: "2026-04-17T21:00:00+07:00",
    endAt: "2026-04-17T22:00:00+07:00",
    price: 500000,
    status: "available",
  },
  {
    id: "slot-2026-04-18-22",
    pitchName: "Lapangan Utama",
    startAt: "2026-04-18T22:00:00+07:00",
    endAt: "2026-04-18T23:00:00+07:00",
    price: 500000,
    status: "available",
  },
];
