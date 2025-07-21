"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Calendar, Clock, AlertCircle, ArrowLeft, CheckCircle, MapPin } from "lucide-react"
import { requestRide } from "@/lib/api"
import {
  formatCurrency,
  calculateEstimatedFare,
  calculateDistance,
  validateRideRequestTime,
  getCurrentSyncTime,
} from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MapAddressPickerComponent from "./map-address-picker"

interface RideRequestFormProps {
  user: any
  onSuccess?: (requestId: string) => void
}

export default function RideRequestForm({ user, onSuccess }: RideRequestFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [pickupCoordinates, setPickupCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [dropoffCoordinates, setDropoffCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)

  const [formData, setFormData] = useState({
    pickupAddress: user?.address || "",
    dropoffAddress: user?.child?.school?.address || "",
    pickupDate: new Date().toISOString().split("T")[0],
    pickupTime: "07:30",
    rideType: "school",
    notes: "",
  })

  const { toast } = useToast()

  // Calculate estimated fare when addresses or coordinates change
  useEffect(() => {
    if (pickupCoordinates && dropoffCoordinates) {
      // Check if coordinates are the same
      if (pickupCoordinates.lat === dropoffCoordinates.lat && pickupCoordinates.lng === dropoffCoordinates.lng) {
        setDistance(0)
        setEstimatedFare(0)
        return
      }

      const dist = calculateDistance(
        pickupCoordinates.lat,
        pickupCoordinates.lng,
        dropoffCoordinates.lat,
        dropoffCoordinates.lng,
      )
      setDistance(dist)
      setEstimatedFare(calculateEstimatedFare(dist))
    } else if (formData.pickupAddress && formData.dropoffAddress) {
      // Check if addresses are the same
      if (formData.pickupAddress.trim() === formData.dropoffAddress.trim()) {
        setDistance(0)
        setEstimatedFare(0)
        return
      }

      // Fallback to random coordinates for demo purposes
      const originLat = -26.2041 + (Math.random() - 0.5) * 0.05
      const originLng = 28.0473 + (Math.random() - 0.5) * 0.05
      const destLat = -26.2041 + (Math.random() - 0.5) * 0.05
      const destLng = 28.0473 + (Math.random() - 0.5) * 0.05

      const dist = calculateDistance(originLat, originLng, destLat, destLng)
      setDistance(dist)
      setEstimatedFare(calculateEstimatedFare(dist))
    } else {
      // If either address is missing, set fare and distance to 0
      setDistance(0)
      setEstimatedFare(0)
    }
  }, [formData.pickupAddress, formData.dropoffAddress, pickupCoordinates, dropoffCoordinates])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handlePickupAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setFormData({ ...formData, pickupAddress: address })
    setPickupCoordinates(coordinates || null)
  }

  const handleDropoffAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setFormData({ ...formData, dropoffAddress: address })
    setDropoffCoordinates(coordinates || null)
  }

  // Enhanced current location function with improved accuracy
  const getCurrentLocation = async () => {
    setGettingLocation(true)
    setError("")

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser")
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        })
      })

      const { latitude, longitude, accuracy } = position.coords

      // Check accuracy - warn if not very accurate
      if (accuracy > 100) {
        toast({
          title: "Location Accuracy Warning",
          description: `Location accuracy is ${Math.round(accuracy)}m. For better accuracy, ensure GPS is enabled and you're outdoors.`,
          variant: "default",
        })
      }

      // Reverse geocode to get address (simplified for demo)
      const address = `Current Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`

      setPickupCoordinates({ lat: latitude, lng: longitude })
      setFormData({ ...formData, pickupAddress: address })

      toast({
        title: "Location Updated",
        description: `Current location set as pickup address (accuracy: ${Math.round(accuracy)}m)`,
      })
    } catch (error: any) {
      console.error("Error getting location:", error)
      let errorMessage = "Failed to get current location"

      if (error.code === 1) {
        errorMessage = "Location access denied. Please enable location permissions."
      } else if (error.code === 2) {
        errorMessage = "Location unavailable. Please check your GPS settings."
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. Please try again."
      }

      setError(errorMessage)
      toast({
        title: "Location Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setGettingLocation(false)
    }
  }

  // Helper function to disable Sundays in date picker
  const isDateDisabled = (dateString: string) => {
    const date = new Date(dateString)
    return date.getDay() === 0 // Sunday = 0
  }

  // Enhanced validation with time checking
  const validateForm = () => {
    // Validate pickup address
    if (!formData.pickupAddress.trim()) {
      setError("Pickup address is required")
      return false
    }

    // Validate dropoff address
    if (!formData.dropoffAddress.trim()) {
      setError("Dropoff address is required")
      return false
    }

    // Check if addresses are the same
    if (formData.pickupAddress.trim().toLowerCase() === formData.dropoffAddress.trim().toLowerCase()) {
      setError("Pickup and dropoff addresses cannot be the same")
      return false
    }

    // Enhanced time validation using the new utility function
    const timeValidation = validateRideRequestTime(formData.pickupDate, formData.pickupTime)
    if (!timeValidation.isValid) {
      setError(timeValidation.error || "Invalid time selection")
      return false
    }

    // Validate date (must be today or future)
    const selectedDate = new Date(formData.pickupDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      setError("Pickup date cannot be in the past")
      return false
    }

    // Check if selected date is a Sunday
    if (selectedDate.getDay() === 0) {
      setError("Rides are not available on Sundays. Please select a weekday or Saturday.")
      return false
    }

    // Validate time - school hours restriction (06:00 - 17:00)
    const [hours, minutes] = formData.pickupTime.split(":").map(Number)

    // Check if time is within school hours (06:00 - 17:00)
    if (hours < 6 || hours > 17) {
      setError("Pickup time must be between 06:00 AM and 5:00 PM (school hours)")
      return false
    }

    // If time is exactly 17:00, don't allow any minutes past 17:00
    if (hours === 17 && minutes > 0) {
      setError("Pickup time must be between 06:00 AM and 5:00 PM (school hours)")
      return false
    }

    // Check wallet balance
    const currentBalance = user?.wallet?.balance || 0
    const requiredAmount = estimatedFare || 25

    if (currentBalance < requiredAmount) {
      setError(
        `Insufficient wallet balance. You need ${formatCurrency(requiredAmount)} but only have ${formatCurrency(currentBalance)}. Please add funds to your wallet.`,
      )
      return false
    }

    return true
  }

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Check if user has a child
    if (!user.child) {
      setError("You need to add a child before requesting a ride")
      return
    }

    // Validate form
    if (!validateForm()) {
      return
    }

    setShowPreview(true)
  }

  const handleBackToForm = () => {
    setShowPreview(false)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      // Create ride request
      const result = await requestRide({
        ...formData,
        childId: user.child?.id,
        parentId: user.id,
        estimatedFare: estimatedFare || 25,
        pickupCoordinates,
        dropoffCoordinates,
      })

      setSuccess(true)
      toast({
        title: "Ride requested successfully!",
        description: "Waiting for a driver to accept your request.",
      })

      // Reset form after successful submission
      setFormData({
        ...formData,
        notes: "",
      })

      // Call onSuccess with the request ID
      if (onSuccess) onSuccess(result.id)

      // Redirect to active rides tab
      setTimeout(() => {
        document.getElementById("active-tab")?.click()
        if (onSuccess) onSuccess(result.id)
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to request ride. Please try again.")
      toast({
        title: "Error requesting ride",
        description: err.message || "Failed to request ride. Please try again.",
        variant: "destructive",
      })
      setShowPreview(false)
    } finally {
      setLoading(false)
    }
  }

  // Format the date and time for display
  const formatDateTime = () => {
    const date = new Date(`${formData.pickupDate}T${formData.pickupTime}`)
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    })
  }

  // Get minimum date (today) and time for validation
  const getMinDateTime = () => {
    const now = getCurrentSyncTime()
    const today = now.toISOString().split("T")[0]
    const currentTime = now.toTimeString().slice(0, 5)

    return { minDate: today, currentTime }
  }

  const { minDate, currentTime } = getMinDateTime()

  if (showPreview) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" onClick={handleBackToForm} className="mb-4 pl-0 text-blue-600">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to form
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Ride Request Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-500">Passenger</h3>
                <p className="font-semibold">
                  {user.child.name} {user.child.surname}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">Ride Type</h3>
                <p className="font-semibold capitalize">{formData.rideType === "school" ? "To School" : "To Home"}</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-500">Pickup Address</h3>
              <p className="font-semibold">{formData.pickupAddress}</p>
              {pickupCoordinates && (
                <p className="text-xs text-gray-500">
                  Coordinates: {pickupCoordinates.lat.toFixed(6)}, {pickupCoordinates.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-500">Dropoff Address</h3>
              <p className="font-semibold">{formData.dropoffAddress}</p>
              {dropoffCoordinates && (
                <p className="text-xs text-gray-500">
                  Coordinates: {dropoffCoordinates.lat.toFixed(6)}, {dropoffCoordinates.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-500">Pickup Time</h3>
              <p className="font-semibold">{formatDateTime()}</p>
            </div>

            {formData.notes && (
              <div>
                <h3 className="font-medium text-gray-500">Additional Notes</h3>
                <p className="font-semibold">{formData.notes}</p>
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700">Estimated distance:</span>
                <span className="text-sm font-medium text-blue-700">{distance?.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm font-medium text-blue-700">Base fare:</span>
                <span className="text-sm font-medium text-blue-700">R20.00</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm font-medium text-blue-700">Distance charge (R5/km):</span>
                <span className="text-sm font-medium text-blue-700">{formatCurrency((distance || 0) * 5)}</span>
              </div>
              <div className="flex justify-between items-center mt-1 border-t pt-1">
                <span className="text-sm font-medium text-blue-700">Estimated fare:</span>
                <span className="text-sm font-medium text-blue-700">{formatCurrency(estimatedFare || 25)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm font-medium text-blue-700">Your wallet balance:</span>
                <span className="text-sm font-medium text-blue-700">{formatCurrency(user?.wallet?.balance || 0)}</span>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleSubmit} className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Ride Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Ride request submitted successfully! Waiting for a driver to accept.
              {estimatedFare && (
                <div className="mt-2">
                  <strong>Estimated fare: {formatCurrency(estimatedFare)}</strong>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handlePreview} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            Ride request submitted successfully! Waiting for a driver to accept.
            {estimatedFare && (
              <div className="mt-2">
                <strong>Estimated fare: {formatCurrency(estimatedFare)}</strong>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Pickup Address</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="text-xs"
          >
            {gettingLocation ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Getting...
              </>
            ) : (
              <>
                <MapPin className="mr-1 h-3 w-3" />
                Use Current Location
              </>
            )}
          </Button>
        </div>
        <MapAddressPickerComponent
          label=""
          value={formData.pickupAddress}
          onChange={handlePickupAddressChange}
          placeholder="Enter pickup address or use current location"
        />
      </div>

      <MapAddressPickerComponent
        label="Dropoff Address"
        value={formData.dropoffAddress}
        onChange={handleDropoffAddressChange}
        placeholder="Enter dropoff address or select on map"
      />

      <div className="space-y-2">
        <Label htmlFor="pickupDate">Date</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            id="pickupDate"
            name="pickupDate"
            type="date"
            value={formData.pickupDate}
            onChange={handleInputChange}
            className="pl-10"
            min={minDate}
            required
          />
        </div>
        <p className="text-xs text-gray-500">Note: Rides are not available on Sundays</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pickupTime">Time</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              id="pickupTime"
              name="pickupTime"
              type="time"
              value={formData.pickupTime}
              onChange={handleInputChange}
              className="pl-10"
              min="06:00"
              max="17:00"
              required
            />
          </div>
          <p className="text-xs text-gray-500">School hours: 06:00 - 17:00</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ride Type</Label>
        <RadioGroup
          value={formData.rideType}
          onValueChange={(value) => setFormData({ ...formData, rideType: value })}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="school" id="school" />
            <Label htmlFor="school">To School</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="home" id="home" />
            <Label htmlFor="home">To Home</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes (Optional)</Label>
        <Input
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          placeholder="Any special instructions for the driver"
        />
      </div>

      {distance !== null && estimatedFare !== null && (
        <div className="bg-blue-50 p-3 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-700">Estimated distance:</span>
            <span className="text-sm font-medium text-blue-700">{distance.toFixed(1)} km</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm font-medium text-blue-700">Base fare:</span>
            <span className="text-sm font-medium text-blue-700">R20.00</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm font-medium text-blue-700">Distance charge (R5/km):</span>
            <span className="text-sm font-medium text-blue-700">{formatCurrency((distance || 0) * 5)}</span>
          </div>
          <div className="flex justify-between items-center mt-1 border-t pt-1">
            <span className="text-sm font-medium text-blue-700">Estimated fare:</span>
            <span className="text-sm font-medium text-blue-700">{formatCurrency(estimatedFare)}</span>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-3 rounded-md mb-4">
        <p className="text-sm text-blue-700">
          <strong>Current wallet balance: {formatCurrency(user?.wallet?.balance || 0)}</strong>
        </p>
        <p className="text-xs text-blue-600 mt-1">Minimum balance required: {formatCurrency(estimatedFare || 25)}</p>
      </div>

      <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600">
        Preview Ride Request
      </Button>
    </form>
  )
}
