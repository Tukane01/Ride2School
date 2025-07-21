"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { verifyPasswordResetOTP, resetPassword, resendPasswordResetOTP } from "@/lib/auth"
import { Loader2, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

export default function ResetPassword() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Enter OTP, 2: Set new password
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [userName, setUserName] = useState("")

  useEffect(() => {
    // Get email from localStorage
    if (typeof window !== "undefined") {
      const storedEmail = localStorage.getItem("reset_email")
      if (storedEmail) {
        setEmail(storedEmail)
      } else {
        // If no email stored, redirect back to forgot password
        router.push("/auth/forgot-password")
      }
    }
  }, [router])

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await verifyPasswordResetOTP(email, otp)

      if (result.success) {
        setUserName(result.userName)
        setStep(2)
        setSuccess("OTP verified successfully! Now set your new password.")
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      // Validate passwords match
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match")
      }

      // Validate password strength
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long")
      }

      const result = await resetPassword(email, otp, newPassword)

      if (result.success) {
        setSuccess("Password reset successfully! Redirecting to login...")

        // Clear stored data
        if (typeof window !== "undefined") {
          localStorage.removeItem("reset_email")
          localStorage.removeItem("password_reset_otp")
        }

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setResendLoading(true)
    setError("")

    try {
      const result = await resendPasswordResetOTP(email)
      if (result.success) {
        setSuccess("New OTP sent successfully!")
        // In development, show the new OTP
        if (result.otp) {
          alert(`Development Mode - Your new OTP is: ${result.otp}`)
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP. Please try again.")
    } finally {
      setResendLoading(false)
    }
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
            <p className="text-gray-600 text-sm mt-1">{step === 1 ? "Verify OTP" : "Set new password"}</p>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (step === 1 ? router.push("/auth/forgot-password") : setStep(1))}
              className="p-0 h-auto text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {step === 1 ? "Back to Forgot Password" : "Back to OTP"}
            </Button>
          </div>

          <h2 className="text-xl font-semibold text-center mb-6">{step === 1 ? "Enter OTP" : "Set New Password"}</h2>

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

          {step === 1 ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} disabled className="bg-gray-50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">6-Digit OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  required
                />
                <p className="text-sm text-gray-600">Enter the 6-digit OTP sent to your email</p>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying OTP...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendOTP}
                  disabled={resendLoading}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    "Resend OTP"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <p className="text-sm text-blue-800">Hello {userName}, please set your new password</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>Password requirements:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>At least 6 characters long</li>
                  <li>Must match confirmation password</li>
                </ul>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
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
