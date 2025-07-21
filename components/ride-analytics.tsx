"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, Calendar, DollarSign } from "lucide-react"
import { getRideHistory, getDriverEarnings } from "@/lib/api"
import type { Ride } from "@/lib/types"

interface RideAnalyticsProps {
  userType: "parent" | "driver"
}

export default function RideAnalytics({ userType }: RideAnalyticsProps) {
  const [rides, setRides] = useState<Ride[]>([])
  const [earnings, setEarnings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [userType])

  const fetchData = async () => {
    try {
      setLoading(true)
      const rideData = await getRideHistory()
      setRides(rideData)

      if (userType === "driver") {
        const earningsData = await getDriverEarnings()
        setEarnings(earningsData)
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate analytics
  const totalRides = rides.length
  const completedRides = rides.filter((ride) => ride.status === "completed")
  const cancelledRides = rides.filter((ride) => ride.status === "cancelled")
  const completionRate = totalRides > 0 ? (completedRides.length / totalRides) * 100 : 0
  const cancellationRate = totalRides > 0 ? (cancelledRides.length / totalRides) * 100 : 0

  // Monthly ride data
  const monthlyData = rides.reduce(
    (acc, ride) => {
      const month = new Date(ride.scheduledTime).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      if (!acc[month]) {
        acc[month] = { month, completed: 0, cancelled: 0, total: 0 }
      }
      acc[month].total++
      if (ride.status === "completed") acc[month].completed++
      if (ride.status === "cancelled") acc[month].cancelled++
      return acc
    },
    {} as Record<string, any>,
  )

  const chartData = Object.values(monthlyData).slice(-6) // Last 6 months

  // Status distribution
  const statusData = [
    { name: "Completed", value: completedRides.length, color: "#10B981" },
    { name: "Cancelled", value: cancelledRides.length, color: "#EF4444" },
  ]

  // Average fare
  const totalFare = completedRides.reduce((sum, ride) => sum + (ride.fare || 0), 0)
  const averageFare = completedRides.length > 0 ? totalFare / completedRides.length : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRides}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>All time</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Fare</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{averageFare.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per completed ride</p>
          </CardContent>
        </Card>

        {userType === "driver" && earnings && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R{earnings.total.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From {earnings.rides} rides</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Ride Trends</CardTitle>
            <CardDescription>Completed vs Cancelled rides over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#10B981" name="Completed" />
                <Bar dataKey="cancelled" fill="#EF4444" name="Cancelled" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Ride Status Distribution</CardTitle>
            <CardDescription>Breakdown of ride outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Key metrics and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completion Rate</span>
                <Badge variant={completionRate >= 80 ? "default" : "destructive"}>
                  {completionRate >= 80 ? "Excellent" : "Needs Improvement"}
                </Badge>
              </div>
              <Progress value={completionRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {completionRate >= 80
                  ? "Great job! Your completion rate is above average."
                  : "Consider improving communication to reduce cancellations."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cancellation Rate</span>
                <Badge variant={cancellationRate <= 20 ? "default" : "destructive"}>
                  {cancellationRate <= 20 ? "Good" : "High"}
                </Badge>
              </div>
              <Progress value={cancellationRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {cancellationRate <= 20
                  ? "Your cancellation rate is within acceptable limits."
                  : "High cancellation rate may indicate scheduling or communication issues."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Summary</CardTitle>
          <CardDescription>Last 30 days overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalRides}</div>
              <p className="text-xs text-muted-foreground">Total Rides</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedRides.length}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{cancelledRides.length}</div>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">R{totalFare.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total Value</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
