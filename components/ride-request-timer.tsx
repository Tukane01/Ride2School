"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { MapPin, Clock, Calendar, CheckCircle, XCircle } from "lucide-react"
import type { RideRequest } from "@/lib/types"

interface RideRequestTimerProps {
  request: RideRequest
  onAccept: () => void
  onDecline: () => void
  onTimeout: () => void
  timeoutSeconds?: number
}

export default function RideRequestTimer({
  request,
  onAccept,
  onDecline,
  onTimeout,
  timeoutSeconds = 15,
}: RideRequestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onTimeout()
          return 0
        }
        return prev - 1
      })

      setProgress((prev) => {
        const newProgress = (timeLeft / timeoutSeconds) * 100
        return newProgress
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, timeoutSeconds, onTimeout])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-secondary/20 pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">New Ride Request</CardTitle>
            <Badge className="bg-secondary">{timeLeft}s</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Progress value={progress} className="h-2 mb-4" />

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

          <div className="mb-4">
            <p className="text-sm text-gray-500">
              <Calendar className="inline-block mr-1 h-4 w-4" />
              {new Date(request.scheduledTime).toLocaleDateString()}
              {" • "}
              <Clock className="inline-block mx-1 h-4 w-4" />
              {new Date(request.scheduledTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-medium">Estimated fare:</p>
            <p className="font-medium text-green-600">R {request.estimatedFare.toFixed(2)}</p>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
              onClick={onDecline}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Decline
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={onAccept}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Accept
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
