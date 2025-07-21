"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown } from "lucide-react"
import { driverTransactionManager } from "@/lib/api-driver-transactions"

interface TransactionSummaryProps {
  driverId: string
  timeRange: string
  customRange?: { from: Date | undefined; to: Date | undefined }
}

export function DriverTransactionSummary({ driverId, timeRange, customRange }: TransactionSummaryProps) {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true)
        const summaryData = await driverTransactionManager.getDriverTransactionSummary(
          driverId,
          timeRange as "today" | "week" | "month" | "year" | "custom",
          customRange?.from && customRange?.to
            ? {
                from: customRange.from,
                to: customRange.to,
              }
            : undefined,
        )
        setSummary(summaryData)
      } catch (error) {
        console.error("Error fetching transaction summary:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [driverId, timeRange, customRange])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!summary) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Money In */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Total Money In</CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{summary.formattedTotals.totalMoneyIn}</div>
          <p className="text-xs text-gray-500 mt-1">
            {summary.transactionCount > 0 && `From ${summary.transactionCount} transactions`}
          </p>
        </CardContent>
      </Card>

      {/* Total Money Out */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Total Money Out</CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{summary.formattedTotals.totalMoneyOut}</div>
          <p className="text-xs text-gray-500 mt-1">Withdrawals, fines & fees</p>
        </CardContent>
      </Card>

      {/* Net Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Net Amount</CardTitle>
          {summary.netAmount >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${summary.netAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
            {summary.formattedTotals.netAmount}
          </div>
          <p className="text-xs text-gray-500 mt-1">Money in minus money out</p>
        </CardContent>
      </Card>

      {/* Ride Earnings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Ride Earnings</CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{summary.formattedTotals.rideEarnings}</div>
          <p className="text-xs text-gray-500 mt-1">From completed rides</p>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-lg">Transaction Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Money In Categories */}
            <div className="space-y-2">
              <h4 className="font-medium text-green-600 text-sm">Money In</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ride Earnings:</span>
                  <span className="font-medium">{summary.formattedTotals.rideEarnings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wallet Deposits:</span>
                  <span className="font-medium">{summary.formattedTotals.walletDeposits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bonuses:</span>
                  <span className="font-medium">{summary.formattedTotals.bonuses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Refunds:</span>
                  <span className="font-medium">{summary.formattedTotals.refunds}</span>
                </div>
              </div>
            </div>

            {/* Money Out Categories */}
            <div className="space-y-2">
              <h4 className="font-medium text-red-600 text-sm">Money Out</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Withdrawals:</span>
                  <span className="font-medium">{summary.formattedTotals.walletWithdrawals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cancellation Fines:</span>
                  <span className="font-medium">{summary.formattedTotals.cancellationFines}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Policy Fines:</span>
                  <span className="font-medium">{summary.formattedTotals.policyFines}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fees:</span>
                  <span className="font-medium">{summary.formattedTotals.serviceFees}</span>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="space-y-2 md:col-span-2">
              <h4 className="font-medium text-gray-700 text-sm">Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Transactions:</span>
                  <span className="font-medium">{summary.transactionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Flow:</span>
                  <span className={`font-medium ${summary.netAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {summary.netAmount >= 0 ? "Positive" : "Negative"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
