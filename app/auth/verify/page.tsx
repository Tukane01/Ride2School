"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { verifyOTP, resendOTP } from "@/lib/auth"
import { Loader2 } from "lucide-react"

export default function VerifyOTP() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const userType = searchParams.get("type") || "parent"

  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendDisabled, setResendDisabled] = useState(true)
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    if (countdown > 0 && resendDisabled) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false)
    }
  }, [countdown, resendDisabled])

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handleVerify = async () => {
    const otpValue = otp.join("")

    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit OTP")
      return
    }

    setLoading(true)
    setError("")

    try {
      await verifyOTP(email, otpValue)

      // Redirect based on user type
      if (userType === "parent") {
        router.push("/parent/dashboard")
      } else {
        router.push("/driver/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "Verification failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setLoading(true)
    setError("")

    try {
      await resendOTP(email)
      setResendDisabled(true)
      setCountdown(60)
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-blue-100">
        <CardHeader className="text-center bg-blue-500 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center mb-6">
            <p className="text-gray-600">We&apos;ve sent a 6-digit verification code to</p>
            <p className="font-medium text-blue-600">{email}</p>
            <p className="text-gray-600 mt-2">Enter the code below to verify your email</p>
          </div>

          <div className="flex justify-center space-x-2 mb-6">
            {otp.map((digit, index) => (
              <Input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                className="w-12 h-12 text-center text-xl"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <Button onClick={handleVerify} className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>

          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">
              Didn&apos;t receive the code?{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-blue-500"
                disabled={resendDisabled || loading}
                onClick={handleResendOTP}
              >
                {resendDisabled ? `Resend in ${countdown}s` : "Resend Code"}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
