"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, Navigation, RefreshCw, AlertCircle, Clock } from "lucide-react"
import { formatTime } from "@/lib/utils"
import type { Ride } from "@/lib/types"
import DriverMap from "./driver-map"

interface LiveTrackingProps {
  ride: Ride
  onRefresh?: () => void
}

export default function LiveTracking({ ride, onRefresh }: LiveTrackingProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [refreshKey, setRefreshKey] = useState(0)
  const [estimatedArrival, setEstimatedArrival] = useState("")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Auto-refresh tracking data
  useEffect(() => {
    if (ride.status === "in_progress" && isOnline) {
      intervalRef.current = setInterval(() => {
        setRefreshKey((prev) => prev + 1)
        setLastUpdate(new Date())
        if (onRefresh) {
          onRefresh()
        }
      }, 15000) // Refresh every 15 seconds

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [ride.status, isOnline, onRefresh])

  // Calculate estimated arrival time
  useEffect(() => {
    if (ride.estimatedArrival) {
      const updateEstimatedTime = () => {
        const now = new Date()
        const arrival = new Date(ride.estimatedArrival)
        const diffMs = arrival.getTime() - now.getTime()

        if (diffMs <= 0) {
          setEstimatedArrival("Arriving now")
        } else {
          const diffMins = Math.ceil(diffMs / (1000 * 60))
          setEstimatedArrival(`${diffMins} min${diffMins !== 1 ? "s" : ""}`)
        }
      }

      updateEstimatedTime()
      const timer = setInterval(updateEstimatedTime, 60000) // Update every minute

      return () => clearInterval(timer)
    }
  }, [ride.estimatedArrival])

  const handleManualRefresh = () => {
    setRefreshKey((prev) => prev + 1)
    setLastUpdate(new Date())
    if (onRefresh) {
      onRefresh()
    }
  }

  const openNavigation = () => {
    const destination = `${ride.destination.lat},${ride.destination.lng}`
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
    window.open(url, "_blank")
  }

  if (ride.status !== "in_progress") {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Live tracking will be available once the ride starts.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-blue-500" />
            Live Tracking
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"}>{isOnline ? "Online" : "Offline"}</Badge>
            <Button variant="outline" size="sm" onClick={handleManualRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Clock className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-sm font-medium text-green-700">ETA</p>
            <p className="text-lg font-bold text-green-800">{estimatedArrival}</p>
          </div>

          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <MapPin className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <p className="text-sm font-medium text-blue-700">Status</p>
            <p className="text-lg font-bold text-blue-800 capitalize">{ride.status.replace("_", " ")}</p>
          </div>
        </div>

        {/* Route Information */}
        <div className="space-y-2">
          <div className="flex items-start">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-700">Pickup Location</p>
              <p className="text-sm text-gray-600">{ride.origin.address}</p>
            </div>
          </div>

          <div className="ml-1.5 w-0.5 h-4 bg-gray-300"></div>

          <div className="flex items-start">
            <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5 mr-3"></div>
            <div>
              <p className="text-sm font-medium text-gray-700">Drop-off Location</p>
              <p className="text-sm text-gray-600">{ride.destination.address}</p>
            </div>
          </div>
        </div>

        {/* Live Map */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-700">Live Location</p>
            <p className="text-xs text-gray-500">Last updated: {formatTime(lastUpdate.toISOString())}</p>
          </div>

          <div className="h-[300px] w-full rounded-lg overflow-hidden border" key={refreshKey}>
            <DriverMap
              origin={ride.origin}
              destination={ride.destination}
              currentLocation={ride.currentLocation}
              showRoute={true}
              showTraffic={true}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={openNavigation}>
            <Navigation className="h-4 w-4 mr-2" />
            Open in Maps
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleManualRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Connection Status */}
        {!isOnline && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're currently offline. Live tracking will resume when connection is restored.
            </AlertDescription>
          </Alert>
        )}

        {/* Driver Information */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Driver</p>
              <p className="text-sm text-gray-600">{ride.driver.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Vehicle</p>
              <p className="text-sm text-gray-600">{ride.driver.carDetails}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
