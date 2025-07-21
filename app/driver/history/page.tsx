"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DriverNavbar } from "@/components/driver-navbar"
import { getUserProfile, getDriverRides } from "@/lib/api"
import { DownloadHistoryWithRange } from "@/components/download-history-with-range"
import { RideHistoryDashboard } from "@/components/ride-history-dashboard"
import { AlertCircle, CheckCircle, XCircle } from "lucide-react"

export default function DriverHistoryPage() {
  const [user, setUser] = useState<any>(null)
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [userData, ridesData] = await Promise.all([getUserProfile(), getDriverRides()])
        setUser(userData)
        setRides(ridesData.history || [])
      } catch (err: any) {
        setError(err.message || "Failed to fetch data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DriverNavbar />
        <main className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </main>
      </div>
    )
  }

  const completedRides = rides.filter((ride) => ride.status === "completed")
  const cancelledRides = rides.filter((ride) => ride.status === "cancelled")

  return (
    <div className="min-h-screen bg-gray-50">
      <DriverNavbar />
      <main className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">My History</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rides.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedRides.length}</div>
              <p className="text-xs text-muted-foreground">
                {rides.length > 0 ? Math.round((completedRides.length / rides.length) * 100) : 0}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{cancelledRides.length}</div>
              <p className="text-xs text-muted-foreground">
                {rides.length > 0 ? Math.round((cancelledRides.length / rides.length) * 100) : 0}% cancellation rate
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">Ride History</TabsTrigger>
            <TabsTrigger value="downloads">Downloads</TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <RideHistoryDashboard userType="driver" />
          </TabsContent>

          <TabsContent value="downloads">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DownloadHistoryWithRange
                type="rides"
                title="Ride History"
                description="Download your ride history in various formats."
              />

              <DownloadHistoryWithRange
                type="transactions"
                title="Transaction History"
                description="Download your transaction history in various formats."
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
