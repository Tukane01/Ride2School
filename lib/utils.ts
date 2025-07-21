import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  getCurrentTime,
  formatTime as syncFormatTime,
  formatDate as syncFormatDate,
  formatDateTime as syncFormatDateTime,
} from "./time-sync"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add the missing formatCurrency function
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Enhanced formatDateTime function with time sync
export function formatDateTime(date: string | Date): string {
  return syncFormatDateTime(date)
}

// Enhanced formatTime function with time sync
export function formatTime(date: string | Date): string {
  return syncFormatTime(date)
}

// Enhanced formatDate function with time sync
export function formatDate(date: string | Date): string {
  return syncFormatDate(date)
}

// Add calculateDistance function (Haversine formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in kilometers
  return Math.round(distance * 100) / 100 // Round to 2 decimal places
}

// Updated calculateEstimatedFare function with new pricing
export function calculateEstimatedFare(distanceKm: number): number {
  const baseFare = 20 // Base fare in ZAR (updated from 25 to 20)
  const perKmRate = 5 // Rate per kilometer in ZAR (updated from 8 to 5)
  const minimumFare = 25 // Minimum fare in ZAR (updated from 40 to 25)

  const calculatedFare = baseFare + distanceKm * perKmRate
  return Math.max(calculatedFare, minimumFare)
}

// Enhanced formatTimeRemaining function with time sync
export function formatTimeRemaining(targetTime: string | Date): string {
  const now = getCurrentTime()
  const target = new Date(targetTime)
  const diffMs = target.getTime() - now.getTime()

  if (diffMs <= 0) {
    return "Arrived"
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 60) {
    return `${diffMinutes} min`
  }

  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60

  return `${hours}h ${minutes}m`
}

// Add generateOTP function
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Get current synchronized time
export function getCurrentSyncTime(): Date {
  return getCurrentTime()
}

// Check if a time is in the past using synchronized time
export function isTimeInPast(time: Date | string): boolean {
  const current = getCurrentTime()
  const target = new Date(time)
  return target.getTime() < current.getTime()
}

// Check if a time is in the future using synchronized time
export function isTimeInFuture(time: Date | string): boolean {
  const current = getCurrentTime()
  const target = new Date(time)
  return target.getTime() > current.getTime()
}

// Enhanced time validation for ride requests
export function validateRideRequestTime(date: string, time: string): { isValid: boolean; error?: string } {
  try {
    const selectedDateTime = new Date(`${date}T${time}`)
    const now = getCurrentTime()

    // Check if the selected time is in the past
    if (selectedDateTime <= now) {
      return {
        isValid: false,
        error: "Cannot select a past date and time. Please choose a future time.",
      }
    }

    // Remove the 30-minute minimum requirement - allow immediate scheduling
    // const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000)
    // if (selectedDateTime < thirtyMinutesFromNow) {
    //   return {
    //     isValid: false,
    //     error: "Ride must be scheduled at least 30 minutes from now.",
    //   }
    // }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: "Invalid date or time format.",
    }
  }
}
