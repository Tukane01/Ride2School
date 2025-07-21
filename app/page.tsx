"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import Link from "next/link"
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { loginUser } from "@/lib/auth"

export default function Home() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState("login")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

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
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-16 h-16 mb-4">
            <Image src="/images/ride.png" alt="Ride2School Logo" fill className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-bold text-blue-600">Ride2School</h1>
          <p className="text-gray-600 mt-1">Safe transportation for your children</p>
        </div>

        <Tabs defaultValue="login" className="w-full mb-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-gray-700">
                  Email
                </label>
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
                <label htmlFor="password" className="text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full text-blue-600"
                onClick={togglePasswordVisibility}
                type="button"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide password
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show password
                  </>
                )}
              </Button>

              <Button className="w-full bg-blue-600 hover:bg-blue-700" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
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
          </TabsContent>

          <TabsContent value="register">
            <div className="text-center p-4">
              <p className="mb-4">Choose how you want to register:</p>
              <div className="grid grid-cols-1 gap-4">
                <Link href="/auth/register?type=parent">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">Register as Parent</Button>
                </Link>
                <Link href="/auth/register?type=driver">
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">Register as Driver</Button>
                </Link>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-center text-gray-500 text-sm mt-6">© 2025 Ride2School. All rights reserved.</div>
      </div>
    </div>
  )
}
