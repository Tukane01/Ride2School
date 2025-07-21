"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { forgotPassword } from "@/lib/auth"
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
import Image from "next/image"

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [userName, setUserName] = useState("")
  const [developmentOtp, setDevelopmentOtp] = useState("")

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const result = await forgotPassword(email)

      if (result.success) {
        setSuccess(result.message)
        setUserName(result.userName)
        setOtpSent(true)

        // In development, show the OTP
        if (result.otp) {
          setDevelopmentOtp(result.otp)
          alert(`Development Mode - Your OTP is: ${result.otp}`)
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleProceedToReset = () => {
    // Store email in localStorage for the reset page
    if (typeof window !== "undefined") {
      localStorage.setItem("reset_email", email)
    }
    router.push("/auth/reset-password")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center bg-white pb-2">
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16 mb-2">
              <Image src="/images/ride.png" alt="Ride2School Logo" fill className="object-contain" priority />
            </div>
            <CardTitle className="text-2xl font-bold text-blue-600">Ride2School</CardTitle>
            <p className="text-gray-600 text-sm mt-1">Reset your password</p>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/auth/login")}
              className="p-0 h-auto text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </Button>
          </div>

          <h2 className="text-xl font-semibold text-center mb-6">Forgot Password</h2>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {!otpSent ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-600">Enter the email address you used to register your account</p>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send Reset OTP"
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-800 mb-1">OTP Sent Successfully!</h3>
                <p className="text-sm text-green-700">
                  Good day {userName}, we've sent a 6-digit OTP to your email address. The OTP will expire in 24 hours.
                </p>
                {developmentOtp && (
                  <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
                    <p className="text-xs text-yellow-800">
                      <strong>Development Mode:</strong> Your OTP is {developmentOtp}
                    </p>
                  </div>
                )}
              </div>

              <Button onClick={handleProceedToReset} className="w-full bg-blue-600 hover:bg-blue-700">
                Proceed to Enter OTP
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOtpSent(false)
                    setSuccess("")
                    setDevelopmentOtp("")
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Use different email address
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{" "}
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="text-center text-gray-500 text-sm mt-6">© 2025 Ride2School. All rights reserved.</div>
        </CardContent>
      </Card>
    </div>
  )
}
