import { getBrowserClient } from "./supabase"

// Enhanced cancel ride function with proper fine handling
export const cancelRideEnhanced = async (rideId: string, cancellationReason?: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")
  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get the ride first to check permissions
  const { data: rideData, error: rideError } = await supabase.from("rides").select("*").eq("id", rideId).single()

  if (rideError) {
    throw new Error(`Failed to get ride data: ${rideError.message}`)
  }

  if (!rideData) {
    throw new Error("Ride not found")
  }

  // Check if user is authorized to cancel the ride
  const isDriverCancelling = rideData.driver_id === user.id
  const isParentCancelling = rideData.parent_id === user.id

  if (!isDriverCancelling && !isParentCancelling) {
    throw new Error("You are not authorized to cancel this ride")
  }

  try {
    let result: any

    if (isDriverCancelling) {
      // Driver cancellations: Apply 10% fine and move back to requests
      const { data, error } = await supabase.rpc("move_ride_back_to_requests", {
        p_ride_id: rideId,
        p_cancellation_reason: cancellationReason || "Cancelled by driver",
      })

      if (error) {
        throw new Error(`Failed to process driver cancellation: ${error.message}`)
      }

      result = data
    } else if (isParentCancelling) {
      // Parent cancellations: Apply 10% fine and move to cancelled
      const { data, error } = await supabase.rpc("move_ride_to_cancelled", {
        p_ride_id: rideId,
        p_cancelled_by_user_id: user.id,
        p_cancellation_reason: cancellationReason || "Cancelled by parent",
      })

      if (error) {
        throw new Error(`Failed to process parent cancellation: ${error.message}`)
      }

      result = data
    }

    return {
      success: true,
      ...result,
      cancelledBy: isDriverCancelling ? "driver" : "parent",
    }
  } catch (error: any) {
    console.error("Error in cancelRideEnhanced:", error)
    throw new Error(error.message || "Failed to cancel ride")
  }
}

// Enhanced complete ride function
export const completeRideEnhanced = async (rideId: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")
  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    // Call the enhanced completion function
    const { data, error } = await supabase.rpc("move_ride_to_completed", {
      p_ride_id: rideId,
      p_actual_pickup_time: null,
      p_actual_dropoff_time: new Date().toISOString(),
      p_distance_traveled: null,
      p_duration_minutes: null,
    })

    if (error) {
      throw new Error(`Failed to complete ride: ${error.message}`)
    }

    return {
      success: true,
      ...data,
    }
  } catch (error: any) {
    console.error("Error completing ride:", error)
    throw new Error(error.message || "Failed to complete ride")
  }
}
