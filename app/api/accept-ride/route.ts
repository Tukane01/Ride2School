import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { generateOTP } from "@/lib/utils"

export async function POST(request: Request) {
  try {
    const { requestId, driverId } = await request.json()

    if (!requestId || !driverId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    // Get the ride request
    const { data: requestData, error: requestError } = await supabase
      .from("ride_requests")
      .select("*")
      .eq("id", requestId)
      .single()

    if (requestError) {
      console.error("Error fetching ride request:", requestError)
      return NextResponse.json({ error: "Failed to fetch ride request" }, { status: 500 })
    }

    if (!requestData) {
      return NextResponse.json({ error: "Ride request not found" }, { status: 404 })
    }

    // Check if driver exists
    const { data: driverData, error: driverError } = await supabase
      .from("users")
      .select("is_online")
      .eq("id", driverId)
      .eq("user_type", "driver")
      .single()

    if (driverError) {
      console.error("Error fetching driver:", driverError)
      return NextResponse.json({ error: "Failed to fetch driver" }, { status: 500 })
    }

    if (!driverData) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }

    if (!driverData.is_online) {
      return NextResponse.json({ error: "Driver must be online to accept rides" }, { status: 400 })
    }

    // Check if driver already has an active ride
    const { data: activeRides, error: activeRidesError } = await supabase
      .from("rides")
      .select("id")
      .eq("driver_id", driverId)
      .in("status", ["scheduled", "in_progress"])

    if (activeRidesError) {
      console.error("Error checking active rides:", activeRidesError)
      return NextResponse.json({ error: "Failed to check active rides" }, { status: 500 })
    }

    if (activeRides && activeRides.length > 0) {
      return NextResponse.json(
        { error: "You already have an active ride. Complete it before accepting a new one." },
        { status: 400 },
      )
    }

    // Start a transaction
    // First, update the request status
    const { error: updateRequestError } = await supabase
      .from("ride_requests")
      .update({ status: "accepted" })
      .eq("id", requestId)
      .eq("status", "pending") // Only accept if still pending

    if (updateRequestError) {
      console.error("Error updating request status:", updateRequestError)
      return NextResponse.json({ error: "Failed to update request status" }, { status: 500 })
    }

    // Generate OTP for the ride
    const otp = generateOTP()

    // Create a new ride
    const { data: rideData, error: createRideError } = await supabase
      .from("rides")
      .insert({
        request_id: requestId,
        parent_id: requestData.parent_id,
        child_id: requestData.child_id,
        driver_id: driverId,
        origin_lat: requestData.origin_lat,
        origin_lng: requestData.origin_lng,
        origin_address: requestData.origin_address,
        destination_lat: requestData.destination_lat,
        destination_lng: requestData.destination_lng,
        destination_address: requestData.destination_address,
        destination_name: requestData.destination_name,
        scheduled_time: requestData.scheduled_time,
        status: "scheduled",
        fare: requestData.estimated_fare,
        current_location_lat: requestData.origin_lat,
        current_location_lng: requestData.origin_lng,
        current_location_address: requestData.origin_address,
        estimated_arrival: new Date(Date.now() + 15 * 60000).toISOString(), // 15 minutes from now
        otp: otp,
        otp_generated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createRideError) {
      // If ride creation fails, revert the request status
      await supabase.from("ride_requests").update({ status: "pending" }).eq("id", requestId)
      console.error("Error creating ride:", createRideError)
      return NextResponse.json({ error: "Failed to create ride" }, { status: 500 })
    }

    // Get parent's phone number for SMS notification
    const { data: parentData } = await supabase
      .from("users")
      .select("phone_number, name")
      .eq("id", requestData.parent_id)
      .single()

    try {
      // Create notification for the parent
      await supabase.from("notifications").insert({
        user_id: requestData.parent_id,
        title: "Ride Request Accepted",
        content: `Your ride request has been accepted by a driver. Your OTP is: ${otp}`,
        type: "ride_accepted",
        ride_id: rideData.id,
      })
    } catch (error) {
      console.error("Failed to create notification:", error)
      // Don't fail the whole operation for notification errors
    }

    try {
      // Create a message to the parent with the OTP
      await supabase.from("messages").insert({
        sender_id: driverId,
        recipient_id: requestData.parent_id,
        content: `Hello! I've accepted your ride request. Your OTP for the ride is: ${otp}. Please share this with your child.`,
        ride_id: rideData.id,
      })
    } catch (error) {
      console.error("Failed to send message:", error)
      // Don't fail the whole operation for message errors
    }

    return NextResponse.json({
      id: rideData.id,
      otp: otp,
      otp_generated_at: rideData.otp_generated_at,
      estimated_arrival: rideData.estimated_arrival,
    })
  } catch (error) {
    console.error("Error accepting ride request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
