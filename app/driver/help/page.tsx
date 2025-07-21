"use client"

import { useState } from "react"
import DriverNavbar from "@/components/driver-navbar"
import HelpSection from "@/components/help-section"
import { getUserProfile } from "@/lib/api"

export default function DriverHelpPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useState(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        const userData = await getUserProfile()
        setUser(userData)
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DriverNavbar user={user} />

      <main className="container mx-auto px-4 py-6">
        <HelpSection userType="driver" />
      </main>
    </div>
  )
}
