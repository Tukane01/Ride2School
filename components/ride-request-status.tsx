"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Clock, Calendar } from "lucide-react"
import { getBrowserClient } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"

interface RideRequestStatusProps {
  requestId: string
  onAccepted: () => void
}

export function RideRequestStatus({ requestId, onAccepted }: RideRequestStatusProps) {
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const supabase = getBrowserClient()
        const { data, error } = await supabase
          .from("ride_requests")
          .select("*, children(*), parent:parent_id(*)")
          .eq("id", requestId)
          .single()

        if (error) throw error
        setRequest(data)
      } catch (err: any) {
        console.error("Error fetching ride request:", err)
        setError(err.message || "Failed to load ride request")
      } finally {
        setLoading(false)
      }
    }

    fetchRequest()

    // Set up real-time subscription to monitor request status changes
    const supabase = getBrowserClient()
    const subscription = supabase
      .channel(`ride-request-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ride_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          // Update the request status
          if (payload.new.status === "accepted") {
            // Call the onAccepted callback to refresh the parent component
            onAccepted()
          } else {
            setRequest((prev: any) => ({ ...prev, ...payload.new }))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [requestId, onAccepted])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    )
  }

  if (error || !request) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-red-500">{error || "Failed to load ride request"}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="bg-blue-50 pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">Ride Request</CardTitle>
          <Badge className="bg-yellow-500">Pending</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">
              <Clock className="inline-block mr-1 h-4 w-4" />
              {new Date(request.scheduled_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" • "}
              <Calendar className="inline-block mx-1 h-4 w-4" />
              {new Date(request.scheduled_time).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">From</p>
              <p className="text-sm">{request.origin_address}</p>
            </div>
            <div>
              <p className="text-sm font-medium">To</p>
              <p className="text-sm">{request.destination_address}</p>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-700">Estimated fare:</span>
              <span className="text-sm font-medium text-blue-700">{formatCurrency(request.estimated_fare)}</span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="animate-pulse flex space-x-2 items-center">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm text-blue-500">Waiting for a driver to accept...</p>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={onAccepted}>
            View Active Rides
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
