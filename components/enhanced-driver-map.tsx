"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, AlertCircle, MapPin, Crosshair } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useGoogleMaps } from "@/contexts/google-maps-context"
import { formatLocationAccuracy, isLocationAccurate, type LocationCoordinates } from "@/lib/location-service"

interface EnhancedDriverMapProps {
  origin: { lat: number; lng: number; address: string }
  destination: { lat: number; lng: number; address: string }
  currentLocation?: LocationCoordinates
  showRoute?: boolean
  showTraffic?: boolean
  height?: string
  onLocationUpdate?: (location: LocationCoordinates) => void
}

export default function EnhancedDriverMap({
  origin,
  destination,
  currentLocation,
  showRoute = true,
  showTraffic = false,
  height = "100%",
  onLocationUpdate,
}: EnhancedDriverMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null)
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)

  const [mapInitialized, setMapInitialized] = useState(false)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null)
  const [estimatedDistance, setEstimatedDistance] = useState<string | null>(null)

  const { isLoaded, loadError } = useGoogleMaps()

  // Initialize map
  useEffect(() => {
    if (!isLoaded || mapInitialized) return

    try {
      const map = new window.google.maps.Map(document.getElementById("enhanced-map-container")!, {
        zoom: 15,
        center: currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : origin,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      })

      // Enable traffic layer if requested
      if (showTraffic) {
        const trafficLayer = new window.google.maps.TrafficLayer()
        trafficLayer.setMap(map)
      }

      mapRef.current = map
      setMapInitialized(true)
    } catch (err: any) {
      console.error("Error initializing map:", err)
      setError(err.message || "Failed to initialize map")
    }
  }, [isLoaded, mapInitialized, origin, currentLocation, showTraffic])

  // Update current location marker with accuracy circle
  useEffect(() => {
    if (!mapInitialized || !mapRef.current || !currentLocation) return

    // Remove existing marker and circle
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setMap(null)
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null)
    }

    // Create accuracy circle
    const accuracyCircle = new window.google.maps.Circle({
      center: { lat: currentLocation.lat, lng: currentLocation.lng },
      radius: currentLocation.accuracy,
      fillColor: isLocationAccurate(currentLocation.accuracy) ? "#4CAF50" : "#FF9800",
      fillOpacity: 0.1,
      strokeColor: isLocationAccurate(currentLocation.accuracy) ? "#4CAF50" : "#FF9800",
      strokeOpacity: 0.3,
      strokeWeight: 1,
      map: mapRef.current,
    })

    // Create current location marker
    const marker = new window.google.maps.Marker({
      position: { lat: currentLocation.lat, lng: currentLocation.lng },
      map: mapRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: isLocationAccurate(currentLocation.accuracy) ? "#4CAF50" : "#FF9800",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
      },
      title: `Current Location (±${Math.round(currentLocation.accuracy)}m)`,
      zIndex: 1000,
    })

    // Add info window with location details
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div class="p-2">
          <h3 class="font-semibold text-sm">Current Location</h3>
          <p class="text-xs text-gray-600">Accuracy: ±${Math.round(currentLocation.accuracy)}m</p>
          <p class="text-xs text-gray-600">Quality: ${formatLocationAccuracy(currentLocation.accuracy)}</p>
          ${currentLocation.speed ? `<p class="text-xs text-gray-600">Speed: ${Math.round(currentLocation.speed * 3.6)} km/h</p>` : ""}
          <p class="text-xs text-gray-500">Updated: ${new Date(currentLocation.timestamp).toLocaleTimeString()}</p>
        </div>
      `,
    })

    marker.addListener("click", () => {
      infoWindow.open(mapRef.current, marker)
    })

    currentLocationMarkerRef.current = marker
    accuracyCircleRef.current = accuracyCircle

    // Center map on current location if accuracy is good
    if (isLocationAccurate(currentLocation.accuracy, 50)) {
      mapRef.current.panTo({ lat: currentLocation.lat, lng: currentLocation.lng })
    }

    // Notify parent component
    if (onLocationUpdate) {
      onLocationUpdate(currentLocation)
    }
  }, [mapInitialized, currentLocation, onLocationUpdate])

  // Add origin and destination markers
  useEffect(() => {
    if (!mapInitialized || !mapRef.current) return

    // Origin marker
    new window.google.maps.Marker({
      position: origin,
      map: mapRef.current,
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
        scaledSize: new window.google.maps.Size(32, 32),
      },
      title: "Pickup Location",
    })

    // Destination marker
    new window.google.maps.Marker({
      position: destination,
      map: mapRef.current,
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        scaledSize: new window.google.maps.Size(32, 32),
      },
      title: "Drop-off Location",
    })
  }, [mapInitialized, origin, destination])

  // Calculate and display route
  useEffect(() => {
    if (!mapInitialized || !mapRef.current || !showRoute) return

    const directionsService = new window.google.maps.DirectionsService()
    const startPoint = currentLocation || origin

    directionsService.route(
      {
        origin: new window.google.maps.LatLng(startPoint.lat, startPoint.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
        avoidHighways: false,
        avoidTolls: false,
        optimizeWaypoints: true,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result)

          // Remove existing directions renderer
          if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null)
          }

          // Create new directions renderer
          const renderer = new window.google.maps.DirectionsRenderer({
            map: mapRef.current,
            directions: result,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#2563EB",
              strokeWeight: 5,
              strokeOpacity: 0.8,
            },
          })

          directionsRendererRef.current = renderer

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
  }, [mapInitialized, origin, destination, currentLocation, showRoute])

  // Center map on current location
  const centerOnCurrentLocation = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.panTo({ lat: currentLocation.lat, lng: currentLocation.lng })
      mapRef.current.setZoom(17)
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-4">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loadError.message}</AlertDescription>
        </Alert>
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
      <div id="enhanced-map-container" style={{ width: "100%", height: "100%" }} />

      {/* Location accuracy indicator */}
      {currentLocation && (
        <div className="absolute top-2 left-2 bg-white rounded-md p-2 shadow-md z-10">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs font-medium">Location Accuracy</p>
              <div className="flex items-center space-x-1">
                <Badge
                  variant={isLocationAccurate(currentLocation.accuracy) ? "default" : "secondary"}
                  className="text-xs"
                >
                  ±{Math.round(currentLocation.accuracy)}m
                </Badge>
                <span className="text-xs text-gray-500">{formatLocationAccuracy(currentLocation.accuracy)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Center on location button */}
      {currentLocation && (
        <Button
          variant="outline"
          size="sm"
          className="absolute top-2 right-2 bg-white shadow-md z-10"
          onClick={centerOnCurrentLocation}
        >
          <Crosshair className="h-4 w-4" />
        </Button>
      )}

      {/* Route information */}
      {estimatedTime && estimatedDistance && (
        <div className="absolute bottom-2 left-2 right-2 bg-white rounded-md p-3 shadow-md z-10">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">{estimatedDistance}</p>
              <p className="text-xs text-gray-500">Distance</p>
            </div>
            <div>
              <p className="text-sm font-medium">{estimatedTime}</p>
              <p className="text-xs text-gray-500">ETA</p>
            </div>
            {showTraffic && (
              <div>
                <Badge variant="outline" className="text-xs">
                  Live Traffic
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="absolute top-16 left-2 right-2 z-10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
