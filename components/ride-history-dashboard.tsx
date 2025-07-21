"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, MapPin, User, Car, Star, AlertCircle, CheckCircle } from "lucide-react"
import { getRideHistory, cancelRide, rateRide } from "@/lib/api"
import type { Ride } from "@/lib/types"

interface RideHistoryDashboardProps {
  userType: "parent" | "driver"
}

export function RideHistoryDashboard({ userType }: RideHistoryDashboardProps) {
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState("all")

  useEffect(() => {
    fetchRideHistory()
  }, [])

  const fetchRideHistory = async () => {
    try {
      setLoading(true)
      const data = await getRideHistory()
      setRides(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRide = async (rideId: string) => {
    try {
      await cancelRide(rideId, "Cancelled by user")
      await fetchRideHistory() // Refresh the data
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRateRide = async (rideId: string, rating: number) => {
    try {
      await rateRide(rideId, rating, "Great service!")
      await fetchRideHistory() // Refresh the data
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const filteredRides = rides.filter((ride) => {
    if (selectedTab === "all") return true
    return ride.status === selectedTab
  })

  const completedRides = rides.filter((ride) => ride.status === "completed")
  const cancelledRides = rides.filter((ride) => ride.status === "cancelled")

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading ride history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Error: {error}</span>
          </div>
          <Button onClick={fetchRideHistory} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
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
              {rides.length > 0 ? Math.round((completedRides.length / rides.length) * 100) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{cancelledRides.length}</div>
            <p className="text-xs text-muted-foreground">
              {rides.length > 0 ? Math.round((cancelledRides.length / rides.length) * 100) : 0}% cancellation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ride History */}
      <Card>
        <CardHeader>
          <CardTitle>Ride History</CardTitle>
          <CardDescription>View and manage your {userType === "parent" ? "child's" : ""} ride history</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({rides.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedRides.length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({cancelledRides.length})</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6">
              {filteredRides.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No rides found for this category</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRides.map((ride) => (
                    <Card key={ride.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            {/* Status and Date */}
                            <div className="flex items-center gap-3">
                              <Badge className={getStatusColor(ride.status)}>
                                {getStatusIcon(ride.status)}
                                <span className="ml-1 capitalize">{ride.status}</span>
                              </Badge>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Calendar className="h-4 w-4" />
                                {new Date(ride.scheduledTime).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Clock className="h-4 w-4" />
                                {new Date(ride.scheduledTime).toLocaleTimeString()}
                              </div>
                            </div>

                            {/* Route Information */}
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium">Pickup</p>
                                  <p className="text-sm text-gray-600">{ride.origin.address}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium">Destination</p>
                                  <p className="text-sm text-gray-600">{ride.destination.address}</p>
                                </div>
                              </div>
                            </div>

                            {/* Participant Information */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-600" />
                                <div>
                                  <p className="text-xs text-gray-500">Child</p>
                                  <p className="text-sm font-medium">
                                    {ride.child.name} {ride.child.surname}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-purple-600" />
                                <div>
                                  <p className="text-xs text-gray-500">Parent</p>
                                  <p className="text-sm font-medium">{ride.parent.name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-orange-600" />
                                <div>
                                  <p className="text-xs text-gray-500">Driver</p>
                                  <p className="text-sm font-medium">{ride.driver.name}</p>
                                  {ride.driver.carDetails && (
                                    <p className="text-xs text-gray-500">{ride.driver.carDetails}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Fare and Additional Info */}
                            <div className="flex items-center justify-between pt-3 border-t">
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="text-xs text-gray-500">Fare</p>
                                  <p className="text-lg font-bold text-green-600">R{ride.fare}</p>
                                </div>
                                {ride.status === "cancelled" && ride.cancelledAt && (
                                  <div>
                                    <p className="text-xs text-gray-500">Cancelled</p>
                                    <p className="text-sm text-red-600">
                                      {new Date(ride.cancelledAt).toLocaleString()}
                                    </p>
                                    {ride.cancelledByType && (
                                      <p className="text-xs text-gray-500">By {ride.cancelledByType}</p>
                                    )}
                                  </div>
                                )}
                                {ride.status === "completed" && ride.completedAt && (
                                  <div>
                                    <p className="text-xs text-gray-500">Completed</p>
                                    <p className="text-sm text-green-600">
                                      {new Date(ride.completedAt).toLocaleString()}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                {ride.status === "completed" && !ride.isRated && (
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Button
                                        key={star}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRateRide(ride.id, star)}
                                        className="p-1 h-8 w-8"
                                      >
                                        <Star className="h-4 w-4" />
                                      </Button>
                                    ))}
                                  </div>
                                )}
                                {ride.status === "scheduled" && (
                                  <Button variant="destructive" size="sm" onClick={() => handleCancelRide(ride.id)}>
                                    Cancel Ride
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default RideHistoryDashboard
