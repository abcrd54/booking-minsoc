"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

function generatePaymentCode() {
  return `KT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function generateUniqueNumber() {
  return Math.floor(100 + Math.random() * 900);
}

export async function createBookingAction(formData: FormData) {
  const slotId = String(formData.get("slot_id") ?? "").trim();
  const slotLabel = String(formData.get("slot_label") ?? "").trim();
  const pitchName = String(formData.get("pitch_name") ?? "").trim();
  const basePrice = Number(formData.get("base_price") ?? 0);
  const startAt = String(formData.get("start_at") ?? "").trim();
  const endAt = String(formData.get("end_at") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();

  if (!pitchName || !startAt || !endAt || !contactName || !address || !contactPhone || Number.isNaN(basePrice)) {
    redirect("/?error=data_booking_tidak_lengkap#pricing");
  }

  const uniqueNumber = generateUniqueNumber();
  const paymentCode = generatePaymentCode();
  const transferAmount = basePrice + uniqueNumber;

  if (hasSupabaseEnv) {
    const supabase = await createSupabaseServerClient();
    let resolvedSlotId = slotId;
    let shouldMarkExistingSlotBooked = false;

    if (!resolvedSlotId || resolvedSlotId.startsWith("virtual:")) {
      const { data: existingSlot, error: existingSlotError } = await supabase
        .from("schedule_slots")
        .select("id, status")
        .eq("pitch_name", pitchName)
        .eq("start_at", startAt)
        .eq("end_at", endAt)
        .maybeSingle();

      if (existingSlotError) {
        redirect(`/?error=${encodeURIComponent(existingSlotError.message)}#pricing`);
      }

      if (existingSlot?.status === "booked" || existingSlot?.status === "blocked") {
        redirect("/?error=slot_sudah_tidak_tersedia#pricing");
      }

      if (existingSlot?.id) {
        resolvedSlotId = existingSlot.id;
        shouldMarkExistingSlotBooked = true;
      } else {
        const { data: insertedSlot, error: slotInsertError } = await supabase
          .from("schedule_slots")
          .insert({
            pitch_name: pitchName,
            start_at: startAt,
            end_at: endAt,
            price: basePrice,
            status: "booked",
            notes: null,
          })
          .select("id")
          .single();

        if (slotInsertError || !insertedSlot) {
          redirect(`/?error=${encodeURIComponent(slotInsertError?.message ?? "gagal_membuat_slot")}#pricing`);
        }

        resolvedSlotId = insertedSlot.id;
      }
    } else {
      const { data: currentSlot, error: currentSlotError } = await supabase
        .from("schedule_slots")
        .select("status")
        .eq("id", resolvedSlotId)
        .maybeSingle();

      if (currentSlotError) {
        redirect(`/?error=${encodeURIComponent(currentSlotError.message)}#pricing`);
      }

      if (currentSlot?.status === "booked" || currentSlot?.status === "blocked") {
        redirect("/?error=slot_sudah_tidak_tersedia#pricing");
      }

      shouldMarkExistingSlotBooked = true;
    }

    const { error } = await supabase.from("bookings").insert({
      slot_id: resolvedSlotId,
      team_name: contactName,
      contact_name: contactName,
      address,
      contact_phone: contactPhone,
      payment_code: paymentCode,
      payment_unique_number: uniqueNumber,
      transfer_amount: transferAmount,
      payment_method: "transfer_manual",
      payment_status: "menunggu_verifikasi",
      status: "pending",
    });

    if (error) {
      redirect(`/?error=${encodeURIComponent(error.message)}#pricing`);
    }

    if (shouldMarkExistingSlotBooked) {
      const { error: slotUpdateError } = await supabase
        .from("schedule_slots")
        .update({ status: "booked" })
        .eq("id", resolvedSlotId);

      if (slotUpdateError) {
        redirect(`/?error=${encodeURIComponent(slotUpdateError.message)}#pricing`);
      }
    }
  }

  redirect(
    `/pembayaran?kode=${encodeURIComponent(paymentCode)}&slot=${encodeURIComponent(slotLabel)}&lapangan=${encodeURIComponent(
      pitchName,
    )}&nama=${encodeURIComponent(contactName)}&nominal=${transferAmount}`,
  );
}
