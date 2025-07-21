import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { generateOTP } from "@/lib/utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      pickupAddress,
      dropoffAddress,
      pickupDate,
      pickupTime,
      rideType,
      notes,
      childId,
      parentId,
      estimatedFare,
      pickupCoordinates,
      dropoffCoordinates,
    } = body

    // Create Supabase client with service role key to bypass RLS
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Not needed for server-side operations
        },
        remove(name: string, options: any) {
          // Not needed for server-side operations
        },
      },
    })

    // Create scheduled date time
    const scheduledDateTime = `${pickupDate}T${pickupTime}:00`

    // Generate OTP for the ride
    const otp = generateOTP()

    // Prepare coordinates data
    const originLat = pickupCoordinates?.lat || null
    const originLng = pickupCoordinates?.lng || null
    const destinationLat = dropoffCoordinates?.lat || null
    const destinationLng = dropoffCoordinates?.lng || null

    // Insert ride request - using the correct column names from the database schema
    const { data: rideRequest, error: insertError } = await supabase
      .from("ride_requests")
      .insert({
        child_id: childId,
        parent_id: parentId,
        origin_address: pickupAddress,
        origin_lat: originLat,
        origin_lng: originLng,
        destination_address: dropoffAddress,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        destination_name: rideType === "school" ? "School" : "Home",
        scheduled_time: scheduledDateTime,
        estimated_fare: estimatedFare,
        notes: notes || null,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting ride request:", insertError)
      throw new Error(`Failed to create ride request: ${insertError.message}`)
    }

    // Try to create notification for drivers (don't fail if this fails)
    try {
      await supabase.from("notifications").insert({
        user_id: null, // This will be handled by the trigger for all online drivers
        title: "New Ride Request",
        content: `New ride request from ${pickupAddress} to ${dropoffAddress}`,
        type: "ride_request",
        ride_id: rideRequest.id,
        created_at: new Date().toISOString(),
        is_read: false,
      })
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError)
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      success: true,
      id: rideRequest.id,
      message: "Ride request created successfully",
    })
  } catch (error) {
    console.error("Error in create-ride-request:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create ride request",
      },
      { status: 500 },
    )
  }
}
