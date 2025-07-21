import { NextResponse } from "next/server"

export async function GET() {
  try {
    const timestamp = new Date().toISOString()

    return NextResponse.json({
      timestamp,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      utcOffset: new Date().getTimezoneOffset(),
    })
  } catch (error) {
    console.error("Time API error:", error)
    return NextResponse.json({ error: "Failed to get server time" }, { status: 500 })
  }
}
