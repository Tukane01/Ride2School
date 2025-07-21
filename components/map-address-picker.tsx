"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, MapPin, Navigation, X } from "lucide-react"
import { geocodeAddress } from "@/lib/geocoding"
import { toast } from "@/components/ui/use-toast"
import { useGoogleMaps } from "@/contexts/google-maps-context"

interface MapAddressPickerProps {
  value: string
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void
  placeholder?: string
  label?: string
  className?: string
}

interface AddressSuggestion {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

interface MapInstance {
  setCenter: (location: { lat: number; lng: number }) => void
  setZoom: (zoom: number) => void
}

interface MarkerInstance {
  setPosition: (location: { lat: number; lng: number }) => void
  setMap: (map: MapInstance | null) => void
}

export default function MapAddressPickerComponent({
  value,
  onChange,
  placeholder = "Enter address",
  label,
  className = "",
}: MapAddressPickerProps) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<MapInstance | null>(null)
  const markerInstance = useRef<MarkerInstance | null>(null)
  const autocompleteService = useRef<any>(null)
  const placesService = useRef<any>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Use our shared Google Maps context
  const { isLoaded, loadError } = useGoogleMaps()

  // Initialize services when Google Maps API is loaded
  useEffect(() => {
    if (!isLoaded) return

    autocompleteService.current = new window.google.maps.places.AutocompleteService()
  }, [isLoaded])

  // Initialize map when loaded and shown
  useEffect(() => {
    if (!isLoaded || !showMap || !mapRef.current || mapInitialized) return

    initializeMap()
  }, [isLoaded, showMap])

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const initializeMap = () => {
    if (!mapRef.current || !isLoaded) return

    // Default to Johannesburg coordinates
    const defaultLocation = { lat: -26.2041, lng: 28.0473 }
    const initialLocation = currentLocation || defaultLocation

    const map = new window.google.maps.Map(mapRef.current, {
      center: initialLocation,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    const marker = new window.google.maps.Marker({
      position: initialLocation,
      map: map,
      draggable: true,
      title: "Selected Location",
    })

    // Handle marker drag
    marker.addListener("dragend", () => {
      const position = marker.getPosition()
      if (position) {
        const lat = position.lat()
        const lng = position.lng()
        reverseGeocode(lat, lng)
      }
    })

    // Handle map click
    map.addListener("click", (event: any) => {
      const lat = event.latLng.lat()
      const lng = event.latLng.lng()
      marker.setPosition({ lat, lng })
      reverseGeocode(lat, lng)
    })

    mapInstance.current = map
    markerInstance.current = marker
    setMapInitialized(true)

    // Initialize places service
    placesService.current = new window.google.maps.places.PlacesService(map)
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!isLoaded) return

    const geocoder = new window.google.maps.Geocoder()

    try {
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === "OK" && results[0]) {
            resolve(results[0])
          } else {
            reject(new Error("Geocoding failed"))
          }
        })
      })

      const result = response as any
      const address = result.formatted_address
      setInputValue(address)
      onChange(address, { lat, lng })
      setCurrentLocation({ lat, lng })
    } catch (error) {
      console.error("Reverse geocoding failed:", error)
      toast({
        title: "Location Error",
        description: "Failed to get address for selected location.",
        variant: "destructive",
      })
    }
  }

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!autocompleteService.current || input.length < 3) {
      setSuggestions([])
      return
    }

    try {
      const response = await new Promise((resolve, reject) => {
        autocompleteService.current.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: "za" }, // Restrict to South Africa
            types: ["address"],
          },
          (predictions: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              resolve(predictions || [])
            } else {
              reject(new Error("Places service failed"))
            }
          },
        )
      })

      setSuggestions(response as AddressSuggestion[])
    } catch (error) {
      console.error("Error fetching suggestions:", error)
      setSuggestions([])
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowSuggestions(true)

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Debounce the API call
    debounceTimer.current = setTimeout(() => {
      if (newValue.trim()) {
        fetchSuggestions(newValue)
      } else {
        setSuggestions([])
      }
    }, 300)
  }

  const handleSuggestionSelect = async (suggestion: AddressSuggestion) => {
    setLoading(true)
    setShowSuggestions(false)
    setInputValue(suggestion.description)

    try {
      // Get place details to get coordinates
      if (placesService.current) {
        const response = await new Promise((resolve, reject) => {
          placesService.current.getDetails({ placeId: suggestion.place_id }, (place: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              resolve(place)
            } else {
              reject(new Error("Place details failed"))
            }
          })
        })

        const place = response as any
        const location = place.geometry.location
        const lat = location.lat()
        const lng = location.lng()

        // Update map if visible
        if (mapInstance.current && markerInstance.current) {
          mapInstance.current.setCenter({ lat, lng })
          markerInstance.current.setPosition({ lat, lng })
        }

        setCurrentLocation({ lat, lng })
        onChange(suggestion.description, { lat, lng })
      } else {
        // Fallback to geocoding
        const coordinates = await geocodeAddress(suggestion.description)
        setCurrentLocation(coordinates)
        onChange(suggestion.description, coordinates)

        // Update map if visible
        if (mapInstance.current && markerInstance.current) {
          mapInstance.current.setCenter(coordinates)
          markerInstance.current.setPosition(coordinates)
        }
      }
    } catch (error) {
      console.error("Error getting place details:", error)
      onChange(suggestion.description)
    } finally {
      setLoading(false)
    }
  }

  const handleGetCurrentLocation = async () => {
    setLoading(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      })

      const lat = position.coords.latitude
      const lng = position.coords.longitude

      setCurrentLocation({ lat, lng })

      // Update map if visible
      if (mapInstance.current && markerInstance.current) {
        mapInstance.current.setCenter({ lat, lng })
        mapInstance.current.setZoom(15)
        markerInstance.current.setPosition({ lat, lng })
      }

      // Reverse geocode to get address
      await reverseGeocode(lat, lng)

      toast({
        title: "Location Found",
        description: "Your current location has been set.",
      })
    } catch (error) {
      console.error("Error getting current location:", error)
      toast({
        title: "Location Error",
        description: "Failed to get your current location. Please check your browser permissions.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleMap = () => {
    setShowMap(!showMap)
    if (!showMap && currentLocation && mapInstance.current && markerInstance.current) {
      // Center map on current location when opening
      setTimeout(() => {
        if (mapInstance.current && markerInstance.current) {
          mapInstance.current.setCenter(currentLocation)
          markerInstance.current.setPosition(currentLocation)
        }
      }, 100)
    }
  }

  if (loadError) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && <label className="text-sm font-medium">{label}</label>}
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            onChange(e.target.value)
          }}
          placeholder={placeholder}
        />
        <div className="text-sm text-red-500">Failed to load map services. Address suggestions are not available.</div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-sm font-medium">{label}</label>}

      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay hiding suggestions to allow for clicks
                setTimeout(() => setShowSuggestions(false), 200)
              }}
              className="pr-10"
            />
            {loading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetCurrentLocation}
            disabled={loading || !isLoaded}
            className="px-3"
          >
            <Navigation className="h-4 w-4" />
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={toggleMap} disabled={!isLoaded} className="px-3">
            <MapPin className="h-4 w-4" />
          </Button>
        </div>

        {/* Address Suggestions */}
        {isLoaded && showSuggestions && suggestions.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto">
            <CardContent className="p-0">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  type="button"
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <div className="font-medium text-sm">{suggestion.structured_formatting.main_text}</div>
                  <div className="text-xs text-gray-500">{suggestion.structured_formatting.secondary_text}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map */}
      {showMap && (
        <Card className="mt-2">
          <CardContent className="p-0">
            <div className="flex justify-between items-center p-3 border-b">
              <h3 className="font-medium">Select Location on Map</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowMap(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div ref={mapRef} className="w-full h-64" style={{ minHeight: "256px" }} />
            <div className="p-3 text-xs text-gray-500 border-t">
              Click on the map or drag the marker to select a location
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
