"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, FileDown, Calendar, Check } from "lucide-react"
import { downloadTransactionHistory, downloadRideHistory } from "@/lib/download-utils"
import { getParentTransactionsByRange, getParentRidesByRange } from "@/lib/api"
import { getCurrentUser } from "@/lib/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

interface ParentDownloadHistoryProps {
  type: "transactions" | "rides"
  title: string
  description: string
}

export function ParentDownloadHistory({ type, title, description }: ParentDownloadHistoryProps) {
  const [timeRange, setTimeRange] = useState("today")
  const [format, setFormat] = useState("pdf")
  const [loading, setLoading] = useState(false)
  const [checkingRecords, setCheckingRecords] = useState(false)
  const [recordCount, setRecordCount] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)
  const user = getCurrentUser()

  const fetchRecordCount = async () => {
    if (!user) return

    try {
      setCheckingRecords(true)
      setError("")
      setSuccess("")

      let data
      if (type === "transactions") {
        data = await getParentTransactionsByRange(user.id, timeRange, showCustomDateRange ? customDateRange : undefined)
      } else {
        data = await getParentRidesByRange(user.id, timeRange, showCustomDateRange ? customDateRange : undefined)
      }

      setRecordCount(data.length)
      if (data.length === 0) {
        setError(`No ${type} found for the selected time range.`)
      }
    } catch (err: any) {
      setError(err.message || `Failed to fetch ${type}`)
      setRecordCount(null)
    } finally {
      setCheckingRecords(false)
    }
  }

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value)
    setRecordCount(null) // Reset count when range changes
    setShowCustomDateRange(value === "custom")
    setError("")
    setSuccess("")
  }

  const handleDownload = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError("")
      setSuccess("")

      let data
      if (type === "transactions") {
        data = await getParentTransactionsByRange(user.id, timeRange, showCustomDateRange ? customDateRange : undefined)

        if (data.length === 0) {
          throw new Error("No transactions found for the selected time range")
        }

        await downloadTransactionHistory(data, format, timeRange)
      } else {
        data = await getParentRidesByRange(user.id, timeRange, showCustomDateRange ? customDateRange : undefined)

        if (data.length === 0) {
          throw new Error("No rides found for the selected time range")
        }

        await downloadRideHistory(data, format, timeRange)
      }

      setSuccess(`${type === "transactions" ? "Transaction" : "Ride"} history downloaded successfully!`)
    } catch (err: any) {
      setError(err.message || `Failed to download ${type}`)
    } finally {
      setLoading(false)
    }
  }

  const formatDateRange = () => {
    if (!customDateRange.from) return "Select start date"
    if (!customDateRange.to) return `From ${customDateRange.from.toLocaleDateString()}`
    return `${customDateRange.from.toLocaleDateString()} to ${customDateRange.to.toLocaleDateString()}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeRange">Time Range</Label>
              <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger id="timeRange">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id="format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="docx">Word (DOCX)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {showCustomDateRange && (
            <div className="space-y-2">
              <Label>Custom Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {formatDateRange()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange.from}
                    selected={customDateRange}
                    onSelect={setCustomDateRange as any}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchRecordCount}
              disabled={checkingRecords || (showCustomDateRange && (!customDateRange.from || !customDateRange.to))}
              className="w-full sm:w-auto"
            >
              {checkingRecords ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Check Records
            </Button>

            <Button
              onClick={handleDownload}
              disabled={loading || (showCustomDateRange && (!customDateRange.from || !customDateRange.to))}
              className="w-full sm:w-auto flex items-center"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
              Download
            </Button>
          </div>

          {recordCount !== null && recordCount > 0 && (
            <p className="text-sm text-green-600 font-medium">
              {recordCount} {type} found for the selected time range.
            </p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
