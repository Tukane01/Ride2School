import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, title, content, type, rideId } = body

    if (!userId || !title || !content || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create a Supabase client with the service role token
    // This bypasses RLS policies
    const supabase = createRouteHandlerClient({ cookies })

    // Insert the notification
    const { data, error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      content,
      type,
      ride_id: rideId,
      is_read: false,
    })

    if (error) {
      console.error("Error creating notification:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error in create-notification API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
