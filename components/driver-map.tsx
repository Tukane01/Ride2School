"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useGoogleMaps } from "@/contexts/google-maps-context"

// Map container style
const mapContainerStyle = {
  width: "100%",
  height: "100%",
}

export default function DriverMap({
  origin,
  destination,
  currentLocation,
  showRoute = true,
  height = "100%",
}: {
  origin: { lat: number; lng: number; address: string }
  destination: { lat: number; lng: number; address: string }
  currentLocation?: { lat: number; lng: number; address?: string }
  showRoute?: boolean
  height?: string
}) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [selectedMarker, setSelectedMarker] = useState<"origin" | "destination" | "current" | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null)
  const [estimatedDistance, setEstimatedDistance] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)

  // Use our shared Google Maps context
  const { isLoaded, loadError } = useGoogleMaps()

  // Initialize map when Google Maps API is loaded
  useEffect(() => {
    if (!isLoaded || mapInitialized) return

    try {
      const map = new window.google.maps.Map(document.getElementById("map-container")!, {
        zoom: 14,
        center: { lat: origin.lat, lng: origin.lng },
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      })

      mapRef.current = map
      setMapInitialized(true)
    } catch (err: any) {
      console.error("Error initializing map:", err)
      setError(err.message || "Failed to initialize map")
    }
  }, [isLoaded, origin, mapInitialized])

  // Function to calculate directions - only called after map is loaded
  useEffect(() => {
    if (!isLoaded || !mapInitialized || !mapRef.current) return

    const directionsService = new window.google.maps.DirectionsService()

    // Use current location for route if available
    const startPoint = currentLocation || origin

    directionsService.route(
      {
        origin: new window.google.maps.LatLng(startPoint.lat, startPoint.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result)

          // Extract time and distance
          if (result.routes.length > 0 && result.routes[0].legs.length > 0) {
            const leg = result.routes[0].legs[0]
            setEstimatedTime(leg.duration?.text || null)
            setEstimatedDistance(leg.distance?.text || null)
          }
        } else {
          console.error(`Directions request failed: ${status}`)
          setError(`Failed to get directions: ${status}`)
        }
      },
    )
  }, [isLoaded, mapInitialized, origin, destination, currentLocation])

  // Add markers and info windows after map is initialized
  useEffect(() => {
    if (!isLoaded || !mapInitialized || !mapRef.current) return

    // Origin Marker
    const originMarker = new window.google.maps.Marker({
      position: { lat: origin.lat, lng: origin.lng },
      map: mapRef.current,
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
        scaledSize: new window.google.maps.Size(32, 32),
      },
    })

    // Destination Marker
    const destinationMarker = new window.google.maps.Marker({
      position: { lat: destination.lat, lng: destination.lng },
      map: mapRef.current,
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        scaledSize: new window.google.maps.Size(32, 32),
      },
    })

    // Current Location Marker (if available)
    let currentLocationMarker: google.maps.Marker | null = null
    if (currentLocation) {
      currentLocationMarker = new window.google.maps.Marker({
        position: { lat: currentLocation.lat, lng: currentLocation.lng },
        map: mapRef.current,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          scaledSize: new window.google.maps.Size(40, 40),
        },
        animation: window.google.maps.Animation.BOUNCE,
      })
    }

    // Info Windows
    const originInfoWindow = new window.google.maps.InfoWindow({
      content: `<div class="p-1"><h3 class="font-semibold">Pickup</h3><p class="text-sm">${origin.address}</p></div>`,
    })

    const destinationInfoWindow = new window.google.maps.InfoWindow({
      content: `<div class="p-1"><h3 class="font-semibold">Dropoff</h3><p class="text-sm">${destination.address}</p></div>`,
    })

    let currentLocationInfoWindow: google.maps.InfoWindow | null = null
    if (currentLocation) {
      currentLocationInfoWindow = new window.google.maps.InfoWindow({
        content: `<div class="p-1">
          <h3 class="font-semibold">Current Location</h3>
          <p class="text-sm">${currentLocation.address || "Driver's current position"}</p>
          ${
            estimatedTime && estimatedDistance
              ? `<p class="text-xs mt-1">${estimatedDistance} away • ${estimatedTime} ETA</p>`
              : ""
          }
        </div>`,
      })
    }

    // Add click listeners
    originMarker.addListener("click", () => {
      originInfoWindow.open(mapRef.current, originMarker)
      if (destinationInfoWindow) destinationInfoWindow.close()
      if (currentLocationInfoWindow) currentLocationInfoWindow.close()
      setSelectedMarker("origin")
    })

    destinationMarker.addListener("click", () => {
      destinationInfoWindow.open(mapRef.current, destinationMarker)
      originInfoWindow.close()
      if (currentLocationInfoWindow) currentLocationInfoWindow.close()
      setSelectedMarker("destination")
    })

    if (currentLocationMarker && currentLocationInfoWindow) {
      currentLocationMarker.addListener("click", () => {
        currentLocationInfoWindow!.open(mapRef.current, currentLocationMarker!)
        originInfoWindow.close()
        destinationInfoWindow.close()
        setSelectedMarker("current")
      })
    }

    // Fit bounds
    const bounds = new window.google.maps.LatLngBounds()
    bounds.extend(new window.google.maps.LatLng(origin.lat, origin.lng))
    bounds.extend(new window.google.maps.LatLng(destination.lat, destination.lng))
    if (currentLocation) {
      bounds.extend(new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng))
    }
    mapRef.current.fitBounds(bounds)

    // Cleanup
    return () => {
      originMarker.setMap(null)
      destinationMarker.setMap(null)
      if (currentLocationMarker) currentLocationMarker.setMap(null)
    }
  }, [isLoaded, mapInitialized, origin, destination, currentLocation, estimatedTime, estimatedDistance])

  // Render directions
  useEffect(() => {
    if (!isLoaded || !mapInitialized || !mapRef.current || !directions || !showRoute) return

    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      directions: directions,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#6366F1",
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
    })

    return () => {
      directionsRenderer.setMap(null)
    }
  }, [isLoaded, mapInitialized, directions, showRoute])

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-4">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loadError.message}</AlertDescription>
        </Alert>
        <p className="text-sm text-gray-500">Please check your internet connection and try again.</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div style={{ height, width: "100%", position: "relative" }}>
      <div id="map-container" style={mapContainerStyle} />

      {/* Travel information overlay */}
      {estimatedTime && estimatedDistance && (
        <div className="absolute bottom-2 left-2 right-2 bg-white rounded-md p-2 shadow-md z-10 text-center">
          <p className="font-medium">
            {estimatedDistance} • {estimatedTime} estimated
          </p>
        </div>
      )}
    </div>
  )
}
