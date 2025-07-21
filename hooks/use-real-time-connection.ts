"use client"

import { useState, useEffect } from "react"
import { getBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

type ConnectionStatus = "connected" | "disconnected" | "connecting"

export function useRealTimeConnection(rideId?: string, userId?: string) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const router = useRouter()

  useEffect(() => {
    if (!rideId || !userId) return

    const supabase = getBrowserClient()

    // Set status to connecting
    setStatus("connecting")

    // Subscribe to ride updates
    const rideChannel = supabase
      .channel(`ride:${rideId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          // Update timestamp to trigger a refresh
          setLastUpdate(new Date())

          // Notify on status changes
          const oldStatus = payload.old.status
          const newStatus = payload.new.status

          if (oldStatus !== newStatus) {
            toast({
              title: `Ride Status Updated`,
              description: `Ride status changed from ${oldStatus} to ${newStatus}`,
            })

            // Refresh the page data if status changes
            router.refresh()
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          // Check for location updates
          const newLat = payload.new.current_location_lat
          const newLng = payload.new.current_location_lng
          const oldLat = payload.old.current_location_lat
          const oldLng = payload.old.current_location_lng

          if (newLat !== oldLat || newLng !== oldLng) {
            setLastUpdate(new Date())
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setStatus("connected")
          console.log("Connected to ride updates")
        }
      })

    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`messages:${rideId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          // If the message is not from this user, show a notification
          if (payload.new.sender_id !== userId) {
            toast({
              title: "New Message",
              description: "You have received a new message",
            })

            // Update timestamp to trigger a refresh
            setLastUpdate(new Date())
          }
        },
      )
      .subscribe()

    return () => {
      // Clean up subscriptions
      supabase.removeChannel(rideChannel)
      supabase.removeChannel(messageChannel)
      setStatus("disconnected")
    }
  }, [rideId, userId, router])

  return { status, lastUpdate }
}
