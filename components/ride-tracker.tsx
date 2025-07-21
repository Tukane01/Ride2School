"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, Clock, AlertCircle } from "lucide-react"
import type { Ride } from "@/lib/types"
import { formatTimeRemaining } from "@/lib/utils"
import DriverMap from "./driver-map"

interface RideTrackerProps {
  ride: Ride
}

export default function RideTracker({ ride }: RideTrackerProps) {
  const [estimatedTime, setEstimatedTime] = useState("")
  const [progress, setProgress] = useState(0)
  const [showMap, setShowMap] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (ride.status === "in_progress") {
      // Update time remaining every minute
      const interval = setInterval(() => {
        setEstimatedTime(formatTimeRemaining(ride.estimatedArrival))

        // Calculate progress
        const startTime = new Date(ride.scheduledTime).getTime()
        const endTime = new Date(ride.estimatedArrival).getTime()
        const currentTime = new Date().getTime()

        const totalDuration = endTime - startTime
        const elapsed = currentTime - startTime

        const calculatedProgress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
        setProgress(calculatedProgress)
      }, 60000)

      // Initial update
      setEstimatedTime(formatTimeRemaining(ride.estimatedArrival))

      // Calculate initial progress
      const startTime = new Date(ride.scheduledTime).getTime()
      const endTime = new Date(ride.estimatedArrival).getTime()
      const currentTime = new Date().getTime()

      const totalDuration = endTime - startTime
      const elapsed = currentTime - startTime

      const calculatedProgress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
      setProgress(calculatedProgress)

      return () => clearInterval(interval)
    }
  }, [ride])

  // Force map refresh every 30 seconds when visible
  useEffect(() => {
    if (showMap && ride.status === "in_progress") {
      const interval = setInterval(() => {
        setRefreshKey((prev) => prev + 1)
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [showMap, ride.status])

  if (ride.status !== "in_progress") {
    return (
      <Alert className="bg-blue-50 border-blue-200 mt-2">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          The ride will start soon. The driver will verify the OTP when picking up your child.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-blue-500 mr-1" />
          <span className="text-sm font-medium">Estimated Arrival</span>
        </div>
        <Badge variant="outline" className="text-blue-700 bg-blue-50">
          {estimatedTime}
        </Badge>
      </div>

      <Progress value={progress} className="h-2 mb-4" />

      <div className="flex justify-between items-start text-sm text-gray-600 mb-2">
        <div className="flex items-start w-5/12">
          <MapPin className="h-4 w-4 mt-0.5 mr-1 flex-shrink-0 text-green-500" />
          <span>{ride.origin.address}</span>
        </div>

        <div className="w-2/12 flex justify-center">
          <span className="border-t-2 border-dashed border-gray-300 w-full mt-3"></span>
        </div>

        <div className="flex items-start justify-end text-right w-5/12">
          <span>{ride.destination.address}</span>
          <MapPin className="h-4 w-4 mt-0.5 ml-1 flex-shrink-0 text-red-500" />
        </div>
      </div>

      <button
        className="w-full py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-md transition-colors mt-2 mb-2 flex items-center justify-center"
        onClick={() => setShowMap(!showMap)}
      >
        {showMap ? "Hide Map" : "Show Live Map"}
      </button>

      {showMap && (
        <div className="h-[250px] w-full rounded-md overflow-hidden mb-2" key={refreshKey}>
          <DriverMap origin={ride.origin} destination={ride.destination} currentLocation={ride.currentLocation} />
        </div>
      )}

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Your child is on the way to {ride.destination.name}. The driver will notify you upon arrival.
        </AlertDescription>
      </Alert>
    </div>
  )
}
