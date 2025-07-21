import { getBrowserClient } from "./supabase"
import { getDateRangeForFilter } from "./api"

// Get parent transactions by time range
export const getParentTransactionsByRange = async (
  parentId: string,
  timeRange: string,
  customRange?: { from: Date | undefined; to: Date | undefined },
) => {
  const supabase = getBrowserClient()
  const { startDate, endDate } = getDateRangeForFilter(timeRange, customRange)

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", parentId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching transactions:", error)
    throw new Error("Failed to fetch transactions")
  }

  return data || []
}

// Get parent rides by time range
export const getParentRidesByRange = async (
  parentId: string,
  timeRange: string,
  customRange?: { from: Date | undefined; to: Date | undefined },
) => {
  const supabase = getBrowserClient()
  const { startDate, endDate } = getDateRangeForFilter(timeRange, customRange)

  const { data, error } = await supabase
    .from("rides")
    .select(`
      *,
      children:child_id (id, name, surname),
      driver:driver_id (id, name, surname)
    `)
    .eq("parent_id", parentId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching rides:", error)
    throw new Error("Failed to fetch rides")
  }

  // Format the data for easier consumption
  const formattedRides = data.map((ride) => ({
    id: ride.id,
    scheduled_time: ride.scheduled_time,
    status: ride.status,
    origin_address: ride.origin_address,
    destination_address: ride.destination_address,
    fare: ride.fare,
    completed_at: ride.completed_at,
    cancelled_at: ride.cancelled_at,
    child_name: ride.children ? `${ride.children.name} ${ride.children.surname}` : "Unknown",
    driver_name: ride.driver ? `${ride.driver.name} ${ride.driver.surname}` : "Unknown",
  }))

  return formattedRides
}
