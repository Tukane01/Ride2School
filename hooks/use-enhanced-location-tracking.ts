"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { locationService, type LocationCoordinates } from "@/lib/location-service"
import { updateDriverLocationAPI } from "@/lib/api"

interface UseLocationTrackingOptions {
  rideId?: string
  updateInterval?: number
  accuracyThreshold?: number
  enableBackgroundTracking?: boolean
}

interface LocationTrackingState {
  currentLocation: LocationCoordinates | null
  isTracking: boolean
  accuracy: number
  lastUpdate: Date | null
  error: string | null
  permissionStatus: "granted" | "denied" | "prompt" | "unknown"
}

export function useEnhancedLocationTracking(options: UseLocationTrackingOptions = {}) {
  const {
    rideId,
    updateInterval = 3000, // 3 seconds (changed from 10000)
    accuracyThreshold = 20, // 20 meters
    enableBackgroundTracking = false,
  } = options

  const [state, setState] = useState<LocationTrackingState>({
    currentLocation: null,
    isTracking: false,
    accuracy: 0,
    lastUpdate: null,
    error: null,
    permissionStatus: "unknown",
  })

  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<Date | null>(null)
  const unsubscribeLocationRef = useRef<(() => void) | null>(null)
  const unsubscribeErrorRef = useRef<(() => void) | null>(null)

  // Check location permissions
  const checkPermissions = useCallback(async () => {
    try {
      await locationService.checkLocationPermissions()
      setState((prev) => ({ ...prev, permissionStatus: "granted", error: null }))
      return true
    } catch (error) {
      setState((prev) => ({
        ...prev,
        permissionStatus: "denied",
        error: error instanceof Error ? error.message : "Permission denied",
      }))
      return false
    }
  }, [])

  // Start location tracking
  const startTracking = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }))

      const hasPermission = await checkPermissions()
      if (!hasPermission) return

      // Set up location updates
      unsubscribeLocationRef.current = locationService.onLocationUpdate((location) => {
        setState((prev) => ({
          ...prev,
          currentLocation: location,
          accuracy: location.accuracy,
          lastUpdate: new Date(location.timestamp),
          error: null,
        }))

        // Update server if we have a ride ID and location is accurate enough
        if (rideId && location.accuracy <= accuracyThreshold) {
          updateDriverLocationAPI(rideId, location.lat, location.lng).catch((error) => {
            console.error("Failed to update driver location:", error)
          })
        }

        lastUpdateRef.current = new Date()
      })

      // Set up error handling
      unsubscribeErrorRef.current = locationService.onLocationError((error) => {
        setState((prev) => ({
          ...prev,
          error: error.message,
          isTracking: false,
        }))
      })

      // Start the location service
      await locationService.startTracking({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
        distanceFilter: 5,
        desiredAccuracy: accuracyThreshold,
      })

      setState((prev) => ({ ...prev, isTracking: true }))

      // Set up periodic updates for server sync
      if (rideId) {
        updateIntervalRef.current = setInterval(async () => {
          const lastLocation = locationService.getLastKnownLocation()
          if (lastLocation && lastLocation.accuracy <= accuracyThreshold) {
            try {
              await updateDriverLocationAPI(rideId, lastLocation.lat, lastLocation.lng)
            } catch (error) {
              console.error("Periodic location update failed:", error)
            }
          }
        }, updateInterval) // This will now be 3000ms
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to start tracking",
        isTracking: false,
      }))
    }
  }, [rideId, accuracyThreshold, updateInterval, checkPermissions])

  // Stop location tracking
  const stopTracking = useCallback(() => {
    locationService.stopTracking()

    if (unsubscribeLocationRef.current) {
      unsubscribeLocationRef.current()
      unsubscribeLocationRef.current = null
    }

    if (unsubscribeErrorRef.current) {
      unsubscribeErrorRef.current()
      unsubscribeErrorRef.current = null
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current)
      updateIntervalRef.current = null
    }

    setState((prev) => ({ ...prev, isTracking: false }))
  }, [])

  // Get current location once
  const getCurrentLocation = useCallback(async (): Promise<LocationCoordinates | null> => {
    try {
      const hasPermission = await checkPermissions()
      if (!hasPermission) return null

      const location = await locationService.getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
        desiredAccuracy: accuracyThreshold,
      })

      setState((prev) => ({
        ...prev,
        currentLocation: location,
        accuracy: location.accuracy,
        lastUpdate: new Date(location.timestamp),
        error: null,
      }))

      return location
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to get location",
      }))
      return null
    }
  }, [accuracyThreshold, checkPermissions])

  // Handle visibility change for background tracking
  useEffect(() => {
    if (!enableBackgroundTracking) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background - reduce update frequency
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current)
          updateIntervalRef.current = setInterval(async () => {
            const lastLocation = locationService.getLastKnownLocation()
            if (lastLocation && rideId) {
              try {
                await updateDriverLocationAPI(rideId, lastLocation.lat, lastLocation.lng)
              } catch (error) {
                console.error("Background location update failed:", error)
              }
            }
          }, updateInterval * 2) // Double the interval in background
        }
      } else {
        // App came to foreground - restore normal frequency
        if (updateIntervalRef.current && rideId) {
          clearInterval(updateIntervalRef.current)
          updateIntervalRef.current = setInterval(async () => {
            const lastLocation = locationService.getLastKnownLocation()
            if (lastLocation) {
              try {
                await updateDriverLocationAPI(rideId, lastLocation.lat, lastLocation.lng)
              } catch (error) {
                console.error("Foreground location update failed:", error)
              }
            }
          }, updateInterval)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [enableBackgroundTracking, updateInterval, rideId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  return {
    ...state,
    startTracking,
    stopTracking,
    getCurrentLocation,
    checkPermissions,
  }
}
