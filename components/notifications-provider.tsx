"use client"
import dynamic from "next/dynamic"

// Import the RealTimeNotifications component with SSR disabled
const RealTimeNotifications = dynamic(() => import("@/components/real-time-notifications"), { ssr: false })

export default function NotificationsProvider() {
  return <RealTimeNotifications />
}
