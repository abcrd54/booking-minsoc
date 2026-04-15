"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { getSlotIsoRange, getSlotPrice } from "@/lib/slot-utils";

async function fileToDataUrl(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
}

export async function createScheduleAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const slotDate = String(formData.get("slot_date") ?? "").trim();
  const slotWindow = String(formData.get("slot_window") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();

  if (!slotDate || !slotWindow) {
    redirect("/admin?error=invalid_schedule_input");
  }

  if ((contactName || address || contactPhone) && (!contactName || !address || !contactPhone)) {
    redirect("/admin?error=manual_booking_data_incomplete");
  }

  const [startTimeRaw, endTimeRaw] = slotWindow.split(" - ");
  const startTime = startTimeRaw?.trim();
  const endTime = endTimeRaw?.trim();

  if (!startTime || !endTime) {
    redirect("/admin?error=invalid_schedule_window");
  }

  const { data: settings, error: settingsError } = await supabase
    .from("app_settings")
    .select("default_price, prime_start_time, prime_end_time, prime_price")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError || !settings) {
    redirect("/admin?error=settings_harga_tidak_ditemukan&section=setelan");
  }

  const { startAt, endAt } = getSlotIsoRange(slotDate, startTime, endTime);
  const pitchName = "Lapangan Utama";
  const price = getSlotPrice(startTime, {
    defaultPrice: settings.default_price,
    primeStartTime: settings.prime_start_time,
    primeEndTime: settings.prime_end_time,
    primePrice: settings.prime_price,
  });

  const { data: existingSlot } = await supabase
    .from("schedule_slots")
    .select("id")
    .eq("pitch_name", pitchName)
    .eq("start_at", startAt)
    .eq("end_at", endAt)
    .maybeSingle();

  if (existingSlot) {
    redirect("/admin?error=slot_sudah_ada_pada_jam_tersebut&section=jadwal");
  }

  const slotStatus = contactName ? "booked" : "blocked";
  const { data: slotData, error } = await supabase.from("schedule_slots").insert({
    pitch_name: pitchName,
    start_at: startAt,
    end_at: endAt,
    price,
    notes: notes || (contactName ? "Booking manual oleh admin" : "Slot ditutup admin"),
    status: slotStatus,
    created_by: user.id,
  }).select("id").single();

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  if (contactName && slotData?.id) {
    const { error: bookingError } = await supabase.from("bookings").insert({
      slot_id: slotData.id,
      team_name: contactName,
      contact_name: contactName,
      address,
      contact_phone: contactPhone,
      status: "confirmed",
      payment_method: "input_admin",
      payment_status: "terverifikasi",
      admin_notes: notes || "Booking dimasukkan manual oleh admin",
    });

    if (bookingError) {
      redirect(`/admin?error=${encodeURIComponent(bookingError.message)}`);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?success=schedule_created");
}

export async function generateUpcomingSlotsAction() {
  const { supabase, user } = await requireAdmin();

  const { data: settings, error: settingsError } = await supabase
    .from("app_settings")
    .select("open_time, close_time, default_price, prime_start_time, prime_end_time, prime_price")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError || !settings) {
    redirect("/admin?error=settings_harga_tidak_ditemukan&section=setelan");
  }

  const closeHour = settings.close_time === "24:00" ? 24 : Number(settings.close_time.split(":")[0] ?? "24");
  const slotsToInsert: Array<{
    pitch_name: string;
    start_at: string;
    end_at: string;
    price: number;
    status: "available";
    notes: null;
    created_by: string;
  }> = [];

  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + dayOffset);
    const dayKey = date.toISOString().slice(0, 10);

    for (let hour = 9; hour < closeHour; hour += 1) {
      const startTime = `${String(hour).padStart(2, "0")}:00`;
      const endHour = hour + 1;
      const endTime = endHour >= 24 ? "23:59" : `${String(endHour).padStart(2, "0")}:00`;
      const startAt = new Date(`${dayKey}T${startTime}:00+07:00`).toISOString();
      const endAt = new Date(`${dayKey}T${endTime}:00+07:00`).toISOString();
      const price =
        startTime >= settings.prime_start_time && startTime < settings.prime_end_time
          ? settings.prime_price
          : settings.default_price;

      slotsToInsert.push({
        pitch_name: "Lapangan Utama",
        start_at: startAt,
        end_at: endAt,
        price,
        status: "available",
        notes: null,
        created_by: user.id,
      });
    }
  }

  const { error } = await supabase.from("schedule_slots").upsert(slotsToInsert, {
    onConflict: "pitch_name,start_at,end_at",
    ignoreDuplicates: false,
  });

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}&section=jadwal`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?success=slot_otomatis_dibuat&section=jadwal");
}

export async function updateSettingsAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const venueName = String(formData.get("venue_name") ?? "").trim();
  const openTime = String(formData.get("open_time") ?? "").trim();
  const closeTime = String(formData.get("close_time") ?? "").trim();
  const mapsCoordinates = String(formData.get("maps_coordinates") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const defaultPrice = Number(formData.get("default_price") ?? 0);
  const primeStartTime = String(formData.get("prime_start_time") ?? "").trim();
  const primeEndTime = String(formData.get("prime_end_time") ?? "").trim();
  const primePrice = Number(formData.get("prime_price") ?? 0);
  const slotIntervalMinutes = Number(formData.get("slot_interval_minutes") ?? 60);

  if (
    !venueName ||
    !openTime ||
    !closeTime ||
    !mapsCoordinates ||
    !contactPhone ||
    !primeStartTime ||
    !primeEndTime ||
    Number.isNaN(defaultPrice) ||
    Number.isNaN(primePrice) ||
    Number.isNaN(slotIntervalMinutes)
  ) {
    redirect("/admin?error=invalid_settings_input");
  }

  const { error } = await supabase.from("app_settings").upsert(
    {
      id: 1,
      venue_name: venueName,
      open_time: openTime,
      close_time: closeTime,
      maps_coordinates: mapsCoordinates,
      contact_phone: contactPhone,
      default_price: defaultPrice,
      prime_start_time: primeStartTime,
      prime_end_time: primeEndTime,
      prime_price: primePrice,
      slot_interval_minutes: slotIntervalMinutes,
    },
    { onConflict: "id" },
  );

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?success=settings_updated");
}

export async function upsertGalleryItemAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const existingImage = String(formData.get("existing_image_url") ?? "").trim();
  const uploadedImage = await fileToDataUrl(formData.get("image_file"));
  const imageUrl = uploadedImage ?? existingImage;

  if (!title || !imageUrl || Number.isNaN(sortOrder)) {
    redirect("/admin?error=invalid_gallery_input#galeri");
  }

  const payload = {
    title,
    image_url: imageUrl,
    sort_order: sortOrder,
  };

  const { error } = id
    ? await supabase.from("site_gallery").update(payload).eq("id", id)
    : await supabase.from("site_gallery").insert(payload);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}#galeri`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?success=gallery_updated#galeri");
}

export async function upsertFacilityItemAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const isFeatured = String(formData.get("is_featured") ?? "") === "on";
  const existingImage = String(formData.get("existing_image_url") ?? "").trim();
  const uploadedImage = await fileToDataUrl(formData.get("image_file"));
  const imageUrl = uploadedImage ?? existingImage;

  if (!title || !description || !imageUrl || Number.isNaN(sortOrder)) {
    redirect("/admin?error=invalid_facility_input#fasilitas");
  }

  const payload = {
    title,
    description,
    image_url: imageUrl,
    sort_order: sortOrder,
    is_featured: isFeatured,
  };

  const { error } = id
    ? await supabase.from("facility_items").update(payload).eq("id", id)
    : await supabase.from("facility_items").insert(payload);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}#fasilitas`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?success=facility_updated#fasilitas");
}
