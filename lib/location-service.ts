import { toast } from "@/components/ui/use-toast"

export interface LocationCoordinates {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
  heading?: number
  speed?: number
  altitude?: number
}

export interface LocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  distanceFilter?: number
  desiredAccuracy?: number
}

export class LocationService {
  private watchId: number | null = null
  private lastKnownLocation: LocationCoordinates | null = null
  private locationCallbacks: Set<(location: LocationCoordinates) => void> = new Set()
  private errorCallbacks: Set<(error: GeolocationPositionError) => void> = new Set()
  private isTracking = false

  private defaultOptions: LocationOptions = {
    enableHighAccuracy: true,
    timeout: 15000, // 15 seconds
    maximumAge: 5000, // 5 seconds
    distanceFilter: 5, // 5 meters
    desiredAccuracy: 10, // 10 meters
  }

  constructor(options?: LocationOptions) {
    this.defaultOptions = { ...this.defaultOptions, ...options }
  }

  // Check if geolocation is supported and permissions are granted
  async checkLocationPermissions(): Promise<boolean> {
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported by this browser")
    }

    try {
      // Check permission status
      const permission = await navigator.permissions.query({ name: "geolocation" })

      if (permission.state === "denied") {
        throw new Error("Location permission denied. Please enable location access in your browser settings.")
      }

      if (permission.state === "prompt") {
        // Try to get location to trigger permission prompt
        await this.getCurrentLocation()
      }

      return true
    } catch (error) {
      console.error("Location permission check failed:", error)
      throw error
    }
  }

  // Get current location with high accuracy
  async getCurrentLocation(options?: LocationOptions): Promise<LocationCoordinates> {
    const opts = { ...this.defaultOptions, ...options }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"))
        return
      }

      const timeoutId = setTimeout(() => {
        reject(new Error("Location request timed out"))
      }, opts.timeout)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId)

          const location: LocationCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            altitude: position.coords.altitude || undefined,
          }

          // Validate accuracy
          if (location.accuracy > (opts.desiredAccuracy || 50)) {
            console.warn(
              `Location accuracy is ${location.accuracy}m, which exceeds desired accuracy of ${opts.desiredAccuracy}m`,
            )
          }

          this.lastKnownLocation = location
          resolve(location)
        },
        (error) => {
          clearTimeout(timeoutId)
          this.handleLocationError(error)
          reject(error)
        },
        {
          enableHighAccuracy: opts.enableHighAccuracy,
          timeout: opts.timeout,
          maximumAge: opts.maximumAge,
        },
      )
    })
  }

  // Start continuous location tracking
  async startTracking(options?: LocationOptions): Promise<void> {
    if (this.isTracking) {
      console.warn("Location tracking is already active")
      return
    }

    await this.checkLocationPermissions()

    const opts = { ...this.defaultOptions, ...options }
    let lastLocation: LocationCoordinates | null = null

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          altitude: position.coords.altitude || undefined,
        }

        // Apply distance filter
        if (lastLocation && opts.distanceFilter) {
          const distance = this.calculateDistance(lastLocation, location)
          if (distance < opts.distanceFilter) {
            return // Skip update if movement is less than filter distance
          }
        }

        // Validate accuracy
        if (location.accuracy > (opts.desiredAccuracy || 50)) {
          console.warn(`Location accuracy is ${location.accuracy}m, which may be too low for precise tracking`)
        }

        lastLocation = location
        this.lastKnownLocation = location
        this.notifyLocationCallbacks(location)
      },
      (error) => {
        this.handleLocationError(error)
        this.notifyErrorCallbacks(error)
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      },
    )

    this.isTracking = true
  }

  // Stop location tracking
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
    this.isTracking = false
  }

  // Add location update callback
  onLocationUpdate(callback: (location: LocationCoordinates) => void): () => void {
    this.locationCallbacks.add(callback)

    // Return unsubscribe function
    return () => {
      this.locationCallbacks.delete(callback)
    }
  }

  // Add error callback
  onLocationError(callback: (error: GeolocationPositionError) => void): () => void {
    this.errorCallbacks.add(callback)

    // Return unsubscribe function
    return () => {
      this.errorCallbacks.delete(callback)
    }
  }

  // Get last known location
  getLastKnownLocation(): LocationCoordinates | null {
    return this.lastKnownLocation
  }

  // Check if currently tracking
  isCurrentlyTracking(): boolean {
    return this.isTracking
  }

  // Calculate distance between two points in meters
  private calculateDistance(point1: LocationCoordinates, point2: LocationCoordinates): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180
    const φ2 = (point2.lat * Math.PI) / 180
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  // Handle location errors
  private handleLocationError(error: GeolocationPositionError): void {
    let message = "Location error occurred"

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = "Location access denied. Please enable location permissions in your browser settings."
        break
      case error.POSITION_UNAVAILABLE:
        message = "Location information is unavailable. Please check your GPS settings."
        break
      case error.TIMEOUT:
        message = "Location request timed out. Please try again."
        break
      default:
        message = `Location error: ${error.message}`
        break
    }

    console.error("Location Service Error:", message, error)

    toast({
      title: "Location Error",
      description: message,
      variant: "destructive",
    })
  }

  // Notify location callbacks
  private notifyLocationCallbacks(location: LocationCoordinates): void {
    this.locationCallbacks.forEach((callback) => {
      try {
        callback(location)
      } catch (error) {
        console.error("Error in location callback:", error)
      }
    })
  }

  // Notify error callbacks
  private notifyErrorCallbacks(error: GeolocationPositionError): void {
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error)
      } catch (callbackError) {
        console.error("Error in error callback:", callbackError)
      }
    })
  }

  // Cleanup
  destroy(): void {
    this.stopTracking()
    this.locationCallbacks.clear()
    this.errorCallbacks.clear()
    this.lastKnownLocation = null
  }
}

// Singleton instance
export const locationService = new LocationService({
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
  distanceFilter: 5,
  desiredAccuracy: 10,
})

// Utility functions
export const formatLocationAccuracy = (accuracy: number): string => {
  if (accuracy < 5) return "Very High"
  if (accuracy < 10) return "High"
  if (accuracy < 20) return "Medium"
  if (accuracy < 50) return "Low"
  return "Very Low"
}

export const isLocationAccurate = (accuracy: number, threshold = 20): boolean => {
  return accuracy <= threshold
}
