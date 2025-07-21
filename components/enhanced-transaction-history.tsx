"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  Car,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react"
import { transactionManager } from "@/lib/api-enhanced-transactions"
import { getCurrentUser } from "@/lib/auth"
import { formatDateTime } from "@/lib/utils"

interface TransactionHistoryProps {
  userId?: string
  showSummary?: boolean
  showFilters?: boolean
  maxHeight?: string
}

export function EnhancedTransactionHistory({
  userId,
  showSummary = true,
  showFilters = true,
  maxHeight = "600px",
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [walletBalance, setWalletBalance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    type: "all",
    transactionType: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  })
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    hasMore: false,
    totalCount: 0,
  })

  const currentUser = getCurrentUser()
  const effectiveUserId = userId || currentUser?.id

  useEffect(() => {
    if (effectiveUserId) {
      loadTransactionData()
    }
  }, [effectiveUserId, filters])

  const loadTransactionData = async () => {
    try {
      setLoading(true)
      setError("")

      // Load transactions
      const transactionOptions = {
        limit: pagination.limit,
        offset: pagination.offset,
        type: filters.type === "all" ? undefined : (filters.type as "credit" | "debit"),
        transactionType: filters.transactionType || undefined,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        includeMetadata: true,
      }

      const [transactionResult, summaryResult, balanceResult] = await Promise.all([
        transactionManager.getTransactionHistory(effectiveUserId!, transactionOptions),
        showSummary ? transactionManager.getTransactionSummary(effectiveUserId!, "month") : null,
        transactionManager.getWalletBalance(effectiveUserId!),
      ])

      setTransactions(transactionResult.transactions)
      setPagination((prev) => ({
        ...prev,
        hasMore: transactionResult.hasMore,
        totalCount: transactionResult.totalCount,
      }))

      if (summaryResult) {
        setSummary(summaryResult)
      }

      setWalletBalance(balanceResult)
    } catch (err: any) {
      setError(err.message || "Failed to load transaction data")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, offset: 0 }))
  }

  const loadMoreTransactions = async () => {
    try {
      const newOffset = pagination.offset + pagination.limit

      const transactionOptions = {
        limit: pagination.limit,
        offset: newOffset,
        type: filters.type === "all" ? undefined : (filters.type as "credit" | "debit"),
        transactionType: filters.transactionType || undefined,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        includeMetadata: true,
      }

      const result = await transactionManager.getTransactionHistory(effectiveUserId!, transactionOptions)

      setTransactions((prev) => [...prev, ...result.transactions])
      setPagination((prev) => ({
        ...prev,
        offset: newOffset,
        hasMore: result.hasMore,
      }))
    } catch (err: any) {
      setError(err.message || "Failed to load more transactions")
    }
  }

  const getTransactionIcon = (transaction: any) => {
    switch (transaction.transactionType) {
      case "ride_payment":
        return <Car className="h-4 w-4" />
      case "ride_earnings":
        return <TrendingUp className="h-4 w-4" />
      case "wallet_topup":
        return <ArrowUpCircle className="h-4 w-4" />
      case "wallet_withdrawal":
        return <ArrowDownCircle className="h-4 w-4" />
      case "cancellation_fee":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  const getStatusBadge = (transaction: any) => {
    const statusConfig = {
      completed: { variant: "default" as const, icon: CheckCircle, text: "Completed" },
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" },
      failed: { variant: "destructive" as const, icon: AlertCircle, text: "Failed" },
    }

    const config = statusConfig[transaction.status as keyof typeof statusConfig] || statusConfig.completed
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  if (loading && transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading transaction history...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance & Summary */}
      {showSummary && walletBalance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{walletBalance.formattedBalance}</div>
              {!walletBalance.isBalanceAccurate && (
                <p className="text-xs text-yellow-600 mt-1">⚠️ Balance verification in progress</p>
              )}
            </CardContent>
          </Card>

          {summary && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month Credits</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{summary.formattedTotals.totalCredits}</div>
                  <p className="text-xs text-muted-foreground">From {summary.transactionCount} transactions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month Debits</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{summary.formattedTotals.totalDebits}</div>
                  <p className="text-xs text-muted-foreground">Fees: {summary.formattedTotals.totalFees}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="type-filter">Type</Label>
                <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credits</SelectItem>
                    <SelectItem value="debit">Debits</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="transaction-type-filter">Category</Label>
                <Select
                  value={filters.transactionType}
                  onValueChange={(value) => handleFilterChange("transactionType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_categories">All Categories</SelectItem>
                    <SelectItem value="ride_payment">Ride Payments</SelectItem>
                    <SelectItem value="ride_earnings">Ride Earnings</SelectItem>
                    <SelectItem value="wallet_topup">Wallet Top-ups</SelectItem>
                    <SelectItem value="wallet_withdrawal">Withdrawals</SelectItem>
                    <SelectItem value="cancellation_fee">Cancellation Fees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date-from">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="date-to">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({
                    type: "all",
                    transactionType: "",
                    dateFrom: "",
                    dateTo: "",
                    search: "",
                  })
                }}
              >
                Clear Filters
              </Button>

              <Button onClick={loadTransactionData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {pagination.totalCount > 0
              ? `Showing ${transactions.length} of ${pagination.totalCount} transactions`
              : "No transactions found"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4" style={{ maxHeight, overflowY: "auto" }}>
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full ${transaction.categoryColor === "text-green-600" ? "bg-green-100" : "bg-red-100"}`}
                    >
                      {getTransactionIcon(transaction)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{transaction.displayDescription}</p>
                        {getStatusBadge(transaction)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>{formatDateTime(transaction.createdAt)}</span>
                        {transaction.feeAmount > 0 && <span>Fee: {transaction.formattedFeeAmount}</span>}
                        {transaction.rideDetails && (
                          <span className="truncate max-w-xs">{transaction.rideDetails}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-bold text-lg ${transaction.categoryColor}`}>
                      {transaction.type === "credit" ? "+" : "-"}
                      {transaction.formattedAmount}
                    </p>
                    {transaction.netAmount !== transaction.amount && (
                      <p className="text-sm text-gray-500">Net: {transaction.formattedNetAmount}</p>
                    )}
                  </div>
                </div>
              ))}

              {pagination.hasMore && (
                <div className="flex justify-center pt-4">
                  <Button onClick={loadMoreTransactions} variant="outline">
                    Load More Transactions
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No transactions found</p>
              <p className="text-sm text-gray-400 mt-1">
                {filters.type !== "all" || filters.transactionType || filters.dateFrom || filters.dateTo
                  ? "Try adjusting your filters"
                  : "Transactions will appear here once you start using the app"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
