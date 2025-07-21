import { getBrowserClient } from "./supabase"

// Function to geocode an address using Google Maps API
export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number }> => {
  try {
    // First, try to get the API key from our secure endpoint
    const response = await fetch("/api/maps-key")
    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    const apiKey = data.apiKey

    // Use Google Maps Geocoding API with region biasing for South Africa
    const geocodingResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address,
      )}&key=${apiKey}&region=za&components=country:za`,
    )

    const geocodingData = await geocodingResponse.json()

    if (geocodingData.status !== "OK" || !geocodingData.results || geocodingData.results.length === 0) {
      throw new Error(`Geocoding failed: ${geocodingData.status}`)
    }

    const location = geocodingData.results[0].geometry.location

    // Save the geocoded address to our database for future use
    await saveGeocodedAddress(address, location.lat, location.lng)

    return { lat: location.lat, lng: location.lng }
  } catch (error) {
    console.error("Error geocoding address:", error)

    // Fallback to database for previously geocoded addresses
    try {
      const supabase = getBrowserClient()
      const { data, error: dbError } = await supabase
        .from("geocoded_addresses")
        .select("lat, lng")
        .eq("address", address)
        .single()

      if (dbError || !data) {
        throw new Error("Address not found in database")
      }

      return { lat: data.lat, lng: data.lng }
    } catch (dbError) {
      console.error("Error fetching from database:", dbError)

      // Final fallback to Johannesburg coordinates with slight randomization
      const jnbLat = -26.2041
      const jnbLng = 28.0473

      // Generate random coordinates within ~5km of Johannesburg
      const lat = jnbLat + (Math.random() - 0.5) * 0.05
      const lng = jnbLng + (Math.random() - 0.5) * 0.05

      return { lat, lng }
    }
  }
}

// Function to reverse geocode (get address from coordinates)
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    // Get API key from secure endpoint
    const response = await fetch("/api/maps-key")
    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    const apiKey = data.apiKey

    // Use Google Maps Reverse Geocoding API
    const geocodingResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&region=za&language=en`,
    )

    const geocodingData = await geocodingResponse.json()

    if (geocodingData.status !== "OK" || !geocodingData.results || geocodingData.results.length === 0) {
      throw new Error(`Reverse geocoding failed: ${geocodingData.status}`)
    }

    // Get the most accurate address (usually the first result)
    const address = geocodingData.results[0].formatted_address

    // Save to database for future use
    await saveGeocodedAddress(address, lat, lng)

    return address
  } catch (error) {
    console.error("Error reverse geocoding:", error)
    throw new Error("Could not determine address from location")
  }
}

// Function to save geocoded address to database for future use
export const saveGeocodedAddress = async (address: string, lat: number, lng: number): Promise<void> => {
  try {
    const supabase = getBrowserClient()

    // Check if address already exists
    const { data, error: checkError } = await supabase
      .from("geocoded_addresses")
      .select("id")
      .eq("address", address)
      .maybeSingle()

    if (checkError) {
      throw checkError
    }

    // If address exists, update it, otherwise insert new record
    if (data) {
      await supabase
        .from("geocoded_addresses")
        .update({ lat, lng, updated_at: new Date().toISOString() })
        .eq("id", data.id)
    } else {
      await supabase.from("geocoded_addresses").insert({
        address,
        lat,
        lng,
        created_at: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("Error saving geocoded address:", error)
    // Don't throw error, just log it
  }
}

// Function to validate if coordinates are within South Africa
export const validateSouthAfricanCoordinates = (lat: number, lng: number): boolean => {
  // South Africa rough bounding box
  const southAfricaBounds = {
    north: -22.0, // Northernmost point
    south: -35.0, // Southernmost point
    west: 16.0, // Westernmost point
    east: 33.0, // Easternmost point
  }

  return (
    lat >= southAfricaBounds.south &&
    lat <= southAfricaBounds.north &&
    lng >= southAfricaBounds.west &&
    lng <= southAfricaBounds.east
  )
}
