"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { loginUser } from "@/lib/auth"
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"
import Image from "next/image"

export default function Login() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userType = searchParams.get("type") || "parent"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Validate email format
      if (!email.includes("@") || !email.includes(".") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Invalid email format")
      }

      // Validate password
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters")
      }

      const result = await loginUser(email, password)

      // Redirect based on user type
      if (result.userType === "parent") {
        router.push("/parent/dashboard")
      } else if (result.userType === "driver") {
        router.push("/driver/dashboard")
      } else {
        throw new Error("Unknown user type")
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.")
    } finally {
      setLoading(false)
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
            <p className="text-gray-600 text-sm mt-1">Safe transportation for your children</p>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-center mb-6">
            Login as {userType === "parent" ? "Parent" : "Driver"}
          </h2>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <Button
              type="button"
              variant="outline"
              className="w-full text-blue-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide password" : "Show password"}
            </Button>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="text-center mt-4">
            <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          <div className="mt-4 text-center text-sm">
            <p className="text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href={`/auth/register?type=${userType}`} className="text-blue-600 hover:underline">
                Register
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Button variant="ghost" className="text-gray-500" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </div>

          <div className="text-center text-gray-500 text-sm mt-6">© 2025 Ride2School. All rights reserved.</div>
        </CardContent>
      </Card>
    </div>
  )
}
