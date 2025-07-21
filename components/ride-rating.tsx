"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { rateRide } from "@/lib/api"
import { Loader2, AlertCircle, Star } from "lucide-react"

interface RideRatingProps {
  ride: any
  onRated: () => void
  onCancel: () => void
}

export default function RideRating({ ride, onRated, onCancel }: RideRatingProps) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await rateRide(ride.id, rating, comment)
      onRated()
    } catch (err: any) {
      setError(err.message || "Failed to submit rating")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Rate Your Ride</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => setRating(value)} className="focus:outline-none">
                    <Star
                      className={`h-8 w-8 ${value <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="comment" className="text-sm font-medium">
                Comments (Optional)
              </label>
              <Textarea
                id="comment"
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex space-x-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Rating"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
