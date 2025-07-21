import { getBrowserClient } from "./supabase"

// Enhanced complete ride function with proper payment logic
export const completeRideFinal = async (rideId: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")
  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    console.log("Attempting to complete ride:", rideId)

    // Call the database function to complete the ride
    const { data, error } = await supabase.rpc("move_ride_to_completed", {
      p_ride_id: rideId,
      p_actual_pickup_time: null,
      p_actual_dropoff_time: new Date().toISOString(),
      p_distance_traveled: null,
      p_duration_minutes: null,
    })

    if (error) {
      console.error("Database function error:", error)
      throw new Error(`Failed to complete ride: ${error.message}`)
    }

    console.log("Database function response:", data)

    // Check if the function returned an error
    if (data && !data.success) {
      console.error("Ride completion failed:", data.error)

      // Handle specific error cases
      if (data.already_completed) {
        return {
          success: true,
          message: "Ride was already completed",
          alreadyCompleted: true,
        }
      }

      throw new Error(data.error || "Failed to complete ride")
    }

    return {
      success: true,
      message: "Ride completed successfully",
      fare: data?.fare || 0,
      rideRemoved: true,
      parentCharged: data?.parent_charged || 0,
      driverPaid: data?.driver_paid || 0,
    }
  } catch (error: any) {
    console.error("Error completing ride:", error)
    throw new Error(error.message || "Failed to complete ride")
  }
}

// Enhanced cancel ride function with proper penalty handling
export const cancelRideFinal = async (rideId: string, cancellationReason?: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")
  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    console.log("Attempting to cancel ride:", rideId)

    // First, get the ride to check permissions and status
    const { data: rideData, error: rideError } = await supabase.from("rides").select("*").eq("id", rideId).single()

    if (rideError) {
      if (rideError.code === "PGRST116") {
        throw new Error("Ride not found in active rides table")
      }
      throw new Error(`Failed to get ride data: ${rideError.message}`)
    }

    if (!rideData) {
      throw new Error("Ride not found in active rides table")
    }

    console.log("Found ride with status:", rideData.status)

    // Check if user is authorized to cancel the ride
    const isDriverCancelling = rideData.driver_id === user.id
    const isParentCancelling = rideData.parent_id === user.id

    if (!isDriverCancelling && !isParentCancelling) {
      throw new Error("You are not authorized to cancel this ride")
    }

    // Determine cancellation behavior based on who is cancelling
    if (isDriverCancelling) {
      console.log("Driver cancelling ride - applying 10% penalty")

      // Driver cancellations: Apply 10% penalty and move back to requests
      const { data, error: moveError } = await supabase.rpc("move_ride_back_to_requests", {
        p_ride_id: rideId,
        p_cancellation_reason: cancellationReason || "Cancelled by driver",
      })

      if (moveError) {
        console.error("Database function error:", moveError)
        throw new Error(`Failed to process driver cancellation: ${moveError.message}`)
      }

      console.log("Database function response:", data)

      // Check if the function returned an error
      if (data && !data.success) {
        console.error("Driver cancellation failed:", data.error)
        throw new Error(data.error || "Failed to cancel ride")
      }

      return {
        success: true,
        message: "Ride cancelled successfully. A 10% penalty has been applied to your account.",
        cancelledBy: "driver",
        movedToRequests: true,
        penaltyApplied: data?.penalty_applied || 0,
        newDriverBalance: data?.new_driver_balance || 0,
      }
    } else if (isParentCancelling) {
      console.log("Parent cancelling ride - applying 10% penalty")

      // Parent cancellations: Apply 10% penalty and move to cancelled
      const { data, error: moveError } = await supabase.rpc("move_ride_to_cancelled", {
        p_ride_id: rideId,
        p_cancelled_by_user_id: user.id,
        p_cancellation_reason: cancellationReason || "Cancelled by parent",
      })

      if (moveError) {
        console.error("Database function error:", moveError)
        throw new Error(`Failed to process parent cancellation: ${moveError.message}`)
      }

      console.log("Database function response:", data)

      // Check if the function returned an error
      if (data && !data.success) {
        console.error("Parent cancellation failed:", data.error)
        throw new Error(data.error || "Failed to cancel ride")
      }

      return {
        success: true,
        message: "Ride cancelled successfully. A 10% penalty has been applied to your account.",
        cancelledBy: "parent",
        movedToCancelled: true,
        penaltyApplied: data?.penalty_applied || 0,
        newParentBalance: data?.new_parent_balance || 0,
      }
    }
  } catch (error: any) {
    console.error("Error in cancelRideFinal:", error)
    throw new Error(error.message || "Failed to cancel ride")
  }
}

// Check wallet balance function
export const checkWalletBalance = async (requiredAmount: number) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")
  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    const { data: userData, error } = await supabase.from("users").select("wallet_balance").eq("id", user.id).single()

    if (error) {
      throw new Error(`Failed to check wallet balance: ${error.message}`)
    }

    const currentBalance = userData.wallet_balance || 0
    const sufficient = currentBalance >= requiredAmount
    const shortfall = sufficient ? 0 : requiredAmount - currentBalance

    return {
      currentBalance,
      requiredAmount,
      sufficient,
      shortfall,
    }
  } catch (error: any) {
    console.error("Error checking wallet balance:", error)
    throw new Error(error.message || "Failed to check wallet balance")
  }
}

// Get user balance function
export const getUserBalance = async () => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")
  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    const { data: userData, error } = await supabase
      .from("users")
      .select("wallet_balance, user_type")
      .eq("id", user.id)
      .single()

    if (error) {
      throw new Error(`Failed to get user balance: ${error.message}`)
    }

    return {
      balance: userData.wallet_balance || 0,
      userType: userData.user_type,
      canGoNegative: true, // Both drivers and parents can have negative balances due to penalties
    }
  } catch (error: any) {
    console.error("Error getting user balance:", error)
    throw new Error(error.message || "Failed to get user balance")
  }
}
