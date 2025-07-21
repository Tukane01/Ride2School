import { getBrowserClient } from "./supabase"

// Alternative cancel ride function that handles schema cache issues
export const cancelRideAlternative = async (rideId: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get the ride
  const { data: rideData, error: rideError } = await supabase.from("rides").select("*").eq("id", rideId).single()

  if (rideError) {
    throw new Error(rideError.message)
  }

  if (!rideData) {
    throw new Error("Ride not found")
  }

  // Check if user is authorized to cancel the ride
  if (rideData.parent_id !== user.id && rideData.driver_id !== user.id) {
    throw new Error("You are not authorized to cancel this ride")
  }

  // Check if ride is already in progress
  if (rideData.status === "in_progress" && user.user_type === "driver") {
    throw new Error("Cannot cancel a ride that is already in progress")
  }

  try {
    // First, try to update with all fields
    let updateError = null

    try {
      const { error } = await supabase
        .from("rides")
        .update({
          status: "cancelled",
          cancelled_by: user.id,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", rideId)

      updateError = error
    } catch (error) {
      updateError = error
    }

    // If the first update failed due to schema issues, try without cancelled_at
    if (updateError && updateError.message?.includes("cancelled_at")) {
      console.warn("cancelled_at column not found, updating without it...")

      const { error: fallbackError } = await supabase
        .from("rides")
        .update({
          status: "cancelled",
          cancelled_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rideId)

      if (fallbackError) {
        throw fallbackError
      }
    } else if (updateError) {
      throw updateError
    }

    // Create notification for the other party
    const notifyUserId = user.id === rideData.parent_id ? rideData.driver_id : rideData.parent_id
    const cancellerType = user.id === rideData.parent_id ? "parent" : "driver"

    try {
      await supabase.from("notifications").insert({
        user_id: notifyUserId,
        title: "Ride Cancelled",
        content: `The ride has been cancelled by the ${cancellerType}.`,
        type: "ride_cancelled",
        ride_id: rideId,
      })
    } catch (notificationError) {
      console.error("Failed to create notification, but ride was cancelled successfully:", notificationError)
      // Don't fail the whole operation if just the notification fails
    }

    return true
  } catch (error: any) {
    console.error("Error in cancelRideAlternative:", error)
    throw new Error(error.message || "Failed to cancel ride")
  }
}
