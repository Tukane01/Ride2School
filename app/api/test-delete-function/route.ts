import { getBrowserClient } from "@/lib/supabase"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = getBrowserClient()

    // Test if the function exists
    const { data, error } = await supabase.rpc("delete_my_account")

    if (error) {
      return NextResponse.json({
        exists: false,
        error: error.message,
        hint: "Run the create-delete-account-function.sql script first",
      })
    }

    return NextResponse.json({
      exists: true,
      message: "Delete function is available but user not authenticated for test",
    })
  } catch (error: any) {
    return NextResponse.json({
      exists: false,
      error: error.message,
    })
  }
}
