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

async function syncSlotStatusForBooking(slotId: string, nextStatus: "available" | "pending" | "booked" | "blocked", notes?: string | null) {
  const { supabase } = await requireAdmin();

  await supabase
    .from("schedule_slots")
    .update({
      status: nextStatus,
      notes: notes ?? null,
    })
    .eq("id", slotId);
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
    redirect("/admin?error=slot_sudah_terisi_atau_sudah_ada&section=jadwal");
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
  const seoTitle = String(formData.get("seo_title") ?? "").trim();
  const seoDescription = String(formData.get("seo_description") ?? "").trim();
  const seoKeywords = String(formData.get("seo_keywords") ?? "").trim();
  const googleAnalyticsId = String(formData.get("google_analytics_id") ?? "").trim();
  const existingSiteLogoUrl = String(formData.get("existing_site_logo_url") ?? "").trim();
  const existingFaviconUrl = String(formData.get("existing_favicon_url") ?? "").trim();
  const uploadedSiteLogo = await fileToDataUrl(formData.get("site_logo_file"));
  const uploadedFavicon = await fileToDataUrl(formData.get("favicon_file"));
  const siteLogoUrl = uploadedSiteLogo ?? (existingSiteLogoUrl || null);
  const faviconUrl = uploadedFavicon ?? (existingFaviconUrl || null);

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
      site_logo_url: siteLogoUrl,
      favicon_url: faviconUrl,
      seo_title: seoTitle || venueName,
      seo_description: seoDescription || null,
      seo_keywords: seoKeywords || null,
      google_analytics_id: googleAnalyticsId || null,
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

export async function deleteGalleryItemAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/admin?error=invalid_gallery_delete&section=galeri");
  }

  const { error } = await supabase.from("site_gallery").delete().eq("id", id);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}&section=galeri`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?success=gallery_deleted&section=galeri");
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

export async function deleteFacilityItemAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/admin?error=invalid_facility_delete&section=fasilitas");
  }

  const { error } = await supabase.from("facility_items").delete().eq("id", id);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}&section=fasilitas`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?success=facility_deleted&section=fasilitas");
}

export async function upsertFaqItemAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  if (!question || !answer || Number.isNaN(sortOrder)) {
    redirect("/admin?error=invalid_faq_input&section=faq");
  }

  const payload = {
    question,
    answer,
    sort_order: sortOrder,
  };

  const { error } = id
    ? await supabase.from("faq_items").update(payload).eq("id", id)
    : await supabase.from("faq_items").insert(payload);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}&section=faq`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?success=faq_updated&section=faq");
}

export async function deleteFaqItemAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/admin?error=invalid_faq_delete&section=faq");
  }

  const { error } = await supabase.from("faq_items").delete().eq("id", id);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}&section=faq`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?success=faq_deleted&section=faq");
}

export async function rejectBookingAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  const slotId = String(formData.get("slot_id") ?? "").trim();

  if (!bookingId || !slotId) {
    redirect("/admin?error=invalid_booking_action&section=booking");
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      payment_status: "ditolak",
      admin_notes: "Ditolak admin",
    })
    .eq("id", bookingId);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}&section=booking`);
  }

  await syncSlotStatusForBooking(slotId, "available", null);

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?success=booking_rejected&section=booking");
}
