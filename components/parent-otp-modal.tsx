"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Copy, Check } from "lucide-react"
import { generateRideOTP } from "@/lib/api"

interface ParentOTPModalProps {
  rideId: string
  isOpen: boolean
  onClose: () => void
  onOTPGenerated: (otp: string) => void
}

export default function ParentOTPModal({ rideId, isOpen, onClose, onOTPGenerated }: ParentOTPModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otp, setOtp] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // Remove this line
  // const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds

  // Remove or comment out this useEffect
  // useEffect(() => {
  //   let timer: NodeJS.Timeout
  //   if (otp && timeLeft > 0) {
  //     timer = setInterval(() => {
  //       setTimeLeft((prev) => prev - 1)
  //     }, 1000)
  //   }
  //   return () => {
  //     if (timer) clearInterval(timer)
  //   }
  // }, [otp, timeLeft])

  // Remove this function
  // const formatTime = (seconds: number) => {
  //   const mins = Math.floor(seconds / 60)
  //   const secs = seconds % 60
  //   return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  // }

  const handleGenerateOTP = async () => {
    setLoading(true)
    setError(null)

    try {
      const generatedOTP = await generateRideOTP(rideId)
      setOtp(generatedOTP)
      // Remove this line from handleGenerateOTP
      // setTimeLeft(600) // Reset timer to 10 minutes
      onOTPGenerated(generatedOTP)
    } catch (err: any) {
      console.error("Error generating OTP:", err)
      setError(err.message || "Failed to generate OTP")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (otp) {
      navigator.clipboard.writeText(otp)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate OTP for Ride</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {otp ? (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md text-center">
              <p className="text-sm text-blue-700 mb-2">Your OTP code is:</p>
              <div className="flex items-center justify-center">
                <p className="text-3xl font-bold tracking-widest text-blue-800">{otp}</p>
                <Button variant="ghost" size="sm" className="ml-2" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Share this code with your child. The driver will need this code to start the ride.
              </p>
              {/* Remove these lines from the JSX */}
              {/* {timeLeft > 0 && (
                <p className="text-xs text-blue-700 mt-2 font-medium">Expires in: {formatTime(timeLeft)}</p>
              )}
              {timeLeft <= 0 && (
                <p className="text-xs text-red-600 mt-2 font-medium">OTP has expired. Please generate a new one.</p>
              )} */}
            </div>

            <div className="flex space-x-2">
              <Button className="w-full" onClick={handleGenerateOTP} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate New OTP
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Generate a one-time password (OTP) for this ride. The driver will need this code to verify the ride.
            </p>

            <Button className="w-full" onClick={handleGenerateOTP} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate OTP
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
