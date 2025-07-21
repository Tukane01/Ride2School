import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Use the Google Maps API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "Google Maps API key is not configured on the server" }, { status: 500 })
    }

    return NextResponse.json({ apiKey })
  } catch (error) {
    console.error("Error in maps-key API route:", error)
    return NextResponse.json({ error: "Failed to retrieve Google Maps API key" }, { status: 500 })
  }
}
