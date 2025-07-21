"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CalendarIcon,
  Download,
  FileText,
  FileSpreadsheet,
  Code,
  Car,
  AlertCircle,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DriverNavbar } from "@/components/driver-navbar"
import { getUserProfile, getDriverEarnings, getDriverRidesByRange, getDriverTransactionsByRange } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { downloadTransactionHistory, downloadRideHistory } from "@/lib/download-utils"
import { toast } from "@/components/ui/use-toast"
// Import the new transaction summary component
import { DriverTransactionSummary } from "@/components/driver-transaction-summary"

export default function DriverEarningsPage() {
  const [user, setUser] = useState<any>(null)
  const [earnings, setEarnings] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    rides: 0,
  })
  const [activeTab, setActiveTab] = useState("overview")
  const [timeRange, setTimeRange] = useState("month")
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [loading, setLoading] = useState(true)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [error, setError] = useState("")
  const [ridesData, setRidesData] = useState<any[]>([])
  const [transactionsData, setTransactionsData] = useState<any[]>([])

  // Fetch initial data
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true)
        const [userData, earningsData] = await Promise.all([getUserProfile(), getDriverEarnings()])
        setUser(userData)
        setEarnings(earningsData)
      } catch (err: any) {
        setError(err.message || "Failed to fetch earnings")
      } finally {
        setLoading(false)
      }
    }

    fetchEarnings()
  }, [])

  // Fetch data based on selected range and tab
  const fetchTabData = async () => {
    if (activeTab === "overview") return

    setDownloadLoading(true)
    setError("")

    try {
      if (activeTab === "rides") {
        const rides = await getDriverRidesByRange(timeRange, customRange)
        setRidesData(rides)
      } else if (activeTab === "transactions") {
        const transactions = await getDriverTransactionsByRange(timeRange, customRange)
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
      setDownloadLoading(false)
    }
  }

  // Fetch data when tab or range changes
  useEffect(() => {
    fetchTabData()
  }, [activeTab, timeRange, customRange])

  // Handle download
  const handleDownload = async (format: string) => {
    if (downloadLoading) return

    try {
      setDownloadLoading(true)

      if (activeTab === "rides") {
        if (ridesData.length === 0) {
          toast({
            title: "No Data",
            description: "No ride data available for the selected period.",
            variant: "destructive",
          })
          return
        }

        // Enhanced ride data with parent and child names
        const enhancedRidesData = ridesData.map((ride) => ({
          ...ride,
          parent_name: ride.parent_name || "Unknown Parent",
          child_name: ride.child_name || "Unknown Child",
          formatted_date: formatDate(ride.scheduled_time),
          formatted_fare: ride.fare ? `R${ride.fare.toFixed(2)}` : "R0.00",
          status_display: ride.status.charAt(0).toUpperCase() + ride.status.slice(1).replace("_", " "),
          completion_date: ride.completed_at
            ? formatDate(ride.completed_at)
            : ride.cancelled_at
              ? formatDate(ride.cancelled_at)
              : "N/A",
        }))

        await downloadRideHistory(enhancedRidesData, format, timeRange)

        toast({
          title: "Download Complete",
          description: `Ride history downloaded as ${format.toUpperCase()}`,
        })
      } else if (activeTab === "transactions") {
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
          type_display: transaction.type === "credit" ? "Earning" : "Withdrawal",
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
      setDownloadLoading(false)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DriverNavbar />
        <main className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DriverNavbar />
      <main className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">My Earnings</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rides">Ride History</TabsTrigger>
            <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Today's Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(earnings.today)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(earnings.week)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(earnings.month)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(earnings.total)}</p>
                  <p className="text-sm text-gray-500 mt-1">{earnings.rides} rides completed</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Your latest transactions showing money in (green) and money out (red).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user?.wallet?.transactions?.length > 0 ? (
                  <div className="space-y-4">
                    {user.wallet.transactions.slice(0, 8).map((tx: any) => {
                      const isMoneyIn = tx.type === "credit" || tx.amount > 0
                      const isMoneyOut = tx.type === "debit" || tx.amount < 0

                      return (
                        <div key={tx.id} className="flex justify-between items-center border-b pb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isMoneyIn ? "bg-green-100" : "bg-red-100"}`}>
                              {tx.description.includes("Ride completed") && <Car className="h-4 w-4 text-green-600" />}
                              {(tx.description.includes("cancellation") || tx.description.includes("Cancellation")) && (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                              {(tx.description.includes("fine") ||
                                tx.description.includes("Fine") ||
                                tx.description.includes("penalty") ||
                                tx.description.includes("Penalty")) && <AlertCircle className="h-4 w-4 text-red-600" />}
                              {tx.description.includes("withdrawal") && (
                                <ArrowDownCircle className="h-4 w-4 text-red-600" />
                              )}
                              {(tx.description.includes("added") ||
                                tx.description.includes("deposit") ||
                                tx.description.includes("topup")) && (
                                <ArrowUpCircle className="h-4 w-4 text-green-600" />
                              )}
                              {!tx.description.includes("Ride") &&
                                !tx.description.includes("cancellation") &&
                                !tx.description.includes("Cancellation") &&
                                !tx.description.includes("fine") &&
                                !tx.description.includes("Fine") &&
                                !tx.description.includes("penalty") &&
                                !tx.description.includes("Penalty") &&
                                !tx.description.includes("withdrawal") &&
                                !tx.description.includes("added") &&
                                !tx.description.includes("deposit") &&
                                !tx.description.includes("topup") && <CreditCard className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    isMoneyIn ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {isMoneyIn ? "Money In" : "Money Out"}
                                </span>
                                <span className="text-sm text-gray-500">{new Date(tx.date).toLocaleString()}</span>
                              </div>
                              <p className="font-medium">{tx.description}</p>
                              {(tx.description.includes("cancellation") || tx.description.includes("Cancellation")) && (
                                <p className="text-xs text-red-600">Cancellation penalty deducted from wallet</p>
                              )}
                              {(tx.description.includes("fine") ||
                                tx.description.includes("Fine") ||
                                tx.description.includes("penalty") ||
                                tx.description.includes("Penalty")) && (
                                <p className="text-xs text-red-600">Policy violation fine deducted from wallet</p>
                              )}
                              {tx.description.includes("Ride completed") && (
                                <p className="text-xs text-green-600">Ride earnings added to wallet</p>
                              )}
                              {(tx.description.includes("added") ||
                                tx.description.includes("deposit") ||
                                tx.description.includes("topup")) && (
                                <p className="text-xs text-green-600">Funds added to wallet</p>
                              )}
                              {tx.description.includes("withdrawal") && (
                                <p className="text-xs text-red-600">Funds withdrawn from wallet</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${isMoneyIn ? "text-green-600" : "text-red-600"}`}>
                              {isMoneyIn ? "+" : "-"}
                              {formatCurrency(Math.abs(tx.amount))}
                            </p>
                            <p className={`text-xs ${isMoneyIn ? "text-green-500" : "text-red-500"}`}>
                              {isMoneyIn ? "Added" : "Deducted"}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">
                    No transaction history yet. Complete rides to start earning!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rides">
            <div className="mb-4 flex flex-wrap gap-4 items-center">
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
                    disabled={downloadLoading}
                    className="flex items-center gap-1"
                  >
                    {getDownloadIcon(format)}
                    {format}
                  </Button>
                ))}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Ride History</CardTitle>
                <CardDescription>
                  View and download your complete ride history including parent and child information.
                  {ridesData.length > 0 && ` (${ridesData.length} rides found)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {downloadLoading ? (
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
                              <p>Parent: {ride.parent_name || "Unknown"}</p>
                              <p>Child: {ride.child_name || "Unknown"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(ride.fare || 0)}</p>
                            {ride.status === "completed" && <p className="text-xs text-green-600">Earned</p>}
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
            <div className="mb-4 flex flex-wrap gap-4 items-center">
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
                    disabled={downloadLoading}
                    className="flex items-center gap-1"
                  >
                    {getDownloadIcon(format)}
                    {format}
                  </Button>
                ))}
              </div>
            </div>

            {/* Add Transaction Summary */}
            {user && <DriverTransactionSummary driverId={user.id} timeRange={timeRange} customRange={customRange} />}

            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  Complete transaction history showing all money in and money out transactions.
                  {transactionsData.length > 0 && ` (${transactionsData.length} transactions found)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {downloadLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : transactionsData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No transaction history found for the selected period.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactionsData.slice(0, 10).map((transaction) => {
                      const isMoneyIn = transaction.type === "credit" || transaction.amount > 0
                      const isMoneyOut = transaction.type === "debit" || transaction.amount < 0

                      return (
                        <div key={transaction.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${isMoneyIn ? "bg-green-100" : "bg-red-100"}`}>
                                {(transaction.description.includes("Ride completed") ||
                                  transaction.description.includes("ride earnings")) && (
                                  <Car className="h-4 w-4 text-green-600" />
                                )}
                                {(transaction.description.includes("cancellation") ||
                                  transaction.description.includes("Cancellation")) && (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                {(transaction.description.includes("fine") ||
                                  transaction.description.includes("Fine") ||
                                  transaction.description.includes("penalty") ||
                                  transaction.description.includes("Penalty")) && (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                {transaction.description.includes("withdrawal") && (
                                  <ArrowDownCircle className="h-4 w-4 text-red-600" />
                                )}
                                {(transaction.description.includes("added") ||
                                  transaction.description.includes("deposit") ||
                                  transaction.description.includes("topup")) && (
                                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                                )}
                                {!(
                                  transaction.description.includes("Ride") ||
                                  transaction.description.includes("cancellation") ||
                                  transaction.description.includes("Cancellation") ||
                                  transaction.description.includes("fine") ||
                                  transaction.description.includes("Fine") ||
                                  transaction.description.includes("penalty") ||
                                  transaction.description.includes("Penalty") ||
                                  transaction.description.includes("withdrawal") ||
                                  transaction.description.includes("added") ||
                                  transaction.description.includes("deposit") ||
                                  transaction.description.includes("topup")
                                ) && <CreditCard className="h-4 w-4" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      isMoneyIn ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {isMoneyIn ? "Money In" : "Money Out"}
                                  </span>
                                  <span className="text-sm text-gray-500">{formatDate(transaction.created_at)}</span>
                                  {(transaction.description.includes("cancellation") ||
                                    transaction.description.includes("Cancellation") ||
                                    transaction.description.includes("fine") ||
                                    transaction.description.includes("Fine") ||
                                    transaction.description.includes("penalty") ||
                                    transaction.description.includes("Penalty")) && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                      Penalty
                                    </span>
                                  )}
                                  {(transaction.description.includes("Ride completed") ||
                                    transaction.description.includes("ride earnings")) && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Earnings
                                    </span>
                                  )}
                                  {(transaction.description.includes("added") ||
                                    transaction.description.includes("deposit") ||
                                    transaction.description.includes("topup")) && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      Deposit
                                    </span>
                                  )}
                                  {transaction.description.includes("withdrawal") && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                      Withdrawal
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium">{transaction.description}</p>
                                {(transaction.description.includes("cancellation") ||
                                  transaction.description.includes("Cancellation")) && (
                                  <p className="text-xs text-red-600 mt-1">
                                    This amount was deducted from your wallet balance for cancelling a ride
                                  </p>
                                )}
                                {(transaction.description.includes("fine") ||
                                  transaction.description.includes("Fine") ||
                                  transaction.description.includes("penalty") ||
                                  transaction.description.includes("Penalty")) && (
                                  <p className="text-xs text-red-600 mt-1">
                                    This amount was deducted from your wallet balance as a penalty
                                  </p>
                                )}
                                {(transaction.description.includes("Ride completed") ||
                                  transaction.description.includes("ride earnings")) && (
                                  <p className="text-xs text-green-600 mt-1">
                                    This amount was added to your wallet balance for completing a ride
                                  </p>
                                )}
                                {(transaction.description.includes("added") ||
                                  transaction.description.includes("deposit") ||
                                  transaction.description.includes("topup")) && (
                                  <p className="text-xs text-green-600 mt-1">
                                    This amount was added to your wallet balance
                                  </p>
                                )}
                                {transaction.description.includes("withdrawal") && (
                                  <p className="text-xs text-red-600 mt-1">
                                    This amount was withdrawn from your wallet balance
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold text-lg ${isMoneyIn ? "text-green-600" : "text-red-600"}`}>
                                {isMoneyIn ? "+" : "-"}
                                {formatCurrency(Math.abs(transaction.amount))}
                              </p>
                              {(transaction.description.includes("Ride completed") ||
                                transaction.description.includes("ride earnings")) && (
                                <p className="text-xs text-green-600">Added</p>
                              )}
                              {(transaction.description.includes("cancellation") ||
                                transaction.description.includes("Cancellation") ||
                                transaction.description.includes("fine") ||
                                transaction.description.includes("Fine") ||
                                transaction.description.includes("penalty") ||
                                transaction.description.includes("Penalty")) && (
                                <p className="text-xs text-red-600">Deducted</p>
                              )}
                              {(transaction.description.includes("added") ||
                                transaction.description.includes("deposit") ||
                                transaction.description.includes("topup")) && (
                                <p className="text-xs text-green-600">Added</p>
                              )}
                              {transaction.description.includes("withdrawal") && (
                                <p className="text-xs text-red-600">Withdrawn</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
