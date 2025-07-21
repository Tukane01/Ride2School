"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import {
  getUserProfile,
  getDriverRides,
  getRideRequests,
  acceptRideRequest,
  updateDriverStatus,
  completeRide,
  cancelRide,
} from "@/lib/api"
import type { Ride, RideRequest } from "@/lib/types"
import DriverNavbar from "@/components/driver-navbar"
import DriverMap from "@/components/driver-map"
import OTPVerification from "@/components/otp-verification"
import MessageSystem from "@/components/message-system"
import RideRequestTimer from "@/components/ride-request-timer"
import DownloadHistory from "@/components/download-history"
import { useRealTimeConnection } from "@/hooks/use-real-time-connection"
import { RideConnectionStatus } from "@/components/ride-connection-status"
import {
  MapPin,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  MessageSquare,
  AlertCircle,
  Navigation,
  Power,
} from "lucide-react"
import CancellationWarningDialog from "@/components/cancellation-warning-dialog"
import { useEnhancedLocationTracking } from "@/hooks/use-enhanced-location-tracking"
import EnhancedDriverMap from "@/components/enhanced-driver-map"
import { formatTime, formatDate } from "@/lib/time-sync"

export default function DriverDashboard() {
  const [user, setUser] = useState<any>(null)
  const [activeRides, setActiveRides] = useState<Ride[]>([])
  const [rideHistory, setRideHistory] = useState<Ride[]>([])
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [currentRide, setCurrentRide] = useState<Ride | null>(null)
  const [showMessages, setShowMessages] = useState<string | null>(null) // Store ride ID when showing messages
  const [showMap, setShowMap] = useState<string | null>(null) // Store ride ID when showing map
  const [isOnline, setIsOnline] = useState(false)
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0 })
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [activeRequest, setActiveRequest] = useState<RideRequest | null>(null)
  const [showRequestTimer, setShowRequestTimer] = useState(false)
  const locationWatchId = useRef<number | null>(null)
  const [navigationUrl, setNavigationUrl] = useState("")
  const [showCancellationDialog, setShowCancellationDialog] = useState(false)
  const [rideToCancel, setRideToCancel] = useState<Ride | null>(null)
  const router = useRouter()

  const { status: connectionStatus, lastUpdate } = useRealTimeConnection(currentRide?.id || undefined, user?.id)

  const {
    currentLocation: enhancedLocation,
    isTracking: isLocationTracking,
    accuracy,
    lastUpdate: locationLastUpdate,
    error: locationError,
    startTracking: startLocationTracking,
    stopTracking: stopLocationTracking,
  } = useEnhancedLocationTracking({
    rideId: currentRide?.id,
    updateInterval: 3000, // 3 seconds (changed from 10000)
    accuracyThreshold: 20, // 20 meters
    enableBackgroundTracking: true,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const userData = await getUserProfile()
        const driverRidesData = await getDriverRides()

        setUser(userData)
        setActiveRides(driverRidesData.active)
        setRideHistory(driverRidesData.history)

        // Calculate earnings
        calculateEarnings(driverRidesData.history)

        // Set current ride if there's an in-progress ride
        const inProgressRide = driverRidesData.active.find((ride) => ride.status === "in_progress")
        if (inProgressRide) {
          setCurrentRide(inProgressRide)
          setIsOnline(true) // If there's an active ride, driver must be online
        } else {
          // Set online status based on user data
          setIsOnline(userData.isOnline || false)
        }

        // Only fetch ride requests if driver is online
        if (userData.isOnline) {
          const rideRequestsData = await getRideRequests()
          setRideRequests(rideRequestsData)
        }
      } catch (error: any) {
        console.error("Error fetching data:", error)
        setError(error.message || "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up polling for active rides and requests every 15 seconds
    const interval = setInterval(async () => {
      if (isOnline) {
        try {
          const driverRidesData = await getDriverRides()
          const rideRequestsData = await getRideRequests()

          // Filter out any requests that might have been accepted by this driver
          const filteredRequests = rideRequestsData.filter((request) => {
            // Check if this request has been accepted by checking if there's an active ride with this request
            const hasActiveRide = driverRidesData.active.some(
              (ride) =>
                ride.origin.lat === request.origin.lat &&
                ride.origin.lng === request.origin.lng &&
                ride.destination.lat === request.destination.lat &&
                ride.destination.lng === request.destination.lng &&
                Math.abs(new Date(ride.scheduledTime).getTime() - new Date(request.scheduledTime).getTime()) < 60000, // Within 1 minute
            )
            return !hasActiveRide
          })

          setActiveRides(driverRidesData.active)
          setRideRequests(filteredRequests)

          // Update current ride if there's an in-progress ride
          const inProgressRide = driverRidesData.active.find((ride) => ride.status === "in_progress")
          if (inProgressRide) {
            setCurrentRide(inProgressRide)
          }
        } catch (error) {
          console.error("Error refreshing data:", error)
        }
      }
    }, 15000)

    return () => {
      clearInterval(interval)
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current)
      }
    }
  }, [isOnline, lastUpdate])

  // Start location tracking when driver goes online
  useEffect(() => {
    if (isOnline && !isLocationTracking) {
      startLocationTracking()
    } else if (!isOnline && isLocationTracking) {
      stopLocationTracking()
    }
  }, [isOnline, isLocationTracking, startLocationTracking, stopLocationTracking])

  // Update navigation URL when current ride changes
  useEffect(() => {
    if (currentRide) {
      // Create Google Maps navigation URL
      const destination =
        currentRide.status === "in_progress"
          ? `${currentRide.destination.lat},${currentRide.destination.lng}`
          : `${currentRide.origin.lat},${currentRide.origin.lng}`

      setNavigationUrl(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`)
    } else {
      setNavigationUrl("")
    }
  }, [currentRide])

  const calculateEarnings = (rides: Ride[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let todayEarnings = 0
    let weekEarnings = 0
    let monthEarnings = 0

    rides.forEach((ride) => {
      if (ride.status === "completed") {
        // Use completedAt if available, otherwise use scheduledTime
        const rideDate = new Date(ride.completedAt || ride.scheduledTime)
        const fare = ride.fare || 0

        if (rideDate >= today) {
          todayEarnings += fare
        }

        if (rideDate >= weekStart) {
          weekEarnings += fare
        }

        if (rideDate >= monthStart) {
          monthEarnings += fare
        }
      }
    })

    setEarnings({
      today: todayEarnings,
      week: weekEarnings,
      month: monthEarnings,
    })
  }

  const handleStartRide = (ride: Ride) => {
    setCurrentRide(ride)
    setShowOtpModal(true)
  }

  const handleOtpVerified = () => {
    setShowOtpModal(false)
    // Update ride status to in_progress
    if (currentRide) {
      const updatedRide = { ...currentRide, status: "in_progress" }
      setCurrentRide(updatedRide)

      // Update active rides
      const updatedActiveRides = activeRides.map((ride) => (ride.id === currentRide.id ? updatedRide : ride))
      setActiveRides(updatedActiveRides)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount)
  }

  const handleAcceptRequest = async (request: RideRequest) => {
    try {
      setLoading(true)
      setError(null)

      // Check if driver is online before accepting
      if (!isOnline) {
        throw new Error("You must be online to accept ride requests")
      }

      // Check if driver already has an active ride
      const inProgressRide = activeRides.find((ride) => ride.status === "in_progress")
      if (inProgressRide) {
        throw new Error("You already have a ride in progress. Complete it before accepting a new one.")
      }

      // Call the API function to accept the ride request
      const newRide = await acceptRideRequest(request.id)

      // Format the new ride to match our Ride type
      const formattedRide: Ride = {
        id: newRide.id,
        child: request.child,
        parent: request.parent,
        driver: {
          id: user.id,
          name: `${user.name} ${user.surname}`,
          profilePic: user.profilePic || "/placeholder.svg?height=48&width=48",
          carDetails: user.car ? `${user.car.color} ${user.car.make} ${user.car.model} (${user.car.registration})` : "",
          rating: user.rating || 4.5,
        },
        origin: request.origin,
        destination: request.destination,
        scheduledTime: request.scheduledTime,
        status: "scheduled",
        otp: newRide.otp,
        otp_generated_at: newRide.otp_generated_at,
        currentLocation: request.origin,
        estimatedArrival: newRide.estimated_arrival,
        fare: request.estimatedFare,
      }

      // Add to active rides
      setActiveRides((prevRides) => [...prevRides, formattedRide])

      // Remove from ride requests
      setRideRequests((prevRequests) => prevRequests.filter((req) => req.id !== request.id))

      // Hide request timer
      setShowRequestTimer(false)
      setActiveRequest(null)

      // Show success message
      toast({
        title: "Ride Accepted",
        description: "You have successfully accepted the ride request. The parent has been notified.",
      })
    } catch (error: any) {
      console.error("Error accepting ride request:", error)
      setError(error.message || "Failed to accept ride request")

      toast({
        title: "Accept Failed",
        description: error.message || "Failed to accept ride request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeclineRequest = (requestId: string) => {
    // Remove from ride requests
    const updatedRequests = rideRequests.filter((req) => req.id !== requestId)
    setRideRequests(updatedRequests)

    // Hide request timer
    setShowRequestTimer(false)
    setActiveRequest(null)
  }

  const handleCompleteRide = async () => {
    if (!currentRide) return

    try {
      setLoading(true)
      setError(null)

      // Confirm completion
      const confirmed = window.confirm("Are you sure you want to complete this ride? This action cannot be undone.")
      if (!confirmed) {
        setLoading(false)
        return
      }

      // Call API to complete the ride
      const result = await completeRide(currentRide.id)

      // Clear current ride immediately
      setCurrentRide(null)

      // Remove the completed ride from active rides
      setActiveRides((prevRides) => prevRides.filter((ride) => ride.id !== currentRide.id))

      // Refresh data to get updated state
      try {
        const driverRidesData = await getDriverRides()
        setActiveRides(driverRidesData.active)
        setRideHistory(driverRidesData.history)
        calculateEarnings(driverRidesData.history)
      } catch (refreshError) {
        console.error("Error refreshing data after completion:", refreshError)
        // Don't fail the operation if refresh fails
      }

      // Show success message with payment details
      toast({
        title: "Ride Completed Successfully!",
        description: `You earned ${formatCurrency(result.fare || 0)}. The parent has been charged ${formatCurrency(result.parentCharged || 0)}.`,
      })
    } catch (error: any) {
      console.error("Error completing ride:", error)
      setError(error.message || "Failed to complete ride")

      toast({
        title: "Completion Failed",
        description: error.message || "Failed to complete ride. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRide = async (rideId: string, reason?: string) => {
    try {
      setLoading(true)
      setError(null)

      // Call API to cancel the ride with reason
      const result = await cancelRide(rideId, reason)

      // Clear current ride if it's the one being cancelled
      if (currentRide && currentRide.id === rideId) {
        setCurrentRide(null)
      }

      // Remove the cancelled ride from active rides immediately
      const updatedActiveRides = activeRides.filter((ride) => ride.id !== rideId)
      setActiveRides(updatedActiveRides)

      // Refresh all data to get updated active rides and history
      const driverRidesData = await getDriverRides()
      setActiveRides(driverRidesData.active)
      setRideHistory(driverRidesData.history)

      // Recalculate earnings with updated history
      calculateEarnings(driverRidesData.history)

      // Close dialog and clear state
      setShowCancellationDialog(false)
      setRideToCancel(null)
      setError(null)

      // Show success message with penalty information
      const penaltyMessage =
        result.penaltyApplied > 0
          ? ` A penalty of ${formatCurrency(result.penaltyApplied)} has been applied to your account.`
          : ""

      toast({
        title: "Ride Cancelled",
        description: `${result.message}${penaltyMessage}`,
        variant: result.penaltyApplied > 0 ? "destructive" : "default",
      })
    } catch (error: any) {
      console.error("Error cancelling ride:", error)
      setError(error.message || "Failed to cancel ride")

      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel ride. Please try again.",
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

  const toggleMessages = (rideId: string) => {
    if (showMessages === rideId) {
      setShowMessages(null)
    } else {
      setShowMessages(rideId)
    }
  }

  const toggleMap = (rideId: string) => {
    if (showMap === rideId) {
      setShowMap(null)
    } else {
      setShowMap(rideId)
    }
  }

  const handleNewRideRequest = (request: RideRequest) => {
    setActiveRequest(request)
    setShowRequestTimer(true)
  }

  const handleToggleOnline = async (value: boolean) => {
    try {
      setStatusLoading(true)
      setError(null)

      if (value && !user?.car) {
        setError("You need to add a car before going online")
        return
      }

      // Update driver status in the database
      await updateDriverStatus(value)

      setIsOnline(value)

      // If going online, fetch ride requests
      if (value) {
        const rideRequestsData = await getRideRequests()
        setRideRequests(rideRequestsData)
      } else {
        // Clear ride requests when going offline
        setRideRequests([])
      }
    } catch (error: any) {
      console.error("Error updating driver status:", error)
      setError(error.message || "Failed to update online status")
    } finally {
      setStatusLoading(false)
    }
  }

  const openNavigation = () => {
    if (navigationUrl) {
      window.open(navigationUrl, "_blank")
    }
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center app-gradient">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <>
        <DriverNavbar user={user} />
      </>

      {error && (
        <Alert variant="destructive" className="max-w-4xl mx-auto mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showOtpModal && currentRide && (
        <OTPVerification ride={currentRide} onVerified={handleOtpVerified} onCancel={() => setShowOtpModal(false)} />
      )}

      {showRequestTimer && activeRequest && (
        <RideRequestTimer
          request={activeRequest}
          onAccept={() => handleAcceptRequest(activeRequest)}
          onDecline={() => handleDeclineRequest(activeRequest.id)}
          onTimeout={() => handleDeclineRequest(activeRequest.id)}
        />
      )}

      <main className="container mx-auto px-4 py-6">
        {/* Driver Status Toggle */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user?.profilePic || "/placeholder.svg?height=48&width=48"} alt={user?.name} />
                  <AvatarFallback>{user?.name?.charAt(0) || "D"}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">
                    {user?.name} {user?.surname}
                  </h3>
                  <p className="text-sm text-gray-500">Driver</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="online-mode" className={isOnline ? "text-green-600" : "text-gray-500"}>
                  {isOnline ? "Online" : "Offline"}
                </Label>
                <Switch
                  id="online-mode"
                  checked={isOnline}
                  onCheckedChange={handleToggleOnline}
                  disabled={currentRide?.status === "in_progress" || statusLoading}
                />
              </div>
            </div>

            {!user?.car && (
              <div className="mt-4 text-sm text-amber-600 bg-amber-50 p-2 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                You need to add a car before going online. Visit your profile to add car details.
              </div>
            )}

            {isOnline && (
              <div className="mt-4 text-sm text-green-600 bg-green-50 p-2 rounded-md flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                You're online and can receive ride requests. Make sure to keep the app open.
              </div>
            )}
          </CardContent>
        </Card>

        {currentRide && currentRide.status === "in_progress" ? (
          <Card className="mb-6">
            <CardHeader className="bg-secondary/20 pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  Current Ride: {currentRide.child.name} to {currentRide.destination.name}
                </CardTitle>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="bg-green-500">In Progress</Badge>
                  <RideConnectionStatus status={connectionStatus} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px] w-full">
                <EnhancedDriverMap
                  origin={currentRide.origin}
                  destination={currentRide.destination}
                  currentLocation={enhancedLocation || undefined}
                  showRoute={true}
                  showTraffic={true}
                  onLocationUpdate={(location) => {
                    // Handle location updates if needed
                    console.log("Location updated:", location)
                  }}
                />
              </div>
              <div className="p-4">
                <div className="flex items-center mb-4">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src="/placeholder.svg?height=40&width=40" alt={currentRide.child.name} />
                    <AvatarFallback>{currentRide.child.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{currentRide.child.name}</p>
                    <p className="text-sm text-gray-500">{currentRide.parent.name} (Parent)</p>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm font-medium">Pickup</p>
                    <p className="text-sm text-gray-600 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {currentRide.origin.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Dropoff</p>
                    <p className="text-sm text-gray-600 flex items-center justify-end">
                      {currentRide.destination.address}
                      <MapPin className="h-4 w-4 ml-1" />
                    </p>
                  </div>
                </div>

                {enhancedLocation && (
                  <div className="mb-4 p-2 bg-blue-50 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Location Accuracy</span>
                      <Badge variant={accuracy <= 20 ? "default" : "secondary"}>±{Math.round(accuracy)}m</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Last updated: {locationLastUpdate?.toLocaleTimeString()}
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm font-medium mb-1">Estimated Fare</p>
                  <p className="text-lg font-bold text-primary">R {currentRide.fare?.toFixed(2)}</p>
                </div>

                <div className="flex space-x-2 mb-4">
                  <Button variant="outline" className="flex-1" onClick={() => toggleMessages(currentRide.id)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {showMessages === currentRide.id ? "Hide Chat" : "Message Parent"}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={openNavigation}>
                    <Navigation className="mr-2 h-4 w-4" />
                    Navigate
                  </Button>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleCompleteRide}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Ride
                </Button>

                {showMessages === currentRide.id && (
                  <div className="mt-4 mb-4 border rounded-lg p-2 bg-gray-50">
                    <MessageSystem
                      recipientId={currentRide.parent.id}
                      recipientName={currentRide.parent.name}
                      recipientType="parent"
                      rideId={currentRide.id}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full">
            <div className="w-full">
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">Active Rides</TabsTrigger>
                  <TabsTrigger value="requests">Ride Requests</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Active Rides</h2>
                    <DownloadHistory type="rides" data={activeRides} isLoading={loading} />
                  </div>

                  {activeRides.length > 0 ? (
                    <div className="space-y-4">
                      {activeRides.map((ride) => (
                        <Card key={ride.id} className="overflow-hidden">
                          <CardHeader className="bg-primary/10 pb-2">
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
                              <Badge className={ride.status === "in_progress" ? "bg-green-500" : "bg-primary"}>
                                {ride.status === "in_progress" ? "In Progress" : "Scheduled"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="flex items-center mb-4">
                              <Avatar className="h-10 w-10 mr-3">
                                <AvatarImage src="/placeholder.svg?height=40&width=40" alt={ride.child.name} />
                                <AvatarFallback>{ride.child.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{ride.child.name}</p>
                                <p className="text-sm text-gray-500">{ride.parent.name} (Parent)</p>
                              </div>
                            </div>

                            <Button variant="outline" className="w-full mb-4" onClick={() => toggleMap(ride.id)}>
                              {showMap === ride.id ? "Hide Map" : "Show Map"}
                            </Button>

                            {showMap === ride.id && (
                              <div className="h-[250px] w-full rounded-md overflow-hidden mb-4">
                                <DriverMap
                                  origin={ride.origin}
                                  destination={ride.destination}
                                  currentLocation={currentLocation || ride.currentLocation}
                                />
                              </div>
                            )}

                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <p className="text-sm font-medium">Pickup</p>
                                <p className="text-sm text-gray-600 flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {ride.origin.address}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">Dropoff</p>
                                <p className="text-sm text-gray-600 flex items-center justify-end">
                                  {ride.destination.address}
                                  <MapPin className="h-4 w-4 ml-1" />
                                </p>
                              </div>
                            </div>

                            <div className="mb-4">
                              <p className="text-sm font-medium mb-1">Estimated Fare</p>
                              <p className="text-lg font-bold text-primary">R {ride.fare?.toFixed(2)}</p>
                            </div>

                            <div className="flex space-x-2 mb-4">
                              <Button variant="outline" className="flex-1" onClick={() => toggleMessages(ride.id)}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Message Parent
                              </Button>
                              <Button
                                className="flex-1 bg-primary hover:bg-primary/90"
                                onClick={() => handleStartRide(ride)}
                              >
                                Start Ride
                              </Button>
                            </div>

                            <Button
                              variant="outline"
                              className="w-full text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => handleCancelRideClick(ride)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Ride
                            </Button>

                            {showMessages === ride.id && (
                              <div className="mt-4">
                                <MessageSystem
                                  recipientId={ride.parent.id}
                                  recipientName={ride.parent.name}
                                  recipientType="parent"
                                  rideId={ride.id}
                                />
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
                          className="mt-4 bg-primary hover:bg-primary/90"
                          onClick={() => document.getElementById("requests-tab")?.click()}
                        >
                          Check Ride Requests
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="requests" className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Ride Requests</h2>
                  </div>

                  {!isOnline ? (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <p className="text-gray-500">You need to be online to receive ride requests</p>
                        <Button
                          className="mt-4 bg-primary hover:bg-primary/90"
                          onClick={() => handleToggleOnline(true)}
                          disabled={!user?.car || statusLoading}
                        >
                          <Power className="mr-2 h-4 w-4" />
                          Go Online
                        </Button>
                      </CardContent>
                    </Card>
                  ) : rideRequests.length > 0 ? (
                    <div className="space-y-4">
                      {rideRequests.map((request) => (
                        <Card key={request.id}>
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-medium">Ride to {request.destination.name}</h3>
                                <p className="text-sm text-gray-500">
                                  <Calendar className="inline-block mr-1 h-4 w-4" />
                                  {formatDate(request.scheduledTime)}
                                  {" • "}
                                  <Clock className="inline-block mx-1 h-4 w-4" />
                                  {formatTime(request.scheduledTime)}
                                </p>
                              </div>
                              <Badge className="bg-secondary">New Request</Badge>
                            </div>

                            <div className="flex items-center mb-4">
                              <Avatar className="h-10 w-10 mr-3">
                                <AvatarImage src="/placeholder.svg?height=40&width=40" alt={request.child.name} />
                                <AvatarFallback>{request.child.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{request.child.name}</p>
                                <p className="text-sm text-gray-500">{request.parent.name} (Parent)</p>
                              </div>
                            </div>

                            <Button variant="outline" className="w-full mb-4" onClick={() => toggleMap(request.id)}>
                              {showMap === request.id ? "Hide Map" : "Show Route"}
                            </Button>

                            {showMap === request.id && (
                              <div className="h-[250px] w-full rounded-md overflow-hidden mb-4">
                                <DriverMap
                                  origin={request.origin}
                                  destination={request.destination}
                                  currentLocation={currentLocation || request.origin}
                                />
                              </div>
                            )}

                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <p className="text-sm font-medium">Pickup</p>
                                <p className="text-sm text-gray-600 flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {request.origin.address}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">Dropoff</p>
                                <p className="text-sm text-gray-600 flex items-center justify-end">
                                  {request.destination.address}
                                  <MapPin className="h-4 w-4 ml-1" />
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm font-medium">Estimated fare:</p>
                              <p className="font-medium text-green-600">R {request.estimatedFare.toFixed(2)}</p>
                            </div>

                            <div className="mt-4 flex space-x-2">
                              <Button
                                variant="outline"
                                className="flex-1 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
                                onClick={() => handleDeclineRequest(request.id)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Decline
                              </Button>
                              <Button
                                className="flex-1 bg-primary hover:bg-primary/90"
                                onClick={() => handleAcceptRequest(request)}
                                disabled={loading}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Accept
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <p className="text-gray-500">No ride requests available</p>
                        <p className="text-sm text-gray-400 mt-2">
                          You're online and will receive ride requests as they come in
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
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
            userType="driver"
          />
        )}
      </main>
    </div>
  )
}
