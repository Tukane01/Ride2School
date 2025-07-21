"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import RideHistoryDashboard from "@/components/ride-history-dashboard"
import RideAnalytics from "@/components/ride-analytics"
import { BarChart3, History, Settings, User } from "lucide-react"

export default function RideManagementPage() {
  const [userType, setUserType] = useState<"parent" | "driver">("parent")
  const [activeTab, setActiveTab] = useState("history")

  // Simulate getting user type from localStorage or context
  useEffect(() => {
    const user = localStorage.getItem("user")
    if (user) {
      const userData = JSON.parse(user)
      setUserType(userData.user_type || "parent")
    }
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ride Management</h1>
          <p className="text-muted-foreground">Comprehensive ride history and analytics dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {userType === "parent" ? "Parent" : "Driver"}
          </Badge>
        </div>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Ride History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View all completed and cancelled rides with detailed information and status tracking.
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Comprehensive analytics with completion rates, trends, and performance insights.
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cancel rides, rate experiences, and manage your ride preferences.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Ride History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-6">
          <RideHistoryDashboard userType={userType} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <RideAnalytics userType={userType} />
        </TabsContent>
      </Tabs>

      {/* Database Tables Info */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-lg">Database Architecture</CardTitle>
          <CardDescription>This system uses separate tables for ride history management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700">✅ Completed Rides Table</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Stores all successfully completed rides</li>
                <li>• Includes completion timestamps and metrics</li>
                <li>• Tracks rating status for both parties</li>
                <li>• Optimized for analytics and reporting</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-red-700">❌ Cancelled Rides Table</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Stores all cancelled ride information</li>
                <li>• Tracks who cancelled and when</li>
                <li>• Includes cancellation reasons</li>
                <li>• Helps identify patterns and issues</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded border">
            <p className="text-sm">
              <strong>Benefits:</strong> Improved performance, better analytics, data archiving capabilities, and
              enhanced reporting for business insights.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
