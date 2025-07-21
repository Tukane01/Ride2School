"use client"

import { useState } from "react"
import type { Ride } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Calendar, MessageSquare } from "lucide-react"
import DriverMap from "@/components/driver-map"
import { RideConnectionStatus } from "@/components/ride-connection-status"
import MessageSystem from "@/components/message-system"
// Import the CancellationDetails component
import { CancellationDetails } from "@/components/cancellation-details"

interface RideCardProps {
  ride: Ride
  viewerType: "parent" | "driver"
  isActive?: boolean
  connectionStatus?: "connected" | "disconnected" | "connecting"
  onTrackRide?: () => void
  onCancelRide?: () => void
  onStartRide?: () => void
  onCompleteRide?: () => void
}

export function RideCard({
  ride,
  viewerType,
  isActive = false,
  connectionStatus = "disconnected",
  onTrackRide,
  onCancelRide,
  onStartRide,
  onCompleteRide,
}: RideCardProps) {
  const [showMap, setShowMap] = useState(false)
  const [showMessages, setShowMessages] = useState(false)

  // Determine who we're communicating with based on viewer type
  const recipient =
    viewerType === "parent"
      ? { id: ride.driver.id, name: ride.driver.name, type: "driver" as const }
      : { id: ride.parent.id, name: ride.parent.name, type: "parent" as const }

  const toggleMap = () => setShowMap((prev) => !prev)
  const toggleMessages = () => setShowMessages((prev) => !prev)

  return (
    <Card className="overflow-hidden">
      <CardHeader className={`${viewerType === "parent" ? "bg-blue-50" : "bg-primary/10"} pb-2`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Ride to {ride.destination.name}</CardTitle>
            <p className="text-sm text-gray-500">
              <Clock className="inline-block mr-1 h-4 w-4" />
              {new Date(ride.scheduledTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" • "}
              <Calendar className="inline-block mx-1 h-4 w-4" />
              {new Date(ride.scheduledTime).toLocaleDateString()}
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
              {ride.status === "in_progress" ? "In Progress" : ride.status === "scheduled" ? "Scheduled" : "Waiting"}
            </Badge>
            {isActive && <RideConnectionStatus status={connectionStatus} />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Person information */}
        <div className="flex items-center mb-4">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage
              src={
                viewerType === "parent"
                  ? ride.driver.profilePic || "/placeholder.svg"
                  : "/placeholder.svg?height=40&width=40"
              }
              alt={viewerType === "parent" ? ride.driver.name : ride.child.name}
            />
            <AvatarFallback>
              {viewerType === "parent" ? ride.driver.name.charAt(0) : ride.child.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{viewerType === "parent" ? ride.driver.name : ride.child.name}</p>
            <p className="text-sm text-gray-500">
              {viewerType === "parent" ? ride.driver.carDetails : `${ride.parent.name} (Parent)`}
            </p>
          </div>
        </div>

        {/* Map toggle */}
        <Button variant="outline" className="w-full mb-4" onClick={toggleMap}>
          {showMap ? "Hide Map" : "Show Map"}
        </Button>

        {/* Map */}
        {showMap && (
          <div className="h-[250px] w-full rounded-md overflow-hidden mb-4">
            <DriverMap origin={ride.origin} destination={ride.destination} currentLocation={ride.currentLocation} />
          </div>
        )}

        {/* Location information */}
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

        {/* Price */}
        {ride.fare && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-1">Estimated Fare</p>
            <p className="text-lg font-bold text-primary">R {ride.fare.toFixed(2)}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {/* Messaging button */}
          <Button variant="outline" className="w-full flex items-center justify-center" onClick={toggleMessages}>
            <MessageSquare className="mr-2 h-4 w-4" />
            {showMessages ? "Hide Messages" : `Message ${recipient.type === "parent" ? "Parent" : "Driver"}`}
          </Button>

          {/* Ride action buttons */}
          <div className="flex gap-2">
            {ride.status === "scheduled" && viewerType === "driver" && onStartRide && (
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={onStartRide}>
                Start Ride
              </Button>
            )}

            {ride.status === "in_progress" && viewerType === "driver" && onCompleteRide && (
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={onCompleteRide}>
                Complete Ride
              </Button>
            )}

            {ride.status !== "in_progress" && onCancelRide && (
              <Button
                variant="outline"
                className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                onClick={onCancelRide}
              >
                Cancel Ride
              </Button>
            )}
          </div>
        </div>

        {/* Messaging system */}
        {showMessages && (
          <div className="mt-4">
            <MessageSystem
              recipientId={recipient.id}
              recipientName={recipient.name}
              recipientType={recipient.type}
              rideId={ride.id}
            />
          </div>
        )}
        {ride.status === "cancelled" && <CancellationDetails ride={ride} />}
      </CardContent>
    </Card>
  )
}
