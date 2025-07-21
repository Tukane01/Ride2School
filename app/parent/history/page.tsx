"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download, FileText, FileSpreadsheet, Code } from "lucide-react"
import { ParentNavbar } from "@/components/parent-navbar"
import { getParentRidesByRange, getParentTransactionsByRange } from "@/lib/api"
import { downloadTransactionHistory, downloadRideHistory } from "@/lib/download-utils"
import { formatDate } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"

export default function ParentHistoryPage() {
  const [activeTab, setActiveTab] = useState("rides")
  const [timeRange, setTimeRange] = useState("month")
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [loading, setLoading] = useState(false)
  const [ridesData, setRidesData] = useState<any[]>([])
  const [transactionsData, setTransactionsData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch data based on selected range
  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      if (activeTab === "rides") {
        const rides = await getParentRidesByRange(timeRange, customRange)
        setRidesData(rides)
      } else {
        const transactions = await getParentTransactionsByRange(timeRange, customRange)
        setTransactionsData(transactions)
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data")
      toast({
        title: "Error",
        description: "Failed to fetch data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch data when tab or range changes
  useEffect(() => {
    fetchData()
  }, [activeTab, timeRange, customRange])

  // Handle download
  const handleDownload = async (format: string) => {
    if (loading) return

    try {
      setLoading(true)

      if (activeTab === "rides") {
        if (ridesData.length === 0) {
          toast({
            title: "No Data",
            description: "No ride data available for the selected period.",
            variant: "destructive",
          })
          return
        }

        // Enhanced ride data with driver names
        const enhancedRidesData = ridesData.map((ride) => ({
          ...ride,
          driver_name: ride.driver_name || "Unknown Driver",
          child_name: ride.child_name || "Unknown Child",
          formatted_date: formatDate(ride.scheduled_time),
          formatted_fare: ride.fare ? `R${ride.fare.toFixed(2)}` : "R0.00",
          status_display: ride.status.charAt(0).toUpperCase() + ride.status.slice(1).replace("_", " "),
        }))

        await downloadRideHistory(enhancedRidesData, format, timeRange)

        toast({
          title: "Download Complete",
          description: `Ride history downloaded as ${format.toUpperCase()}`,
        })
      } else {
        if (transactionsData.length === 0) {
          toast({
            title: "No Data",
            description: "No transaction data available for the selected period.",
            variant: "destructive",
          })
          return
        }

        // Enhanced transaction data
        const enhancedTransactionsData = transactionsData.map((transaction) => ({
          ...transaction,
          formatted_date: formatDate(transaction.created_at),
          formatted_amount: `R${Math.abs(transaction.amount).toFixed(2)}`,
          type_display: transaction.type === "credit" ? "Credit" : "Debit",
        }))

        await downloadTransactionHistory(enhancedTransactionsData, format, timeRange)

        toast({
          title: "Download Complete",
          description: `Transaction history downloaded as ${format.toUpperCase()}`,
        })
      }
    } catch (err: any) {
      console.error("Download error:", err)
      toast({
        title: "Download Failed",
        description: err.message || "Failed to download data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Get download button icon
  const getDownloadIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case "pdf":
        return <FileText className="h-4 w-4" />
      case "docx":
        return <FileText className="h-4 w-4" />
      case "csv":
        return <FileSpreadsheet className="h-4 w-4" />
      case "xml":
        return <Code className="h-4 w-4" />
      default:
        return <Download className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ParentNavbar />
      <main className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">My History</h1>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rides">Ride History</TabsTrigger>
            <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          </TabsList>

          <div className="mt-6 mb-4 flex flex-wrap gap-4 items-center">
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Time Range:</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {timeRange === "custom" && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-32">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customRange.from ? formatDate(customRange.from) : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customRange.from}
                      onSelect={(date) => setCustomRange((prev) => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-32">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customRange.to ? formatDate(customRange.to) : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customRange.to}
                      onSelect={(date) => setCustomRange((prev) => ({ ...prev, to: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Download Buttons */}
            <div className="flex gap-2 ml-auto">
              {["PDF", "DOCX", "CSV", "XML"].map((format) => (
                <Button
                  key={format}
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(format)}
                  disabled={loading}
                  className="flex items-center gap-1"
                >
                  {getDownloadIcon(format)}
                  {format}
                </Button>
              ))}
            </div>
          </div>

          <TabsContent value="rides">
            <Card>
              <CardHeader>
                <CardTitle>Ride History</CardTitle>
                <CardDescription>
                  View and download your complete ride history including driver information.
                  {ridesData.length > 0 && ` (${ridesData.length} rides found)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : ridesData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No ride history found for the selected period.</div>
                ) : (
                  <div className="space-y-4">
                    {ridesData.slice(0, 10).map((ride) => (
                      <div key={ride.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  ride.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                              </span>
                              <span className="text-sm text-gray-500">{formatDate(ride.scheduled_time)}</span>
                            </div>
                            <p className="font-medium">{ride.origin_address}</p>
                            <p className="text-sm text-gray-600">→ {ride.destination_address}</p>
                            <div className="mt-2 text-sm text-gray-600">
                              <p>Child: {ride.child_name}</p>
                              <p>Driver: {ride.driver_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">R{(ride.fare || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {ridesData.length > 10 && (
                      <p className="text-center text-sm text-gray-500">
                        Showing 10 of {ridesData.length} rides. Download for complete history.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  View and download your complete transaction history.
                  {transactionsData.length > 0 && ` (${transactionsData.length} transactions found)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : transactionsData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No transaction history found for the selected period.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactionsData.slice(0, 10).map((transaction) => (
                      <div key={transaction.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  transaction.type === "credit"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {transaction.type === "credit" ? "Credit" : "Debit"}
                              </span>
                              <span className="text-sm text-gray-500">{formatDate(transaction.created_at)}</span>
                            </div>
                            <p className="font-medium">{transaction.description}</p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-semibold ${
                                transaction.type === "credit" ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {transaction.type === "credit" ? "+" : "-"}R{Math.abs(transaction.amount).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {transactionsData.length > 10 && (
                      <p className="text-center text-sm text-gray-500">
                        Showing 10 of {transactionsData.length} transactions. Download for complete history.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
