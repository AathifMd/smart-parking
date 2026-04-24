import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SlotUpdateRequest {
  slotId: string;
  carDetected: boolean;
}

interface ReservationRequest {
  slotId: string;
  userName: string;
  userEmail: string;
  durationHours: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "GET" && path.includes("/parking-slots")) {
      const { data: slots, error } = await supabase
        .from("parking_slots")
        .select("*")
        .order("slot_number");

      if (error) throw error;

      const { data: activeReservations } = await supabase
        .from("reservations")
        .select("*")
        .eq("status", "active");

      const slotsWithReservations = slots.map((slot) => {
        const reservation = activeReservations?.find((r) => r.slot_id === slot.id);
        return {
          ...slot,
          reservation: reservation || null,
        };
      });

      return new Response(JSON.stringify({ slots: slotsWithReservations }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (req.method === "POST" && path.includes("/update-status")) {
      const { slotId, carDetected }: SlotUpdateRequest = await req.json();

      const { data: slot } = await supabase
        .from("parking_slots")
        .select("*, reservations!inner(*)")
        .eq("id", slotId)
        .eq("reservations.status", "active")
        .maybeSingle();

      let newStatus = carDetected ? "occupied" : "available";

      if (slot && slot.reservations && slot.reservations.length > 0) {
        const reservation = slot.reservations[0];

        if (!carDetected) {
          await supabase
            .from("reservations")
            .update({ status: "cancelled", auto_cancelled: true })
            .eq("id", reservation.id);

          newStatus = "available";
        } else {
          newStatus = "occupied";
        }
      }

      const { error } = await supabase
        .from("parking_slots")
        .update({
          status: newStatus,
          last_detection: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", slotId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, newStatus }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (req.method === "POST" && path.includes("/reserve")) {
      const { slotId, userName, userEmail, durationHours }: ReservationRequest = await req.json();

      const { data: slot } = await supabase
        .from("parking_slots")
        .select("*")
        .eq("id", slotId)
        .maybeSingle();

      if (!slot) {
        return new Response(
          JSON.stringify({ error: "Slot not found" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (slot.status !== "available") {
        return new Response(
          JSON.stringify({ error: "Slot not available" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const reservedUntil = new Date();
      reservedUntil.setHours(reservedUntil.getHours() + durationHours);

      const { data: reservation, error: reservationError } = await supabase
        .from("reservations")
        .insert({
          slot_id: slotId,
          user_name: userName,
          user_email: userEmail,
          reserved_until: reservedUntil.toISOString(),
          status: "active",
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      await supabase
        .from("parking_slots")
        .update({ status: "reserved", updated_at: new Date().toISOString() })
        .eq("id", slotId);

      return new Response(
        JSON.stringify({ success: true, reservation }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (req.method === "POST" && path.includes("/cancel")) {
      const { reservationId } = await req.json();

      const { data: reservation } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservationId)
        .maybeSingle();

      if (!reservation) {
        return new Response(
          JSON.stringify({ error: "Reservation not found" }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservationId);

      await supabase
        .from("parking_slots")
        .update({ status: "available", updated_at: new Date().toISOString() })
        .eq("id", reservation.slot_id);

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
