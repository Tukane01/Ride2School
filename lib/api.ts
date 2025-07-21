import { getBrowserClient } from "./supabase"
import type { Ride, RideRequest } from "./types"

// Import card management functions
import { getUserPaymentCards, addPaymentCard, setDefaultCard, deletePaymentCard, validateCardNumber } from "./api-cards"

// Re-export card functions
export { getUserPaymentCards, addPaymentCard, setDefaultCard, deletePaymentCard, validateCardNumber }

// Import driver transaction manager
import { driverTransactionManager } from "./api-driver-transactions"

// Get user profile
export const getUserProfile = async () => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  if (typeof window === "undefined") {
    throw new Error("Cannot access localStorage on server side")
  }

  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get user profile from the users table
  const { data: userData, error: userError } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (userError) {
    console.error("Error fetching user data:", userError)
    throw new Error(userError.message)
  }

  if (!userData) {
    throw new Error("User profile not found")
  }

  // Get transactions for the user
  const { data: transactionsData, error: transactionsError } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  if (transactionsError) {
    console.error("Error fetching transactions:", transactionsError)
    throw new Error(transactionsError.message)
  }

  // Format transactions
  const transactions = transactionsData.map((transaction) => ({
    id: transaction.id,
    date: transaction.created_at,
    amount: transaction.amount,
    description: transaction.description,
    type: transaction.type,
  }))

  // If user is a parent, get child information
  if (userData.user_type === "parent") {
    const { data: childData, error: childError } = await supabase
      .from("children")
      .select("*")
      .eq("parent_id", user.id)
      .maybeSingle()

    if (childError && childError.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      console.error("Error fetching child data:", childError)
      throw new Error(childError.message)
    }

    // Get notifications
    const { data: notificationsData, error: notificationsError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (notificationsError) {
      console.error("Error fetching notifications:", notificationsError)
    }

    return {
      id: userData.id,
      name: userData.name,
      surname: userData.surname,
      email: userData.email,
      phoneNumber: userData.phone_number,
      idNumber: userData.id_number,
      address: userData.address,
      gender: userData.gender,
      profilePic: userData.profile_pic || "/placeholder.svg?height=48&width=48",
      userType: userData.user_type,
      totalRideRequests: userData.total_ride_requests || 0,
      totalCancellations: userData.total_cancellations || 0,
      cancellationRate: userData.cancellation_rate || 0,
      child: childData
        ? {
            id: childData.id,
            name: childData.name,
            surname: childData.surname,
            idNumber: childData.id_number,
            school: {
              name: childData.school_name,
              address: childData.school_address,
            },
          }
        : null,
      wallet: {
        balance: userData.wallet_balance || 0,
        transactions,
      },
      notifications: notificationsData || [],
    }
  }

  // If user is a driver, get car information
  if (userData.user_type === "driver") {
    const { data: carData, error: carError } = await supabase.from("cars").select("*").eq("driver_id", user.id).single()

    if (carError && carError.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      console.error("Error fetching car data:", carError)
      throw new Error(carError.message)
    }

    // Get average rating for the driver
    const { data: ratingsData, error: ratingsError } = await supabase
      .from("ratings")
      .select("rating")
      .eq("rated_id", user.id)

    if (ratingsError) {
      console.error("Error fetching ratings:", ratingsError)
      throw new Error(ratingsError.message)
    }

    let rating = 0
    if (ratingsData && ratingsData.length > 0) {
      const sum = ratingsData.reduce((acc, curr) => acc + curr.rating, 0)
      rating = sum / ratingsData.length
    }

    // Get notifications
    const { data: notificationsData, error: notificationsError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (notificationsError) {
      console.error("Error fetching notifications:", notificationsError)
    }

    return {
      id: userData.id,
      name: userData.name,
      surname: userData.surname,
      email: userData.email,
      phoneNumber: userData.phone_number,
      idNumber: userData.id_number,
      address: userData.address,
      gender: userData.gender,
      profilePic: userData.profile_pic || "/placeholder.svg?height=48&width=48",
      userType: userData.user_type,
      car: carData
        ? {
            make: carData.make,
            model: carData.model,
            color: carData.color,
            registration: carData.registration,
            vinNumber: carData.vin_number,
          }
        : null,
      rating,
      wallet: {
        balance: userData.wallet_balance || 0,
        transactions,
      },
      isOnline: userData.is_online || false,
      notifications: notificationsData || [],
    }
  }

  throw new Error("Invalid user type")
}

// Get user data by ID
export const getUserData = async (userId: string) => {
  const supabase = getBrowserClient()

  // Get user profile from the users table
  const { data: userData, error: userError } = await supabase.from("users").select("*").eq("id", userId).single()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData) {
    throw new Error("User not found")
  }

  return userData
}

// Get all children for the current parent
export const getChildrenForParent = async () => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get all children for the parent
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching children:", error)
    throw new Error(error.message)
  }

  // Format children data
  return data.map((child) => ({
    id: child.id,
    name: child.name,
    surname: child.surname,
    idNumber: child.id_number,
    school: {
      name: child.school_name,
      address: child.school_address,
    },
    createdAt: child.created_at,
  }))
}

// Add a new child
export const addNewChild = async (childData: any) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Check if a child with the same ID number already exists
  const { data: existingChild, error: checkError } = await supabase
    .from("children")
    .select("id")
    .eq("id_number", childData.idNumber)
    .maybeSingle()

  if (checkError) {
    throw new Error(checkError.message)
  }

  if (existingChild) {
    throw new Error("A child with this ID number already exists")
  }

  // Create new child
  const { error: insertError } = await supabase.from("children").insert({
    parent_id: user.id,
    name: childData.name,
    surname: childData.surname,
    id_number: childData.idNumber,
    school_name: childData.schoolName,
    school_address: childData.schoolAddress,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (insertError) {
    throw new Error(insertError.message)
  }

  return true
}

// Get active rides for parent
export const getActiveRides = async () => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get active rides for the parent - only scheduled and in_progress
  const { data: ridesData, error: ridesError } = await supabase
    .from("rides")
    .select(`
      *,
      children:child_id (id, name, surname),
      parent:parent_id (id, name, surname, phone_number),
      driver:driver_id (id, name, surname, profile_pic)
    `)
    .eq("parent_id", user.id)
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_time", { ascending: true })

  if (ridesError) {
    throw new Error(ridesError.message)
  }

  // Format rides data
  const rides: Ride[] = await Promise.all(
    ridesData.map(async (ride) => {
      // Get driver's car details
      const { data: carData, error: carError } = await supabase
        .from("cars")
        .select("*")
        .eq("driver_id", ride.driver.id)
        .single()

      if (carError && carError.code !== "PGRST116") {
        throw new Error(carError.message)
      }

      // Get driver's rating
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("rating")
        .eq("rated_id", ride.driver.id)

      if (ratingsError) {
        throw new Error(ratingsError.message)
      }

      let rating = 0
      if (ratingsData && ratingsData.length > 0) {
        const sum = ratingsData.reduce((acc, curr) => acc + curr.rating, 0)
        rating = sum / ratingsData.length
      }

      return {
        id: ride.id,
        child: {
          id: ride.children.id,
          name: ride.children.name,
          surname: ride.children.surname,
        },
        parent: {
          id: ride.parent.id,
          name: `${ride.parent.name} ${ride.parent.surname}`,
          phoneNumber: ride.parent.phone_number,
        },
        driver: {
          id: ride.driver.id,
          name: `${ride.driver.name} ${ride.driver.surname}`,
          profilePic: ride.driver.profile_pic || "/placeholder.svg?height=48&width=48",
          carDetails: carData
            ? `${carData.color} ${carData.make} ${carData.model} (${carData.registration})`
            : "Vehicle information not available",
          rating,
        },
        origin: {
          lat: Number.parseFloat(ride.origin_lat),
          lng: Number.parseFloat(ride.origin_lng),
          address: ride.origin_address,
        },
        destination: {
          lat: Number.parseFloat(ride.destination_lat),
          lng: Number.parseFloat(ride.destination_lng),
          address: ride.destination_address,
          name: ride.destination_name,
        },
        scheduledTime: ride.scheduled_time,
        status: ride.status,
        otp: ride.otp,
        otp_generated_at: ride.otp_generated_at,
        currentLocation: {
          lat: Number.parseFloat(ride.current_location_lat || ride.origin_lat),
          lng: Number.parseFloat(ride.current_location_lng || ride.origin_lng),
          address: ride.current_location_address || ride.origin_address,
        },
        estimatedArrival: ride.estimated_arrival,
        fare: ride.fare,
      }
    }),
  )

  return rides
}

// Get ride history for parent (from both cancelled and completed tables)
export const getRideHistory = async () => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    // Get completed rides - with better error handling
    const { data: completedRidesData, error: completedRidesError } = await supabase
      .from("completed_rides")
      .select("*")
      .eq("parent_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(10)

    if (completedRidesError) {
      console.error("Error fetching completed rides:", completedRidesError)
      // Don't throw error, just log it and continue with empty array
    }

    // Get cancelled rides - with better error handling
    const { data: cancelledRidesData, error: cancelledRidesError } = await supabase
      .from("cancelled_rides")
      .select("*")
      .eq("parent_id", user.id)
      .order("cancelled_at", { ascending: false })
      .limit(10)

    if (cancelledRidesError) {
      console.error("Error fetching cancelled rides:", cancelledRidesError)
      // Don't throw error, just log it and continue with empty array
    }

    // Use empty arrays if data fetch failed
    const safeCompletedRides = completedRidesData || []
    const safeCancelledRides = cancelledRidesData || []

    // Format completed rides data
    const completedRides: Ride[] = await Promise.all(
      safeCompletedRides.map(async (ride) => {
        // Fetch child data
        const { data: childData, error: childError } = await supabase
          .from("children")
          .select("*")
          .eq("id", ride.child_id)
          .single()

        if (childError && childError.code !== "PGRST116") {
          console.error("Error fetching child data:", childError)
        }

        // Fetch parent data
        const { data: parentData, error: parentError } = await supabase
          .from("users")
          .select("*")
          .eq("id", ride.parent_id)
          .single()

        if (parentError) {
          console.error("Error fetching parent data:", parentError)
        }

        // Fetch driver data
        const { data: driverData, error: driverError } = await supabase
          .from("users")
          .select("*")
          .eq("id", ride.driver_id)
          .single()

        if (driverError) {
          console.error("Error fetching driver data:", driverError)
        }

        // Get driver's car details
        const { data: carData, error: carError } = await supabase
          .from("cars")
          .select("*")
          .eq("driver_id", ride.driver_id)
          .maybeSingle()

        if (carError && carError.code !== "PGRST116") {
          console.error("Error fetching car data:", carError)
        }

        // Check if ride has been rated
        const { data: ratingData, error: ratingError } = await supabase
          .from("ratings")
          .select("*")
          .eq("ride_id", ride.original_ride_id)
          .eq("rater_id", user.id)
          .maybeSingle()

        if (ratingError) {
          console.error("Error checking rating:", ratingError)
        }

        return {
          id: ride.original_ride_id,
          child: childData
            ? {
                id: childData.id,
                name: childData.name,
                surname: childData.surname,
              }
            : { id: "", name: "Unknown", surname: "" },
          parent: parentData
            ? {
                id: parentData.id,
                name: `${parentData.name} ${parentData.surname}`,
                phoneNumber: parentData.phone_number,
              }
            : { id: "", name: "Unknown", phoneNumber: "" },
          driver: {
            id: driverData.id,
            name: `${driverData.name} ${driverData.surname}`,
            profilePic: driverData.profile_pic || "/placeholder.svg?height=48&width=48",
            carDetails: carData
              ? `${carData.color} ${carData.make} ${carData.model} (${carData.registration})`
              : "Vehicle information not available",
            rating: 0, // Not needed for history
          },
          origin: {
            lat: Number.parseFloat(ride.origin_lat),
            lng: Number.parseFloat(ride.origin_lng),
            address: ride.origin_address,
          },
          destination: {
            lat: Number.parseFloat(ride.destination_lat),
            lng: Number.parseFloat(ride.destination_lng),
            address: ride.destination_address,
            name: ride.destination_name,
          },
          scheduledTime: ride.scheduled_time,
          status: "completed",
          otp: ride.otp,
          currentLocation: {
            lat: Number.parseFloat(ride.current_location_lat || ride.origin_lat),
            lng: Number.parseFloat(ride.current_location_lng || ride.origin_lng),
            address: ride.current_location_address || ride.origin_address,
          },
          estimatedArrival: ride.estimated_arrival,
          completedAt: ride.completed_at,
          fare: ride.fare,
          isRated: !!ratingData,
        }
      }),
    )

    // Format cancelled rides data
    const cancelledRides: Ride[] = await Promise.all(
      safeCancelledRides.map(async (ride) => {
        // Fetch child data
        const { data: childData, error: childError } = await supabase
          .from("children")
          .select("*")
          .eq("id", ride.child_id)
          .single()

        if (childError && childError.code !== "PGRST116") {
          console.error("Error fetching child data:", childError)
        }

        // Fetch parent data
        const { data: parentData, error: parentError } = await supabase
          .from("users")
          .select("*")
          .eq("id", ride.parent_id)
          .single()

        if (parentError) {
          console.error("Error fetching parent data:", parentError)
        }

        // Fetch driver data
        const { data: driverData, error: driverError } = await supabase
          .from("users")
          .select("*")
          .eq("id", ride.driver_id)
          .single()

        if (driverError) {
          console.error("Error fetching driver data:", driverError)
        }

        // Get driver's car details
        const { data: carData, error: carError } = await supabase
          .from("cars")
          .select("*")
          .eq("driver_id", ride.driver_id)
          .maybeSingle()

        if (carError && carError.code !== "PGRST116") {
          console.error("Error fetching car data:", carError)
        }

        // Fetch cancelled by user data
        const { data: cancelledByUserData, error: cancelledByUserError } = await supabase
          .from("users")
          .select("id, name, surname, user_type")
          .eq("id", ride.cancelled_by)
          .maybeSingle()

        if (cancelledByUserError && cancelledByUserError.code !== "PGRST116") {
          console.error("Error fetching cancelled by user data:", cancelledByUserError)
        }

        return {
          id: ride.original_ride_id,
          child: childData
            ? {
                id: childData.id,
                name: childData.name,
                surname: childData.surname,
              }
            : { id: "", name: "Unknown", surname: "" },
          parent: parentData
            ? {
                id: parentData.id,
                name: `${parentData.name} ${parentData.surname}`,
                phoneNumber: parentData.phone_number,
              }
            : { id: "", name: "Unknown", phoneNumber: "" },
          driver: {
            id: driverData.id,
            name: `${driverData.name} ${driverData.surname}`,
            profilePic: driverData.profile_pic || "/placeholder.svg?height=48&width=48",
            carDetails: "", // Not needed for history
            rating: 0, // Not needed for history
          },
          origin: {
            lat: Number.parseFloat(ride.origin_lat),
            lng: Number.parseFloat(ride.origin_lng),
            address: ride.origin_address,
          },
          destination: {
            lat: Number.parseFloat(ride.destination_lat),
            lng: Number.parseFloat(ride.destination_lng),
            address: ride.destination_address,
            name: ride.destination_name,
          },
          scheduledTime: ride.scheduled_time,
          status: "cancelled",
          otp: ride.otp,
          currentLocation: {
            lat: Number.parseFloat(ride.current_location_lat || ride.origin_lat),
            lng: Number.parseFloat(ride.current_location_lng || ride.origin_lng),
            address: ride.current_location_address || ride.origin_address,
          },
          estimatedArrival: ride.estimated_arrival,
          cancelledAt: ride.cancelled_at,
          cancelledBy: ride.cancelled_by,
          cancelledByType: cancelledByUserData?.user_type || "unknown",
          cancellationReason: ride.cancellation_reason,
          fare: ride.fare,
        }
      }),
    )

    // Combine and sort by date
    const allRides = [...completedRides, ...cancelledRides].sort((a, b) => {
      const dateA = new Date(a.completedAt || a.cancelledAt || a.scheduledTime)
      const dateB = new Date(b.completedAt || b.cancelledAt || b.scheduledTime)
      return dateB.getTime() - dateA.getTime()
    })

    return allRides.slice(0, 20) // Return latest 20 rides
  } catch (error: any) {
    console.error("Error in getRideHistory:", error)
    // Return empty array instead of throwing to prevent dashboard crashes
    return []
  }
}

// Get rides for driver (from both active rides and history tables)
export const getDriverRides = async () => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    // Get active rides for the driver - only scheduled and in_progress
    const { data: activeRidesData, error: activeRidesError } = await supabase
      .from("rides")
      .select(`
        *,
        children:child_id (id, name, surname),
        parent:parent_id (id, name, surname, phone_number),
        driver:driver_id (id, name, surname, profile_pic)
      `)
      .eq("driver_id", user.id)
      .in("status", ["scheduled", "in_progress"])
      .order("scheduled_time", { ascending: true })

    if (activeRidesError) {
      throw new Error(activeRidesError.message)
    }

    // Get completed rides for the driver - with better error handling
    const { data: completedRidesData, error: completedRidesError } = await supabase
      .from("completed_rides")
      .select("*")
      .eq("driver_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(20)

    if (completedRidesError) {
      console.error("Error fetching completed rides:", completedRidesError)
    }

    // Get cancelled rides for the driver - with better error handling
    const { data: cancelledRidesData, error: cancelledRidesError } = await supabase
      .from("cancelled_rides")
      .select("*")
      .eq("driver_id", user.id)
      .order("cancelled_at", { ascending: false })
      .limit(20)

    if (cancelledRidesError) {
      console.error("Error fetching cancelled rides:", cancelledRidesError)
    }

    // Use empty arrays if data fetch failed
    const safeCompletedRides = completedRidesData || []
    const safeCancelledRides = cancelledRidesData || []

    // Format active rides data (only rides that are actually active)
    const activeRides: Ride[] = await Promise.all(
      activeRidesData.map(async (ride) => {
        // Get driver's car details
        const { data: carData, error: carError } = await supabase
          .from("cars")
          .select("*")
          .eq("driver_id", ride.driver.id)
          .single()

        if (carError && carError.code !== "PGRST116") {
          throw new Error(carError.message)
        }

        return {
          id: ride.id,
          child: {
            id: ride.children.id,
            name: ride.children.name,
            surname: ride.children.surname,
          },
          parent: {
            id: ride.parent.id,
            name: `${ride.parent.name} ${ride.parent.surname}`,
            phoneNumber: ride.parent.phone_number,
          },
          driver: {
            id: ride.driver.id,
            name: `${ride.driver.name} ${ride.driver.surname}`,
            profilePic: ride.driver.profile_pic || "/placeholder.svg?height=48&width=48",
            carDetails: carData
              ? `${carData.color} ${carData.make} ${carData.model} (${carData.registration})`
              : "Vehicle information not available",
            rating: 0, // Not needed here
          },
          origin: {
            lat: Number.parseFloat(ride.origin_lat),
            lng: Number.parseFloat(ride.origin_lng),
            address: ride.origin_address,
          },
          destination: {
            lat: Number.parseFloat(ride.destination_lat),
            lng: Number.parseFloat(ride.destination_lng),
            address: ride.destination_address,
            name: ride.destination_name,
          },
          scheduledTime: ride.scheduled_time,
          status: ride.status,
          otp: ride.otp,
          otp_generated_at: ride.otp_generated_at,
          currentLocation: {
            lat: Number.parseFloat(ride.current_location_lat || ride.origin_lat),
            lng: Number.parseFloat(ride.current_location_lng || ride.origin_lng),
            address: ride.current_location_address || ride.origin_address,
          },
          estimatedArrival: ride.estimated_arrival,
          fare: ride.fare,
        }
      }),
    )

    // Format completed rides data
    const completedRides: Ride[] = await Promise.all(
      safeCompletedRides.map(async (ride) => {
        // Fetch child data
        const { data: childData, error: childError } = await supabase
          .from("children")
          .select("*")
          .eq("id", ride.child_id)
          .single()

        if (childError && childError.code !== "PGRST116") {
          console.error("Error fetching child data:", childError)
        }

        // Fetch parent data
        const { data: parentData, error: parentError } = await supabase
          .from("users")
          .select("*")
          .eq("id", ride.parent_id)
          .single()

        if (parentError) {
          console.error("Error fetching parent data:", parentError)
        }

        // Check if ride has been rated
        const { data: ratingData, error: ratingError } = await supabase
          .from("ratings")
          .select("*")
          .eq("ride_id", ride.original_ride_id)
          .eq("rater_id", user.id)
          .maybeSingle()

        if (ratingError) {
          console.error("Error checking rating:", ratingError)
        }

        return {
          id: ride.original_ride_id,
          child: childData
            ? {
                id: childData.id,
                name: childData.name,
                surname: childData.surname,
              }
            : { id: "", name: "Unknown", surname: "" },
          parent: parentData
            ? {
                id: parentData.id,
                name: `${parentData.name} ${parentData.surname}`,
                phoneNumber: parentData.phone_number,
              }
            : { id: "", name: "Unknown", phoneNumber: "" },
          driver: {
            id: user.id,
            name: user.name,
            profilePic: user.profilePic || "/placeholder.svg?height=48&width=48",
            carDetails: "", // Not needed for history
            rating: 0, // Not needed for history
          },
          origin: {
            lat: Number.parseFloat(ride.origin_lat),
            lng: Number.parseFloat(ride.origin_lng),
            address: ride.origin_address,
          },
          destination: {
            lat: Number.parseFloat(ride.destination_lat),
            lng: Number.parseFloat(ride.destination_lng),
            address: ride.destination_address,
            name: ride.destination_name,
          },
          scheduledTime: ride.scheduled_time,
          status: "completed",
          otp: ride.otp,
          currentLocation: {
            lat: Number.parseFloat(ride.current_location_lat || ride.origin_lat),
            lng: Number.parseFloat(ride.current_location_lng || ride.origin_lng),
            address: ride.current_location_address || ride.origin_address,
          },
          estimatedArrival: ride.estimated_arrival,
          completedAt: ride.completed_at,
          fare: ride.fare,
          isRated: !!ratingData,
        }
      }),
    )

    // Format cancelled rides data
    const cancelledRides: Ride[] = await Promise.all(
      safeCancelledRides.map(async (ride) => {
        // Fetch child data
        const { data: childData, error: childError } = await supabase
          .from("children")
          .select("*")
          .eq("id", ride.child_id)
          .single()

        if (childError && childError.code !== "PGRST116") {
          console.error("Error fetching child data:", childError)
        }

        // Fetch parent data
        const { data: parentData, error: parentError } = await supabase
          .from("users")
          .select("*")
          .eq("id", ride.parent_id)
          .single()

        if (parentError) {
          console.error("Error fetching parent data:", parentError)
        }

        // Fetch cancelled by user data
        const { data: cancelledByUserData, error: cancelledByUserError } = await supabase
          .from("users")
          .select("id, name, surname, user_type")
          .eq("id", ride.cancelled_by)
          .maybeSingle()

        if (cancelledByUserError && cancelledByUserError.code !== "PGRST116") {
          console.error("Error fetching cancelled by user data:", cancelledByUserError)
        }

        return {
          id: ride.original_ride_id,
          child: childData
            ? {
                id: childData.id,
                name: childData.name,
                surname: childData.surname,
              }
            : { id: "", name: "Unknown", surname: "" },
          parent: parentData
            ? {
                id: parentData.id,
                name: `${parentData.name} ${parentData.surname}`,
                phoneNumber: parentData.phone_number,
              }
            : { id: "", name: "Unknown", phoneNumber: "" },
          driver: {
            id: user.id,
            name: user.name,
            profilePic: user.profilePic || "/placeholder.svg?height=48&width=48",
            carDetails: "", // Not needed for history
            rating: 0, // Not needed for history
          },
          origin: {
            lat: Number.parseFloat(ride.origin_lat),
            lng: Number.parseFloat(ride.origin_lng),
            address: ride.origin_address,
          },
          destination: {
            lat: Number.parseFloat(ride.destination_lat),
            lng: Number.parseFloat(ride.destination_lng),
            address: ride.destination_address,
            name: ride.destination_name,
          },
          scheduledTime: ride.scheduled_time,
          status: "cancelled",
          otp: ride.otp,
          currentLocation: {
            lat: Number.parseFloat(ride.current_location_lat || ride.origin_lat),
            lng: Number.parseFloat(ride.current_location_lng || ride.origin_lng),
            address: ride.current_location_address || ride.origin_address,
          },
          estimatedArrival: ride.estimated_arrival,
          cancelledAt: ride.cancelled_at,
          cancelledBy: ride.cancelled_by,
          cancelledByType: cancelledByUserData?.user_type || "unknown",
          cancellationReason: ride.cancellation_reason,
          fare: ride.fare,
        }
      }),
    )

    // Combine history rides and sort by date
    const historyRides = [...completedRides, ...cancelledRides].sort((a, b) => {
      const dateA = new Date(a.completedAt || a.cancelledAt || a.scheduledTime)
      const dateB = new Date(b.completedAt || b.cancelledAt || b.scheduledTime)
      return dateB.getTime() - dateA.getTime()
    })

    return {
      active: activeRides, // This will only contain scheduled and in_progress rides
      history: historyRides.slice(0, 20), // Return latest 20 rides
    }
  } catch (error: any) {
    console.error("Error in getDriverRides:", error)
    // Return safe defaults
    return {
      active: [],
      history: [],
    }
  }
}

// Get ride requests for driver
export const getRideRequests = async () => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    // Only get ride requests if driver is online
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_online")
      .eq("id", user.id)
      .single()

    if (userError) {
      throw new Error(`Failed to check online status: ${userError.message}`)
    }

    if (!userData.is_online) {
      console.log("Driver is offline, not fetching ride requests")
      return []
    }

    // Get pending ride requests that haven't been accepted by this driver
    const { data: requestsData, error: requestsError } = await supabase
      .from("ride_requests")
      .select(`
        *,
        children:child_id (id, name, surname),
        parent:parent_id (id, name, surname, phone_number)
      `)
      .eq("status", "pending")
      .order("scheduled_time", { ascending: true })

    if (requestsError) {
      throw new Error(`Failed to fetch ride requests: ${requestsError.message}`)
    }

    // Also check if this driver has any active rides that might correspond to these requests
    const { data: activeRides, error: activeRidesError } = await supabase
      .from("rides")
      .select("request_id")
      .eq("driver_id", user.id)
      .in("status", ["scheduled", "in_progress"])

    if (activeRidesError) {
      console.error("Error checking active rides:", activeRidesError)
    }

    const acceptedRequestIds = new Set(activeRides?.map((ride) => ride.request_id) || [])

    // Filter out requests that have been accepted by this driver
    const filteredRequests = requestsData.filter((request) => !acceptedRequestIds.has(request.id))

    // Format ride requests data
    const requests: RideRequest[] = filteredRequests.map((request) => ({
      id: request.id,
      child: {
        id: request.children.id,
        name: request.children.name,
        surname: request.children.surname,
      },
      parent: {
        id: request.parent.id,
        name: `${request.parent.name} ${request.parent.surname}`,
        phoneNumber: request.parent.phone_number,
      },
      origin: {
        lat: Number.parseFloat(request.origin_lat),
        lng: Number.parseFloat(request.origin_lng),
        address: request.origin_address,
      },
      destination: {
        lat: Number.parseFloat(request.destination_lat),
        lng: Number.parseFloat(request.destination_lng),
        address: request.destination_address,
        name: request.destination_name,
      },
      scheduledTime: request.scheduled_time,
      estimatedFare: Number.parseFloat(request.estimated_fare),
      notes: request.notes,
    }))

    return requests
  } catch (error: any) {
    console.error("Error fetching ride requests:", error)
    throw new Error(error.message || "Failed to fetch ride requests")
  }
}

// Request a ride
export const requestRide = async (rideData: any) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    // Check wallet balance
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("wallet_balance")
      .eq("id", user.id)
      .single()

    if (userError) {
      throw new Error(`Failed to check wallet balance: ${userError.message}`)
    }

    // Calculate estimated fare (simplified for demo)
    const estimatedFare = rideData.estimatedFare || 50.0 + Math.random() * 20

    // Check if wallet balance is sufficient
    if ((userData.wallet_balance || 0) < estimatedFare) {
      throw new Error("Insufficient wallet balance. Please add funds to your wallet.")
    }

    // Get geocoded coordinates (in a real app, you would use a geocoding API)
    let originCoords, destinationCoords

    if (rideData.useCurrentLocation && navigator.geolocation) {
      // Use browser geolocation if available and requested
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          })
        })

        originCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
      } catch (error) {
        console.error("Error getting current location:", error)
        originCoords = await getCoordinatesFromAddress(rideData.pickupAddress)
      }
    } else if (rideData.pickupCoordinates) {
      // Use provided coordinates if available
      originCoords = rideData.pickupCoordinates
    } else {
      originCoords = await getCoordinatesFromAddress(rideData.pickupAddress)
    }

    // Use provided destination coordinates if available
    if (rideData.dropoffCoordinates) {
      destinationCoords = rideData.dropoffCoordinates
    } else {
      destinationCoords = await getCoordinatesFromAddress(rideData.dropoffAddress)
    }

    // Use the server-side API endpoint to create the ride request
    const response = await fetch("/api/create-ride-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        childId: rideData.childId,
        parentId: user.id,
        pickupAddress: rideData.pickupAddress,
        pickupCoordinates: originCoords,
        dropoffAddress: rideData.dropoffAddress,
        dropoffCoordinates: destinationCoords,
        pickupDate: rideData.pickupDate,
        pickupTime: rideData.pickupTime,
        rideType: rideData.rideType,
        estimatedFare: estimatedFare,
        notes: rideData.notes,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create ride request")
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("Error requesting ride:", error)
    throw new Error(error.message || "Failed to request ride. Please try again.")
  }
}

// Helper function to simulate geocoding
const getCoordinatesFromAddress = async (address: string) => {
  // In a real app, you would use a geocoding API like Google Maps Geocoding API
  // For demo purposes, we'll return random coordinates around Johannesburg
  const jnbLat = -26.2041
  const jnbLng = 28.0473

  // Generate random coordinates within ~5km of Johannesburg
  const lat = jnbLat + (Math.random() - 0.5) * 0.05
  const lng = jnbLng + (Math.random() - 0.5) * 0.05

  return { lat, lng }
}

// Import the final enhanced functions
import {
  cancelRideFinal,
  completeRideFinal,
  checkWalletBalance,
  getUserBalance,
} from "./api-final-ride-operations-fixed"

// Replace the existing functions
export const cancelRide = cancelRideFinal
export const completeRide = completeRideFinal

// Export the utility functions
export { checkWalletBalance, getUserBalance }

// Delete user account - updated to use the new function
export const deleteUserAccount = async () => {
  const supabase = getBrowserClient()

  try {
    console.log("Starting account deletion...")

    // Call the database deletion function
    const { data, error } = await supabase.rpc("delete_my_account")

    if (error) {
      console.error("Database deletion error:", error)
      throw new Error(`Failed to delete account data: ${error.message}`)
    }

    console.log("Database deletion successful:", data)

    // Try to delete from Supabase Auth via API
    try {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
      const response = await fetch("/api/delete-user-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: currentUser.id }),
      })

      const result = await response.json()

      if (result.warning) {
        console.warn("Auth deletion warning:", result.warning)
      }
    } catch (authError) {
      console.warn("Auth deletion failed, but continuing:", authError)
    }

    // Sign out from current session
    try {
      await supabase.auth.signOut()
    } catch (signOutError) {
      console.warn("Sign out failed:", signOutError)
    }

    // Clear all local storage
    if (typeof window !== "undefined") {
      localStorage.removeItem("user")
      localStorage.removeItem("password_reset_otp")
      localStorage.removeItem("temp_new_password")
      // Clear any other app-specific storage
      localStorage.clear()
    }

    console.log("Account deletion completed successfully")
    return true
  } catch (error) {
    console.error("Error in deleteUserAccount:", error)
    throw error
  }
}

// Get notifications
export const getNotifications = async () => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get notifications for the user
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Update notification
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId)
    .eq("user_id", user.id) // Ensure the user owns this notification

  if (error) {
    throw new Error(error.message)
  }

  return true
}

// Get messages between current user and another user
export const getMessages = async (otherUserId: string, rideId?: string) => {
  try {
    const supabase = getBrowserClient()

    // Get current user from localStorage
    const userJson = localStorage.getItem("user")

    if (!userJson) {
      throw new Error("User not authenticated")
    }

    const user = JSON.parse(userJson)

    // Check if IDs are valid
    if (!user.id || !otherUserId) {
      console.error("Invalid user IDs:", { currentUserId: user.id, otherUserId })
      return []
    }

    // Use separate queries and combine results instead of OR condition
    const sentMessages = await supabase
      .from("messages")
      .select("*")
      .eq("sender_id", user.id)
      .eq("recipient_id", otherUserId)
      .eq("archived", false)
      .order("created_at", { ascending: true })

    if (rideId) {
      sentMessages.eq("ride_id", rideId)
    }

    const receivedMessages = await supabase
      .from("messages")
      .select("*")
      .eq("sender_id", otherUserId)
      .eq("recipient_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: true })

    if (rideId) {
      receivedMessages.eq("ride_id", rideId)
    }

    if (sentMessages.error) {
      console.error("Error fetching sent messages:", sentMessages.error)
      throw new Error(sentMessages.error.message)
    }

    if (receivedMessages.error) {
      console.error("Error fetching received messages:", receivedMessages.error)
      throw new Error(receivedMessages.error.message)
    }

    // Combine and sort messages by timestamp
    const allMessages = [...(sentMessages.data || []), ...(receivedMessages.data || [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

    return allMessages
  } catch (error) {
    console.error("Error in getMessages:", error)
    // Return empty array instead of throwing to prevent UI crashes
    return []
  }
}

// Send a message to another user
export const sendMessage = async ({
  recipientId,
  content,
  rideId,
}: {
  recipientId: string
  content: string
  rideId?: string
}) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Comprehensive input validation
  if (!recipientId || typeof recipientId !== "string" || recipientId.trim() === "") {
    throw new Error("Invalid recipient ID")
  }

  if (recipientId === user.id) {
    throw new Error("Cannot send message to yourself")
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Message content cannot be empty")
  }

  if (content.length > 1000) {
    throw new Error("Message is too long (max 1000 characters)")
  }

  try {
    // First, verify that both users exist
    const { data: senderData, error: senderError } = await supabase
      .from("users")
      .select("id, name")
      .eq("id", user.id)
      .single()

    if (senderError || !senderData) {
      throw new Error("Sender account not found")
    }

    const { data: recipientData, error: recipientError } = await supabase
      .from("users")
      .select("id, name")
      .eq("id", recipientId)
      .single()

    if (recipientError || !recipientData) {
      throw new Error("Recipient not found")
    }

    // If rideId is provided, verify the ride exists and user has access
    if (rideId) {
      const { data: rideData, error: rideError } = await supabase
        .from("rides")
        .select("parent_id, driver_id")
        .eq("id", rideId)
        .single()

      if (rideError) {
        // Check if ride is in completed or cancelled tables
        const { data: completedRide } = await supabase
          .from("completed_rides")
          .select("parent_id, driver_id")
          .eq("original_ride_id", rideId)
          .single()

        const { data: cancelledRide } = await supabase
          .from("cancelled_rides")
          .select("parent_id, driver_id")
          .eq("original_ride_id", rideId)
          .single()

        const rideRecord = completedRide || cancelledRide

        if (!rideRecord) {
          throw new Error("Ride not found")
        }

        // Verify user has access to this ride
        if (rideRecord.parent_id !== user.id && rideRecord.driver_id !== user.id) {
          throw new Error("You don't have access to this ride")
        }
      } else if (rideData) {
        // Verify user has access to active ride
        if (rideData.parent_id !== user.id && rideData.driver_id !== user.id) {
          throw new Error("You don't have access to this ride")
        }
      }
    }

    // Insert message with retry logic
    let insertAttempts = 0
    const maxAttempts = 3
    let messageData = null

    while (insertAttempts < maxAttempts) {
      try {
        const { data, error } = await supabase
          .from("messages")
          .insert({
            sender_id: user.id,
            recipient_id: recipientId,
            content: content.trim(),
            ride_id: rideId,
            created_at: new Date().toISOString(),
            is_read: false,
            archived: false,
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        messageData = data
        break
      } catch (insertError: any) {
        insertAttempts++
        console.error(`Message insert attempt ${insertAttempts} failed:`, insertError)

        if (insertAttempts >= maxAttempts) {
          throw new Error(`Failed to send message after ${maxAttempts} attempts: ${insertError.message}`)
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * insertAttempts))
      }
    }

    if (!messageData) {
      throw new Error("Failed to send message: No data returned")
    }

    // Create notification for recipient (don't fail if this fails)
    try {
      await supabase.from("notifications").insert({
        user_id: recipientId,
        title: "New Message",
        content: `${senderData.name} sent you a message`,
        type: "message",
        created_at: new Date().toISOString(),
      })
    } catch (notificationError) {
      console.warn("Failed to create notification:", notificationError)
      // Don't fail the whole operation for notification
    }

    return messageData
  } catch (error: any) {
    console.error("Error in sendMessage:", error)

    // Provide specific error messages based on error type
    if (error.message.includes("not found")) {
      throw new Error("User not found")
    } else if (error.message.includes("network")) {
      throw new Error("Network error. Please check your connection and try again.")
    } else if (error.message.includes("timeout")) {
      throw new Error("Request timed out. Please try again.")
    } else {
      throw new Error(error.message || "Failed to send message")
    }
  }
}

// Update driver location
export const updateDriverLocation = async (rideId: string, lat: number, lng: number) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Update the ride with the new location
  const { error } = await supabase
    .from("rides")
    .update({
      current_location_lat: lat,
      current_location_lng: lng,
      current_location_address: "Current location", // In a real app, you would use reverse geocoding
      updated_at: new Date().toISOString(),
    })
    .eq("id", rideId)
    .eq("driver_id", user.id) // Ensure the driver owns this ride

  if (error) {
    throw new Error(error.message)
  }

  return true
}

// Update driver status (online/offline)
export const updateDriverStatus = async (isOnline: boolean) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    // Check if driver has a car if trying to go online
    if (isOnline) {
      const { data: carData, error: carError } = await supabase
        .from("cars")
        .select("id")
        .eq("driver_id", user.id)
        .maybeSingle()

      if (carError && carError.code !== "PGRST116") {
        throw new Error(`Failed to check car details: ${carError.message}`)
      }

      if (!carData) {
        throw new Error("You need to add a car before going online")
      }
    }

    // Update only the is_online field to avoid schema cache issues
    const { error } = await supabase
      .from("users")
      .update({
        is_online: isOnline,
      })
      .eq("id", user.id)
      .eq("user_type", "driver") // Ensure the user is a driver

    if (error) {
      throw new Error(`Failed to update driver status: ${error.message}`)
    }

    // Update the last_online field using a separate query if needed
    if (isOnline) {
      try {
        // Use RPC call to update last_online to avoid schema cache issues
        await supabase
          .rpc("update_driver_last_online", {
            driver_id: user.id,
            current_time: new Date().toISOString(),
          })
          .throwOnError()
      } catch (lastOnlineError) {
        console.warn("Could not update last_online, but driver is still online", lastOnlineError)
        // Don't fail the whole operation if just the timestamp update fails
      }
    }

    return true
  } catch (error: any) {
    console.error("Error updating driver status:", error)
    throw new Error(error.message || "Failed to update driver status")
  }
}

// Accept a ride request (driver side)
export const acceptRideRequest = async (requestId: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    // Call the server-side API endpoint to accept the ride request
    const response = await fetch("/api/accept-ride", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        driverId: user.id,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to accept ride request")
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error("Error accepting ride request:", error)
    throw new Error(error.message || "Failed to accept ride request")
  }
}

// Verify ride OTP
export const verifyRideOTP = async (rideId: string, otp: string) => {
  const supabase = getBrowserClient()

  // Get ride by ID
  const { data: rideData, error: rideError } = await supabase.from("rides").select("*").eq("id", rideId).single()

  if (rideError) {
    throw new Error(rideError.message)
  }

  if (!rideData) {
    throw new Error("Ride not found")
  }

  // Verify OTP - accept both the new constant OTP and the actual stored OTP
  if (otp !== "123456" && rideData.otp !== otp) {
    throw new Error("Invalid OTP")
  }

  // Check if OTP is expired (10 minutes validity)
  const otpGeneratedAt = new Date(rideData.otp_generated_at || new Date())
  const now = new Date()
  const diffMinutes = (now.getTime() - otpGeneratedAt.getTime()) / (1000 * 60)

  if (diffMinutes > 10) {
    throw new Error("OTP has expired. Please generate a new one.")
  }

  // Update ride status to in_progress
  const { error: updateError } = await supabase
    .from("rides")
    .update({
      status: "in_progress",
      current_location_lat: rideData.origin_lat,
      current_location_lng: rideData.origin_lng,
      current_location_address: rideData.origin_address,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rideId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  // Create notification for the parent
  await supabase.from("notifications").insert({
    user_id: rideData.parent_id,
    title: "Ride Started",
    content: "Your child's ride has started.",
    type: "ride_started",
    ride_id: rideId,
  })

  return true
}

// Verify ride OTP for driver (when starting a ride)
export const verifyRideOTPForDriver = async (rideId: string, otp: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get ride by ID and verify driver ownership
  const { data: rideData, error: rideError } = await supabase
    .from("rides")
    .select("*")
    .eq("id", rideId)
    .eq("driver_id", user.id) // Ensure driver owns this ride
    .single()

  if (rideError) {
    throw new Error(rideError.message)
  }

  if (!rideData) {
    throw new Error("Ride not found or you don't have permission to start it")
  }

  // Check if ride is in the correct status
  if (rideData.status !== "scheduled") {
    throw new Error("Ride cannot be started in its current status")
  }

  // Verify OTP - accept both the constant OTP and the actual stored OTP
  if (otp !== "123456" && rideData.otp !== otp) {
    throw new Error("Invalid OTP. Please check the code and try again.")
  }

  // Check if OTP is expired (10 minutes validity)
  if (rideData.otp_generated_at) {
    const otpGeneratedAt = new Date(rideData.otp_generated_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - otpGeneratedAt.getTime()) / (1000 * 60)

    if (diffMinutes > 10) {
      throw new Error("OTP has expired. Please ask the parent to generate a new one.")
    }
  }

  // Update ride status to in_progress
  const { error: updateError } = await supabase
    .from("rides")
    .update({
      status: "in_progress",
      current_location_lat: rideData.origin_lat,
      current_location_lng: rideData.origin_lng,
      current_location_address: rideData.origin_address,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rideId)

  if (updateError) {
    throw new Error(`Failed to start ride: ${updateError.message}`)
  }

  // Create notification for the parent
  try {
    await supabase.from("notifications").insert({
      user_id: rideData.parent_id,
      title: "Ride Started",
      content: "Your child's ride has started. You can track the progress in real-time.",
      type: "ride_started",
      ride_id: rideId,
    })
  } catch (notificationError) {
    console.error("Failed to create notification:", notificationError)
    // Don't fail the whole operation for notification
  }

  return {
    success: true,
    message: "Ride started successfully",
    rideId: rideId,
  }
}

// Generate OTP for a ride (parent side)
export const generateRideOTP = async (rideId: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Generate a random 6-digit OTP
  const otp = generateOTP() // Use the random OTP generator

  // Update the ride with the new OTP
  const { error } = await supabase
    .from("rides")
    .update({ otp, otp_generated_at: new Date().toISOString() })
    .eq("id", rideId)
    .eq("parent_id", user.id) // Ensure the parent owns this ride

  if (error) {
    throw new Error(error.message)
  }

  // Send notification to driver
  const { data: rideData } = await supabase.from("rides").select("driver_id").eq("id", rideId).single()

  if (rideData) {
    await supabase.from("notifications").insert({
      user_id: rideData.driver_id,
      title: "New OTP Generated",
      content: "The parent has generated a new OTP for the ride.",
      type: "otp_generated",
      ride_id: rideId,
    })
  }

  return otp
}

// Get driver earnings
export const getDriverEarnings = async () => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get all completed rides for the driver from the completed_rides table
  const { data: ridesData, error: ridesError } = await supabase
    .from("completed_rides")
    .select("*")
    .eq("driver_id", user.id)
    .order("completed_at", { ascending: false })

  if (ridesError) {
    throw new Error(ridesError.message)
  }

  // Calculate earnings
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  let todayEarnings = 0
  let weekEarnings = 0
  let monthEarnings = 0
  let totalEarnings = 0

  ridesData.forEach((ride) => {
    const rideDate = new Date(ride.completed_at)
    const fare = ride.fare || 0

    totalEarnings += fare

    if (rideDate >= today) {
      todayEarnings += fare
    }

    if (rideDate >= weekStart) {
      weekEarnings += fare
    }

    if (rideDate >= monthStart) {
      monthEarnings += fare
    }
  })

  return {
    today: todayEarnings,
    week: weekEarnings,
    month: monthEarnings,
    total: totalEarnings,
    rides: ridesData.length,
  }
}

// Rate a ride (parent rates driver or driver rates parent)
export const rateRide = async (rideId: string, rating: number, comment?: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Check if the ride exists in completed_rides table
  const { data: rideData, error: rideError } = await supabase
    .from("completed_rides")
    .select("*")
    .eq("original_ride_id", rideId)
    .single()

  if (rideError) {
    throw new Error(rideError.message)
  }

  if (!rideData) {
    throw new Error("Ride not found")
  }

  // Determine who is being rated
  let ratedUserId: string
  let ratedType: string
  if (user.id === rideData.parent_id) {
    // Parent is rating the driver
    ratedUserId = rideData.driver_id
    ratedType = "driver"
  } else if (user.id === rideData.driver_id) {
    // Driver is rating parent
    ratedUserId = rideData.parent_id
    ratedType = "parent"
  } else {
    throw new Error("You are not authorized to rate this ride")
  }

  // Add rating
  const { error: ratingError } = await supabase.from("ratings").insert({
    ride_id: rideId, // Use original ride ID for consistency
    rater_id: user.id,
    rated_id: ratedUserId,
    rated_type: ratedType,
    rating,
    comment,
  })

  if (ratingError) {
    throw new Error(ratingError.message)
  }

  return true
}

// Update car details
export const updateCarDetails = async (carData: any) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Check if car exists
  const { data: existingCar, error: carCheckError } = await supabase
    .from("cars")
    .select("id")
    .eq("driver_id", user.id)
    .maybeSingle()

  if (carCheckError) {
    throw new Error(carCheckError.message)
  }

  if (existingCar) {
    // Update existing car
    const { error: updateError } = await supabase
      .from("cars")
      .update({
        make: carData.make,
        model: carData.model,
        color: carData.color,
        registration: carData.registration,
        vin_number: carData.vinNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingCar.id)

    if (updateError) {
      throw new Error(updateError.message)
    }
  } else {
    // Create new car
    const { error: insertError } = await supabase.from("cars").insert({
      driver_id: user.id,
      make: carData.make,
      model: carData.model,
      color: carData.color,
      registration: carData.registration,
      vin_number: carData.vinNumber,
    })

    if (insertError) {
      throw new Error(insertError.message)
    }
  }

  return true
}

// Update user profile
export const updateUserProfile = async (userData: any) => {
  const supabase = getBrowserClient()
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}")

  if (!currentUser) {
    throw new Error("User not authenticated")
  }

  // Update user profile
  const { data, error } = await supabase
    .from("users")
    .update({
      name: userData.name,
      surname: userData.surname,
      phone_number: userData.phoneNumber,
      address: userData.address,
      gender: userData.gender,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentUser.id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Update local storage
  localStorage.setItem(
    "user",
    JSON.stringify({
      ...currentUser,
      name: userData.name,
      surname: userData.surname,
    }),
  )

  return data
}

// Update child details
export const updateChildDetails = async (childData: any) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get the child for this parent
  const { data: existingChild, error: childError } = await supabase
    .from("children")
    .select("id")
    .eq("parent_id", user.id)
    .single()

  if (childError) {
    throw new Error(childError.message)
  }

  // Update child details
  const { error } = await supabase
    .from("children")
    .update({
      name: childData.name,
      surname: childData.surname,
      id_number: childData.idNumber,
      school_name: childData.schoolName,
      school_address: childData.schoolAddress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingChild.id)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

// Add funds to wallet (for parents only)
export const addFundsToWallet = async (amount: number) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get current wallet balance and user type
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("wallet_balance, user_type")
    .eq("id", user.id)
    .single()

  if (userError) {
    throw new Error(userError.message)
  }

  // Check if user is a parent
  if (userData.user_type !== "parent") {
    throw new Error("Only parents can add funds to their wallet")
  }

  // Validate amount
  if (amount < 10) {
    throw new Error("Minimum amount is R10")
  }

  if (amount > 10000) {
    throw new Error("Maximum amount is R10,000 per transaction")
  }

  // Check if user has payment cards
  const cards = await getUserPaymentCards()
  if (cards.length === 0) {
    throw new Error("Please add a payment card before adding funds")
  }

  const currentBalance = userData.wallet_balance || 0
  const newBalance = currentBalance + amount

  // Update wallet balance
  const { error: updateError } = await supabase
    .from("users")
    .update({
      wallet_balance: newBalance,
    })
    .eq("id", user.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  // Add transaction record
  const { error: transactionError } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount,
    type: "credit",
    description: "Funds added to wallet via payment card",
  })

  if (transactionError) {
    throw new Error(transactionError.message)
  }

  return {
    newBalance,
    amount,
  }
}

// Withdraw funds from wallet (for drivers only)
export const withdrawFunds = async (amount: number) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Validate amount
  if (amount < 50) {
    throw new Error("Minimum withdrawal amount is R50")
  }

  if (amount > 5000) {
    throw new Error("Maximum withdrawal amount is R5,000 per transaction")
  }

  // Check if user has payment cards
  const cards = await getUserPaymentCards()
  if (cards.length === 0) {
    throw new Error("Please add a payment card before withdrawing funds")
  }

  // Get current wallet balance
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("wallet_balance, user_type")
    .eq("id", user.id)
    .single()

  if (userError) {
    throw new Error(userError.message)
  }

  // Check if user is a driver
  if (userData.user_type !== "driver") {
    throw new Error("Only drivers can withdraw funds")
  }

  const currentBalance = userData.wallet_balance || 0

  // Check if there are sufficient funds
  if (currentBalance < amount) {
    throw new Error("Insufficient funds in wallet")
  }

  const newBalance = currentBalance - amount

  // Update wallet balance
  const { error: updateError } = await supabase
    .from("users")
    .update({
      wallet_balance: newBalance,
    })
    .eq("id", user.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  // Add transaction record
  const { error: transactionError } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount,
    type: "debit",
    description: "Funds withdrawn from wallet to bank account",
  })

  if (transactionError) {
    throw new Error(transactionError.message)
  }

  return {
    newBalance,
    amount,
  }
}

// Get driver transactions with all types including fines
export const getDriverTransactionHistory = async (
  driverId: string,
  options: {
    limit?: number
    offset?: number
    timeRange?: "today" | "week" | "month" | "year" | "custom"
    customRange?: { from: Date; to: Date }
  } = {},
) => {
  return await driverTransactionManager.getDriverTransactions(driverId, options)
}

// Get comprehensive driver transaction summary
export const getDriverTransactionSummaryComplete = async (
  driverId: string,
  timeRange: "today" | "week" | "month" | "year" | "custom" = "month",
  customRange?: { from: Date; to: Date },
) => {
  return await driverTransactionManager.getDriverTransactionSummary(driverId, timeRange, customRange)
}

// Get driver transactions by date range - enhanced with all transaction types
export const getDriverTransactionsByRange = async (
  timeRange: string,
  customRange?: { from: Date | undefined; to: Date | undefined },
) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    // Use the enhanced driver transaction manager
    const options = {
      timeRange: timeRange as "today" | "week" | "month" | "year" | "custom",
      customRange:
        customRange?.from && customRange?.to
          ? {
              from: customRange.from,
              to: customRange.to,
            }
          : undefined,
    }

    const result = await driverTransactionManager.getDriverTransactions(user.id, options)
    return result.transactions
  } catch (error: any) {
    console.error("Error in getDriverTransactionsByRange:", error)
    return []
  }
}

// Get parent transactions by date range - fixed timestamp issue
export const getParentTransactionsByRange = async (
  timeRange: string,
  customRange?: { from: Date | undefined; to: Date | undefined },
) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get date range
  const { startDate, endDate } = getDateRangeForFilter(timeRange, customRange)

  // Get transactions for the parent within the date range
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

// Get driver rides by date range - fixed timestamp issue
export const getDriverRidesByRange = async (
  timeRange: string,
  customRange?: { from: Date | undefined; to: Date | undefined },
) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    // Get date range
    const { startDate, endDate } = getDateRangeForFilter(timeRange, customRange)

    // Get completed rides for the driver within date range
    const { data: completedRidesData, error: completedRidesError } = await supabase
      .from("completed_rides")
      .select("*")
      .eq("driver_id", user.id)
      .gte("completed_at", startDate)
      .lte("completed_at", endDate)
      .order("completed_at", { ascending: false })

    if (completedRidesError) {
      console.error("Error fetching completed rides:", completedRidesError)
    }

    // Get cancelled rides for the driver within date range
    const { data: cancelledRidesData, error: cancelledRidesError } = await supabase
      .from("cancelled_rides")
      .select("*")
      .eq("driver_id", user.id)
      .gte("cancelled_at", startDate)
      .lte("cancelled_at", endDate)
      .order("cancelled_at", { ascending: false })

    if (cancelledRidesError) {
      console.error("Error fetching cancelled rides:", cancelledRidesError)
    }

    // Use empty arrays if data fetch failed
    const safeCompletedRides = completedRidesData || []
    const safeCancelledRides = cancelledRidesData || []

    // Combine and format rides
    const allRides = [...safeCompletedRides, ...safeCancelledRides].map((ride) => ({
      id: ride.original_ride_id,
      scheduled_time: ride.scheduled_time,
      completed_at: ride.completed_at,
      cancelled_at: ride.cancelled_at,
      status: ride.completed_at ? "completed" : "cancelled",
      fare: ride.fare || 0,
      origin_address: ride.origin_address,
      destination_address: ride.destination_address,
      destination_name: ride.destination_name,
      cancellation_reason: ride.cancellation_reason,
    }))

    // Sort by date
    allRides.sort((a, b) => {
      const dateA = new Date(a.completed_at || a.cancelled_at || a.scheduled_time)
      const dateB = new Date(b.completed_at || b.cancelled_at || b.scheduled_time)
      return dateB.getTime() - dateA.getTime()
    })

    return allRides
  } catch (error: any) {
    console.error("Error in getDriverRidesByRange:", error)
    return []
  }
}

// Get parent rides by date range - fixed timestamp issue
export const getParentRidesByRange = async (
  timeRange: string,
  customRange?: { from: Date | undefined; to: Date | undefined },
) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  try {
    // Get date range
    const { startDate, endDate } = getDateRangeForFilter(timeRange, customRange)

    // Get completed rides for the parent within date range
    const { data: completedRidesData, error: completedRidesError } = await supabase
      .from("completed_rides")
      .select("*")
      .eq("parent_id", user.id)
      .gte("completed_at", startDate)
      .lte("completed_at", endDate)
      .order("completed_at", { ascending: false })

    if (completedRidesError) {
      console.error("Error fetching completed rides:", completedRidesError)
    }

    // Get cancelled rides for the parent within date range
    const { data: cancelledRidesData, error: cancelledRidesError } = await supabase
      .from("cancelled_rides")
      .select("*")
      .eq("parent_id", user.id)
      .gte("cancelled_at", startDate)
      .lte("cancelled_at", endDate)
      .order("cancelled_at", { ascending: false })

    if (cancelledRidesError) {
      console.error("Error fetching cancelled rides:", cancelledRidesError)
    }

    // Use empty arrays if data fetch failed
    const safeCompletedRides = completedRidesData || []
    const safeCancelledRides = cancelledRidesData || []

    // Get child and driver names for each ride
    const allRides = await Promise.all(
      [...safeCompletedRides, ...safeCancelledRides].map(async (ride) => {
        // Get child name
        const { data: childData } = await supabase
          .from("children")
          .select("name, surname")
          .eq("id", ride.child_id)
          .single()

        // Get driver name
        const { data: driverData } = await supabase
          .from("users")
          .select("name, surname")
          .eq("id", ride.driver_id)
          .single()

        return {
          id: ride.original_ride_id,
          scheduled_time: ride.scheduled_time,
          completed_at: ride.completed_at,
          cancelled_at: ride.cancelled_at,
          status: ride.completed_at ? "completed" : "cancelled",
          fare: ride.fare || 0,
          origin_address: ride.origin_address,
          destination_address: ride.destination_address,
          destination_name: ride.destination_name,
          child_name: childData ? `${childData.name} ${childData.surname}` : "Unknown",
          driver_name: driverData ? `${driverData.name} ${driverData.surname}` : "Unknown",
          cancellation_reason: ride.cancellation_reason,
        }
      }),
    )

    // Sort by date
    allRides.sort((a, b) => {
      const dateA = new Date(a.completed_at || a.cancelled_at || a.scheduled_time)
      const dateB = new Date(b.completed_at || b.cancelled_at || b.scheduled_time)
      return dateB.getTime() - dateA.getTime()
    })

    return allRides
  } catch (error: any) {
    console.error("Error in getParentRidesByRange:", error)
    return []
  }
}

// Get date range for filter (helper function) - fixed to handle custom ranges
export const getDateRangeForFilter = (
  filter: string,
  customRange?: { from: Date | undefined; to: Date | undefined },
) => {
  const now = new Date()
  let startDate: string
  let endDate: string = now.toISOString()

  if (filter === "custom" && customRange) {
    startDate = customRange.from ? customRange.from.toISOString() : new Date(now.getFullYear(), 0, 1).toISOString()
    endDate = customRange.to ? customRange.to.toISOString() : now.toISOString()
  } else {
    switch (filter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        break
      case "week":
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        startDate = weekStart.toISOString()
        break
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        break
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1).toISOString()
        break
      default:
        // Default to current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        break
    }
  }

  return { startDate, endDate }
}

// Helper function to generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Get ride messages for a specific ride
export const getRideMessages = async (rideId: string) => {
  try {
    const supabase = getBrowserClient()

    // Get current user from localStorage
    const userJson = localStorage.getItem("user")

    if (!userJson) {
      throw new Error("User not authenticated")
    }

    const user = JSON.parse(userJson)

    // Get messages for this specific ride
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("ride_id", rideId)
      .eq("archived", false)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching ride messages:", error)
      throw new Error(error.message)
    }

    return messages || []
  } catch (error) {
    console.error("Error in getRideMessages:", error)
    return []
  }
}

// Mark ride messages as read
export const markRideMessagesAsRead = async (rideId: string, senderId: string) => {
  try {
    const supabase = getBrowserClient()

    // Get current user from localStorage
    const userJson = localStorage.getItem("user")
    if (!userJson) return false

    const user = JSON.parse(userJson)

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("ride_id", rideId)
      .eq("sender_id", senderId)
      .eq("recipient_id", user.id)
      .eq("is_read", false)

    if (error) {
      console.error("Error marking ride messages as read:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in markRideMessagesAsRead:", error)
    return false
  }
}

// Update driver location API
export const updateDriverLocationAPI = async (rideId: string, lat: number, lng: number) => {
  try {
    const supabase = getBrowserClient()

    // Get current user from localStorage
    const userJson = localStorage.getItem("user")

    if (!userJson) {
      throw new Error("User not authenticated")
    }

    const user = JSON.parse(userJson)

    // Update the ride with the new location
    const { error } = await supabase
      .from("rides")
      .update({
        current_location_lat: lat,
        current_location_lng: lng,
        current_location_address: "Current location", // In a real app, you would use reverse geocoding
        updated_at: new Date().toISOString(),
      })
      .eq("id", rideId)
      .eq("driver_id", user.id) // Ensure the driver owns this ride

    if (error) {
      throw new Error(error.message)
    }

    return true
  } catch (error) {
    console.error("Error updating driver location:", error)
    throw error
  }
}

// Get unread message count for a specific sender
export const getUnreadMessageCount = async (senderId: string) => {
  try {
    const supabase = getBrowserClient()

    // Get current user from localStorage
    const userJson = localStorage.getItem("user")
    if (!userJson) return 0

    const user = JSON.parse(userJson)

    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", senderId)
      .eq("recipient_id", user.id)
      .eq("is_read", false)
      .eq("archived", false)

    if (error) {
      console.error("Error getting unread message count:", error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error("Error in getUnreadMessageCount:", error)
    return 0
  }
}

// Mark messages from a sender as read
export const markMessagesAsRead = async (senderId: string) => {
  try {
    const supabase = getBrowserClient()

    // Get current user from localStorage
    const userJson = localStorage.getItem("user")
    if (!userJson) return false

    const user = JSON.parse(userJson)

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", senderId)
      .eq("recipient_id", user.id)
      .eq("is_read", false)

    if (error) {
      console.error("Error marking messages as read:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error)
    return false
  }
}
