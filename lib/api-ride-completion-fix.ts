import { getBrowserClient } from "./supabaseClient"

// Enhanced ride completion function with better error handling
export const completeRideEnhanced = async (rideId: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    console.log(`Attempting to complete ride: ${rideId}`)

    // First, debug the ride status
    const { data: debugData, error: debugError } = await supabase.rpc("debug_ride_status", {
      p_ride_id: rideId,
    })

    if (debugError) {
      console.error("Debug error:", debugError)
    } else {
      console.log("Ride debug info:", debugData)
    }

    // Verify the ride exists and belongs to this driver
    const { data: rideData, error: rideError } = await supabase
      .from("rides")
      .select("*")
      .eq("id", rideId)
      .eq("driver_id", user.id)
      .maybeSingle()

    if (rideError) {
      console.error("Error checking ride:", rideError)
      throw new Error(`Failed to verify ride: ${rideError.message}`)
    }

    if (!rideData) {
      // Check if ride is already completed
      const { data: completedRide, error: completedError } = await supabase
        .from("completed_rides")
        .select("completed_at, fare")
        .eq("original_ride_id", rideId)
        .eq("driver_id", user.id)
        .maybeSingle()

      if (!completedError && completedRide) {
        return {
          success: true,
          message: "Ride was already completed",
          alreadyCompleted: true,
          completedAt: completedRide.completed_at,
          fare: completedRide.fare,
        }
      }

      throw new Error("Ride not found or you don't have permission to complete it")
    }

    console.log(`Found ride with status: ${rideData.status}`)

    // Check if ride is in a completable state
    if (!["scheduled", "in_progress"].includes(rideData.status)) {
      throw new Error(`Cannot complete ride with status: ${rideData.status}`)
    }

    // Call the database function to complete the ride
    const { data: result, error: moveError } = await supabase.rpc("move_ride_to_completed", {
      p_ride_id: rideId,
      p_actual_pickup_time: null,
      p_actual_dropoff_time: new Date().toISOString(),
      p_distance_traveled: null,
      p_duration_minutes: null,
    })

    if (moveError) {
      console.error("Move error:", moveError)
      throw new Error(`Failed to complete ride: ${moveError.message}`)
    }

    console.log("Completion result:", result)

    // Handle the JSON response from the database function
    if (!result.success) {
      const errorMessage = result.message || "Unknown error occurred"

      switch (result.error) {
        case "RIDE_NOT_FOUND":
          throw new Error("Ride not found. It may have been cancelled or completed by another process.")
        case "RIDE_CANCELLED":
          throw new Error("This ride was already cancelled and cannot be completed.")
        case "RIDE_NOT_ACCEPTED":
          throw new Error("This ride request was never accepted by a driver.")
        case "INVALID_STATUS":
          throw new Error(`Cannot complete ride. Current status: ${result.current_status}`)
        case "RIDE_LOCKED":
          throw new Error("Ride is being processed. Please wait and try again.")
        default:
          throw new Error(errorMessage)
      }
    }

    // Create notification for the parent
    try {
      await supabase.from("notifications").insert({
        user_id: rideData.parent_id,
        title: "Ride Completed",
        content: "Your child's ride has been completed successfully.",
        type: "ride_completed",
        ride_id: rideId,
      })
    } catch (notificationError) {
      console.error("Failed to create notification:", notificationError)
      // Don't fail the whole operation for notification
    }

    return {
      success: true,
      message: result.message || "Ride completed successfully",
      fare: result.payment_amount || 0,
      completedAt: result.completed_at,
      driverPaid: result.driver_paid || false,
      alreadyCompleted: result.already_completed || false,
    }
  } catch (error: any) {
    console.error("Error completing ride:", error)
    throw new Error(error.message || "Failed to complete ride")
  }
}
