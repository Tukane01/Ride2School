import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

// This requires service role key for admin operations
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("Attempting to delete user from auth:", userId)

    // Delete user from Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error("Error deleting user from auth:", error)
      // Don't fail the entire process if auth deletion fails
      return NextResponse.json({
        success: true,
        warning: "Database deleted but auth deletion failed: " + error.message,
      })
    }

    console.log("Successfully deleted user from auth:", userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in delete-user-auth API:", error)
    return NextResponse.json({
      success: true,
      warning: "Database deleted but auth API failed: " + error.message,
    })
  }
}
