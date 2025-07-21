"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface GoogleMapsContextType {
  isLoaded: boolean
  loadError: Error | null
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: null,
})

export const useGoogleMaps = () => useContext(GoogleMapsContext)

interface GoogleMapsProviderProps {
  children: ReactNode
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true)
      return
    }

    // Prevent duplicate loading
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      const checkIfLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          setIsLoaded(true)
          clearInterval(checkIfLoaded)
        }
      }, 100)
      return
    }

    const loadGoogleMaps = async () => {
      try {
        const response = await fetch("/api/maps-key")
        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        // Create a callback function name
        const callbackName = `googleMapsInitCallback_${Date.now()}`

        // Add the callback to window object
        window[callbackName] = () => {
          setIsLoaded(true)
          // Clean up the callback
          delete window[callbackName]
        }

        // Create script with proper async loading pattern
        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places&callback=${callbackName}&loading=async`
        script.async = true
        script.defer = true

        script.onerror = () => {
          setLoadError(new Error("Failed to load Google Maps API"))
          // Clean up the callback
          delete window[callbackName]
        }

        document.head.appendChild(script)
      } catch (error) {
        console.error("Error loading Google Maps:", error)
        setLoadError(error instanceof Error ? error : new Error("Failed to load Google Maps API"))
      }
    }

    loadGoogleMaps()

    // Cleanup function
    return () => {
      // Remove any callbacks we might have created
      Object.keys(window).forEach((key) => {
        if (key.startsWith("googleMapsInitCallback_")) {
          delete window[key]
        }
      })
    }
  }, [])

  return <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>{children}</GoogleMapsContext.Provider>
}
