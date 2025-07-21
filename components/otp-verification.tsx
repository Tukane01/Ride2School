"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import { verifyRideOTPForDriver } from "@/lib/api"
import type { Ride } from "@/lib/types"

interface OTPVerificationProps {
  ride: Ride
  onVerified: () => void
  onCancel: () => void
}

export default function OTPVerification({ ride, onVerified, onCancel }: OTPVerificationProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null))

  // Focus the first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(0, 1) // Only take the first character

    setOtp(newOtp)

    // Auto-focus next input if current input is filled
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === "Backspace" && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text/plain").trim()

    // Check if pasted content is a 6-digit number
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split("")
      setOtp(newOtp)

      // Focus the last input
      if (inputRefs.current[5]) {
        inputRefs.current[5].focus()
      }
    }
  }

  const handleVerify = async () => {
    const otpString = otp.join("")

    if (otpString.length !== 6) {
      setError("Please enter a complete 6-digit OTP")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await verifyRideOTPForDriver(ride.id, otpString)

      if (result) {
        setSuccess(true)
        setTimeout(() => {
          onVerified()
        }, 1500)
      }
    } catch (err: any) {
      console.error("Error verifying OTP:", err)
      setError(err.message || "Failed to verify OTP")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify OTP to Start Ride</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success ? (
          <div className="py-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-green-800">OTP Verified Successfully</h3>
            <p className="text-sm text-gray-500 mt-2">Starting the ride...</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-4">
              Ask the parent or child for the 6-digit OTP code to start the ride.
            </div>

            <div className="flex justify-center space-x-2 mb-4">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  ref={(el) => (inputRefs.current[index] = el)}
                  className="w-12 h-12 text-center text-lg"
                  autoComplete="off"
                />
              ))}
            </div>

            <Button onClick={handleVerify} className="w-full" disabled={loading || otp.join("").length !== 6}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify OTP
            </Button>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading || success}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
