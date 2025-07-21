import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the browser
export const createBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Create a singleton instance for the browser
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export const getBrowserClient = () => {
  if (!browserClient) {
    browserClient = createBrowserClient()
  }
  return browserClient
}

// Create a server client (to be used in Server Components or API routes)
export const createServerClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL as string
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

  return createClient(supabaseUrl, supabaseServiceKey)
}
