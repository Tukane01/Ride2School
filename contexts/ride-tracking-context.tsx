"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Ride } from "@/lib/types"
import { getBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

type RideTrackingContextType = {
  activeRide: Ride | null
  setActiveRide: (ride: Ride | null) => void
  connectionStatus: "connected" | "disconnected" | "connecting"
  lastLocationUpdate: Date
  toggleMessagePanel: () => void
  showMessagePanel: boolean
}

const RideTrackingContext = createContext<RideTrackingContextType | undefined>(undefined)

export const RideTrackingProvider = ({ children, initialRide }: { children: ReactNode; initialRide?: Ride }) => {
  const [activeRide, setActiveRide] = useState<Ride | null>(initialRide || null)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected")
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date>(new Date())
  const [showMessagePanel, setShowMessagePanel] = useState(false)
  const router = useRouter()

  const toggleMessagePanel = () => {
    setShowMessagePanel((prev) => !prev)
  }

  useEffect(() => {
    if (!activeRide) return

    const supabase = getBrowserClient()
    setConnectionStatus("connecting")

    // Subscribe to ride updates
    const rideChannel = supabase
      .channel(`ride:${activeRide.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter: `id=eq.${activeRide.id}`,
        },
        (payload) => {
          try {
            // Handle status changes
            if (payload.old.status !== payload.new.status) {
              toast({
                title: `Ride Status Updated`,
                description: `Status changed to ${payload.new.status}`,
              })
              router.refresh()
            }

            // Handle location changes
            if (
              payload.new.current_location_lat !== payload.old.current_location_lat ||
              payload.new.current_location_lng !== payload.old.current_location_lng
            ) {
              setLastLocationUpdate(new Date())
            }
          } catch (error) {
            console.error("Error handling ride update:", error)
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected")
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus("disconnected")
        }
      })

    // Set up message notifications
    const messageChannel = supabase
      .channel(`messages:${activeRide.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `ride_id=eq.${activeRide.id}`,
        },
        (payload) => {
          try {
            toast({
              title: "New Message",
              description: "You received a message about this ride",
            })
          } catch (error) {
            console.error("Error handling message notification:", error)
          }
        },
      )
      .subscribe()

    // Cleanup function
    return () => {
      try {
        supabase.removeChannel(rideChannel)
        supabase.removeChannel(messageChannel)
      } catch (error) {
        console.error("Error cleaning up channels:", error)
      } finally {
        setConnectionStatus("disconnected")
      }
    }
  }, [activeRide, router])

  return (
    <RideTrackingContext.Provider
      value={{
        activeRide,
        setActiveRide,
        connectionStatus,
        lastLocationUpdate,
        toggleMessagePanel,
        showMessagePanel,
      }}
    >
      {children}
    </RideTrackingContext.Provider>
  )
}

export const useRideTracking = () => {
  const context = useContext(RideTrackingContext)
  if (context === undefined) {
    throw new Error("useRideTracking must be used within a RideTrackingProvider")
  }
  return context
}
