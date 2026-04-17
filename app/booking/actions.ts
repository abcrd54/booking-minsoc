"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createMidtransSnapTransaction } from "@/lib/midtrans";
import { isFonnteConfigured, sendPaymentLinkWhatsApp } from "@/lib/fonnte";

function generateOrderId() {
  return `KT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function isDuplicateSlotBookingError(message: string | undefined) {
  if (!message) {
    return false;
  }

  return (
    message.includes("bookings_slot_id_key") ||
    message.includes("bookings_slot_id_unique_idx") ||
    message.includes("duplicate key value violates unique constraint")
  );
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

  const paymentCode = generateOrderId();

  if (hasSupabaseEnv) {
    const supabase = createSupabaseAdminClient();
    let resolvedSlotId = slotId;
    let createdNewSlot = false;
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

      if (existingSlot?.status === "pending" || existingSlot?.status === "booked" || existingSlot?.status === "blocked") {
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
            status: "pending",
            notes: "Menunggu verifikasi admin",
          })
          .select("id")
          .single();

        if (slotInsertError || !insertedSlot) {
          redirect(`/?error=${encodeURIComponent(slotInsertError?.message ?? "gagal_membuat_slot")}#pricing`);
        }

        resolvedSlotId = insertedSlot.id;
        createdNewSlot = true;
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

      if (currentSlot?.status === "pending" || currentSlot?.status === "booked" || currentSlot?.status === "blocked") {
        redirect("/?error=slot_sudah_tidak_tersedia#pricing");
      }

      shouldMarkExistingSlotBooked = true;
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        slot_id: resolvedSlotId,
        team_name: contactName,
        contact_name: contactName,
        address,
        contact_phone: contactPhone,
        payment_code: paymentCode,
        transfer_amount: basePrice,
        payment_method: "midtrans_snap",
        payment_status: "menunggu_verifikasi",
        status: "pending",
      })
      .select("id")
      .single();

    if (isDuplicateSlotBookingError(error?.message)) {
      await supabase
        .from("schedule_slots")
        .update({ status: "pending", notes: "Menunggu pembayaran Midtrans" })
        .eq("id", resolvedSlotId);

      redirect("/?error=slot_sudah_tidak_tersedia#pricing");
    }

    if (error || !booking) {
      redirect(`/?error=${encodeURIComponent(error?.message ?? "gagal_membuat_booking")}#pricing`);
    }

    try {
      const snap = await createMidtransSnapTransaction({
        orderId: paymentCode,
        grossAmount: basePrice,
        customer: {
          firstName: contactName,
          phone: contactPhone,
          address,
        },
        itemDetails: [
          {
            id: resolvedSlotId,
            price: basePrice,
            quantity: 1,
            name: `${pitchName} ${slotLabel}`.slice(0, 50),
          },
        ],
      });

      const { error: bookingUpdateError } = await supabase
        .from("bookings")
        .update({
          payment_token: snap.token,
          payment_redirect_url: snap.redirectUrl,
        })
        .eq("id", booking.id);

      if (bookingUpdateError) {
        redirect(`/?error=${encodeURIComponent(bookingUpdateError.message)}#pricing`);
      }

      if (shouldMarkExistingSlotBooked) {
        const { error: slotUpdateError } = await supabase
          .from("schedule_slots")
          .update({ status: "pending", notes: "Menunggu pembayaran Midtrans" })
          .eq("id", resolvedSlotId);

        if (slotUpdateError) {
          redirect(`/?error=${encodeURIComponent(slotUpdateError.message)}#pricing`);
        }
      }

      if (isFonnteConfigured()) {
        const slotDateLabel = new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Jakarta",
        }).format(new Date(startAt));
        const slotEndLabel = new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Jakarta",
        }).format(new Date(endAt));

        try {
          await sendPaymentLinkWhatsApp({
            bookingId: booking.id,
            orderId: paymentCode,
            contactName,
            contactPhone,
            amount: basePrice,
            slotLabel: `${pitchName} | ${slotDateLabel} - ${slotEndLabel}`,
          });
        } catch (fonnteError) {
          console.error("Failed to send WhatsApp payment link via Fonnte:", fonnteError);

          await supabase
            .from("bookings")
            .update({
              admin_notes: `Fonnte gagal: ${fonnteError instanceof Error ? fonnteError.message : "unknown_error"}`,
            })
            .eq("id", booking.id);
        }
      }

      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath("/payment/finish");
      revalidatePath("/payment/unfinish");
      revalidatePath("/payment/error");
    } catch (midtransError) {
      await supabase.from("bookings").delete().eq("id", booking.id);

      if (createdNewSlot) {
        await supabase.from("schedule_slots").delete().eq("id", resolvedSlotId);
      } else {
        await supabase
          .from("schedule_slots")
          .update({ status: "available", notes: null })
          .eq("id", resolvedSlotId);
      }

      redirect(
        `/?error=${encodeURIComponent(
          midtransError instanceof Error ? midtransError.message : "gagal_membuat_transaksi_midtrans",
        )}#pricing`,
      );
    }

    redirect(`/pembayaran?booking=${encodeURIComponent(booking.id)}`);
  }

  redirect("/?error=konfigurasi_supabase_tidak_ditemukan#pricing");
}
