"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/lib/use-toast"

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}

export default function RealTimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    let mounted = true

    const setupNotifications = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user || !mounted) return

        // Fetch existing unread notifications
        const { data: existingNotifications } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .eq("read", false)
          .order("created_at", { ascending: false })

        if (existingNotifications && mounted) {
          setNotifications(existingNotifications)
        }

        // Set up real-time subscription
        const channel = supabase
          .channel("notifications")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              if (!mounted) return

              const newNotification = payload.new as Notification

              // Add to state
              setNotifications((prev) => [newNotification, ...prev])

              // Show toast notification
              toast({
                title: newNotification.title,
                description: newNotification.message,
                variant: newNotification.type === "error" ? "destructive" : "default",
              })
            },
          )
          .subscribe()

        return () => {
          if (mounted) {
            supabase.removeChannel(channel)
          }
        }
      } catch (error) {
        console.error("Error setting up notifications:", error)
      }
    }

    setupNotifications()

    return () => {
      mounted = false
    }
  }, [supabase, toast])

  // This component doesn't render anything visible
  return null
}
