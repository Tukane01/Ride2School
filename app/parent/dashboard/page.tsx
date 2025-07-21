"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getUserProfile, getActiveRides, getRideHistory, cancelRide } from "@/lib/api"
import type { Ride } from "@/lib/types"
import ParentNavbar from "@/components/parent-navbar"
import RideRequestForm from "@/components/ride-request-form"
import RideTracker from "@/components/ride-tracker"
import RideRating from "@/components/ride-rating"
import DriverMap from "@/components/driver-map"
import { Clock, Calendar, AlertCircle, MessageSquare } from "lucide-react"
import { useRealTimeConnection } from "@/hooks/use-real-time-connection"
import { RideConnectionStatus } from "@/components/ride-connection-status"
import { MessageSystem } from "@/components/message-system"
import { RideRequestStatus } from "@/components/ride-request-status"
import CancellationWarningDialog from "@/components/cancellation-warning-dialog"
import { toast } from "@/components/ui/use-toast"
import { formatTime, formatDate } from "@/lib/time-sync"

export default function ParentDashboard() {
  const [user, setUser] = useState<any>(null)
  const [activeRides, setActiveRides] = useState<Ride[]>([])
  const [rideHistory, setRideHistory] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rideToRate, setRideToRate] = useState<Ride | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showMapForRide, setShowMapForRide] = useState<string | null>(null)
  const [activeRideId, setActiveRideId] = useState<string | null>(null)
  const [showMessages, setShowMessages] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [showCancellationDialog, setShowCancellationDialog] = useState(false)
  const [rideToCancel, setRideToCancel] = useState<Ride | null>(null)

  const { status: connectionStatus, lastUpdate } = useRealTimeConnection(activeRideId || undefined, user?.id)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const userData = await getUserProfile()
        const activeRidesData = await getActiveRides()
        const rideHistoryData = await getRideHistory()

        setUser(userData)
        setActiveRides(activeRidesData)
        setRideHistory(rideHistoryData)

        if (activeRidesData.length > 0) {
          // Set the active ride ID for the first in-progress ride, or the first scheduled ride
          const inProgressRide = activeRidesData.find((ride) => ride.status === "in_progress")
          setActiveRideId(inProgressRide?.id || activeRidesData[0].id)
        } else {
          setActiveRideId(null)
        }
      } catch (err: any) {
        console.error("Error fetching data:", err)
        setError(err.message || "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up polling for active rides every 30 seconds
    const interval = setInterval(async () => {
      try {
        const activeRidesData = await getActiveRides()

        // Check if any rides were completed (removed from active rides)
        const completedRideIds = activeRides
          .filter((oldRide) => !activeRidesData.some((newRide) => newRide.id === oldRide.id))
          .map((ride) => ride.id)

        // Handle completed rides
        if (completedRideIds.length > 0) {
          for (const rideId of completedRideIds) {
            await handleRideCompleted(rideId)
          }
        } else {
          // Only update if no rides were completed to avoid double updates
          setActiveRides(activeRidesData)
        }
      } catch (error) {
        console.error("Error refreshing rides:", error)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [refreshTrigger, lastUpdate, activeRides])

  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)

      const [userData, activeRidesData, rideHistoryData] = await Promise.all([
        getUserProfile(),
        getActiveRides(),
        getRideHistory(),
      ])

      setUser(userData)
      setActiveRides(activeRidesData)
      setRideHistory(rideHistoryData)

      // Update active ride ID
      if (activeRidesData.length > 0) {
        const inProgressRide = activeRidesData.find((ride) => ride.status === "in_progress")
        setActiveRideId(inProgressRide?.id || activeRidesData[0].id)
      } else {
        setActiveRideId(null)
      }
    } catch (err: any) {
      console.error("Error refreshing data:", err)
      setError(err.message || "Failed to refresh data")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRide = async (rideId: string, reason?: string) => {
    try {
      setError(null)
      setLoading(true)

      // Call the API to cancel the ride
      const result = await cancelRide(rideId, reason)

      // Remove the cancelled ride from active rides immediately
      const updatedActiveRides = activeRides.filter((ride) => ride.id !== rideId)
      setActiveRides(updatedActiveRides)

      // Update active ride ID if the cancelled ride was the active one
      if (activeRideId === rideId) {
        const newActiveRide = updatedActiveRides.find((ride) => ride.status === "in_progress") || updatedActiveRides[0]
        setActiveRideId(newActiveRide?.id || null)
      }

      // Refresh data to get updated state
      try {
        const [activeRidesData, rideHistoryData] = await Promise.all([getActiveRides(), getRideHistory()])
        setActiveRides(activeRidesData)
        setRideHistory(rideHistoryData)
      } catch (refreshError) {
        console.error("Error refreshing data after cancellation:", refreshError)
        // Don't fail the operation if refresh fails
      }

      // Close dialog and clear state
      setShowCancellationDialog(false)
      setRideToCancel(null)

      // Show success message
      toast({
        title: "Ride Cancelled",
        description: result.message || "Your ride has been cancelled successfully.",
      })
    } catch (err: any) {
      console.error("Error cancelling ride:", err)
      setError(err.message || "Failed to cancel ride. Please try again.")

      // Don't close dialog on error so user can retry
      toast({
        title: "Cancellation Failed",
        description: err.message || "Failed to cancel ride. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRideClick = (ride: Ride) => {
    setRideToCancel(ride)
    setShowCancellationDialog(true)
  }

  const handleRideCompleted = async (rideId: string) => {
    try {
      // Remove the completed ride from active rides immediately
      const updatedActiveRides = activeRides.filter((ride) => ride.id !== rideId)
      setActiveRides(updatedActiveRides)

      // Update active ride ID if the completed ride was the active one
      if (activeRideId === rideId) {
        const newActiveRide = updatedActiveRides.find((ride) => ride.status === "in_progress") || updatedActiveRides[0]
        setActiveRideId(newActiveRide?.id || null)
      }

      // Refresh data to get updated history
      const [activeRidesData, rideHistoryData] = await Promise.all([getActiveRides(), getRideHistory()])
      setActiveRides(activeRidesData)
      setRideHistory(rideHistoryData)
    } catch (error) {
      console.error("Error handling ride completion:", error)
    }
  }

  const handleRateRide = (ride: Ride) => {
    setRideToRate(ride)
  }

  const toggleMap = (rideId: string) => {
    if (showMapForRide === rideId) {
      setShowMapForRide(null)
    } else {
      setShowMapForRide(rideId)
    }
  }

  const toggleMessages = (rideId: string) => {
    if (showMessages === rideId) {
      setShowMessages(null)
    } else {
      setShowMessages(rideId)
    }
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <>
        <ParentNavbar user={user} />
      </>

      <main className="container mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {rideToRate && (
          <RideRating
            ride={rideToRate}
            onRated={() => {
              setRideToRate(null)
              handleRefresh()
            }}
            onCancel={() => setRideToRate(null)}
          />
        )}

        <div className="grid grid-cols-1 gap-6">
          <div>
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active" id="active-tab">
                  Active Rides
                </TabsTrigger>
                <TabsTrigger value="request" id="request-tab">
                  Request Ride
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4">
                {activeRides.length > 0 ? (
                  <div className="space-y-4">
                    {activeRides.map((ride) => (
                      <Card key={ride.id} className="overflow-hidden">
                        <CardHeader className="bg-blue-50 pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">Ride to {ride.destination.name}</CardTitle>
                              <p className="text-sm text-gray-500">
                                <Clock className="inline-block mr-1 h-4 w-4" />
                                {formatTime(ride.scheduledTime)}
                                {" • "}
                                <Calendar className="inline-block mx-1 h-4 w-4" />
                                {formatDate(ride.scheduledTime)}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge
                                className={
                                  ride.status === "in_progress"
                                    ? "bg-green-500"
                                    : ride.status === "scheduled"
                                      ? "bg-blue-500"
                                      : "bg-yellow-500"
                                }
                              >
                                {ride.status === "in_progress"
                                  ? "In Progress"
                                  : ride.status === "scheduled"
                                    ? "Scheduled"
                                    : "Waiting"}
                              </Badge>
                              {activeRideId === ride.id && <RideConnectionStatus status={connectionStatus} />}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="flex items-center mb-4">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarImage src={ride.driver.profilePic || "/placeholder.svg"} alt={ride.driver.name} />
                              <AvatarFallback>{ride.driver.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{ride.driver.name}</p>
                              <p className="text-sm text-gray-500">{ride.driver.carDetails}</p>
                            </div>
                          </div>

                          <Button variant="outline" className="w-full mb-4" onClick={() => toggleMap(ride.id)}>
                            {showMapForRide === ride.id ? "Hide Map" : "Show Map"}
                          </Button>

                          {showMapForRide === ride.id && (
                            <div className="h-[250px] w-full rounded-md overflow-hidden mb-4">
                              <DriverMap
                                origin={ride.origin}
                                destination={ride.destination}
                                currentLocation={ride.currentLocation}
                              />
                            </div>
                          )}

                          {ride.status === "in_progress" && (
                            <div className="mb-4">
                              <Button
                                onClick={() => toggleMessages(ride.id)}
                                variant="outline"
                                className="w-full flex items-center"
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                {showMessages === ride.id ? "Hide Messages" : "Message Driver"}
                              </Button>

                              {showMessages === ride.id && (
                                <div className="mt-4">
                                  <MessageSystem
                                    recipientId={ride.driver.id}
                                    recipientName={ride.driver.name}
                                    recipientType="driver"
                                    rideId={ride.id}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <RideTracker ride={ride} />

                          {/* Only show cancel button for scheduled rides, not in-progress rides */}
                          {ride.status === "scheduled" && (
                            <Button
                              variant="outline"
                              className="w-full mt-4 text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => handleCancelRideClick(ride)}
                              disabled={loading}
                            >
                              Cancel Ride
                            </Button>
                          )}

                          {/* Show info message for in-progress rides */}
                          {ride.status === "in_progress" && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <p className="text-sm text-blue-700 text-center">
                                🚗 Ride is in progress. Contact driver directly if needed.
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-gray-500">No active rides</p>
                      <Button
                        className="mt-4 bg-blue-500 hover:bg-blue-600"
                        onClick={() => document.getElementById("request-tab")?.click()}
                      >
                        Request a Ride
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="request" className="mt-4">
                {success ? (
                  <RideRequestStatus requestId={requestId} onAccepted={handleRefresh} />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Request a Ride</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RideRequestForm
                        user={user}
                        onSuccess={(requestId) => {
                          setRequestId(requestId)
                          setSuccess(true)
                        }}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        {showCancellationDialog && rideToCancel && (
          <CancellationWarningDialog
            isOpen={showCancellationDialog}
            onClose={() => {
              setShowCancellationDialog(false)
              setRideToCancel(null)
            }}
            onConfirm={(reason) => handleCancelRide(rideToCancel.id, reason)}
            fare={rideToCancel.fare || 0}
            isLoading={loading}
            isInProgress={rideToCancel.status === "in_progress"}
            userType="parent"
          />
        )}
      </main>
    </div>
  )
}
