import { getBrowserClient } from "./supabase"

// Enhanced transaction management with complete data integrity
export class TransactionManager {
  private supabase = getBrowserClient()

  // Get comprehensive transaction history with all details
  async getTransactionHistory(
    userId: string,
    options: {
      limit?: number
      offset?: number
      type?: "credit" | "debit" | "all"
      transactionType?: string
      dateFrom?: Date
      dateTo?: Date
      includeMetadata?: boolean
    } = {},
  ) {
    try {
      const {
        limit = 50,
        offset = 0,
        type = "all",
        transactionType,
        dateFrom,
        dateTo,
        includeMetadata = true,
      } = options

      let query = this.supabase
        .from("transaction_details")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      // Apply filters
      if (type !== "all") {
        query = query.eq("type", type)
      }

      if (transactionType) {
        query = query.eq("transaction_type", transactionType)
      }

      if (dateFrom) {
        query = query.gte("created_at", dateFrom.toISOString())
      }

      if (dateTo) {
        query = query.lte("created_at", dateTo.toISOString())
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch transaction history: ${error.message}`)
      }

      // Format transactions for display
      const formattedTransactions =
        data?.map((transaction) => ({
          id: transaction.id,
          amount: Number.parseFloat(transaction.amount),
          type: transaction.type,
          description: transaction.description,
          transactionType: transaction.transaction_type,
          status: transaction.status,
          feeAmount: Number.parseFloat(transaction.fee_amount || 0),
          netAmount: Number.parseFloat(transaction.net_amount || transaction.amount),
          createdAt: transaction.created_at,
          processedAt: transaction.processed_at,
          rideDetails: transaction.ride_details,
          metadata: includeMetadata ? transaction.metadata : undefined,
          // Additional formatting
          formattedAmount: this.formatCurrency(transaction.amount),
          formattedNetAmount: this.formatCurrency(transaction.net_amount || transaction.amount),
          formattedFeeAmount: this.formatCurrency(transaction.fee_amount || 0),
          displayDescription: this.getDisplayDescription(transaction),
          categoryIcon: this.getCategoryIcon(transaction.transaction_type),
          categoryColor: this.getCategoryColor(transaction.type),
        })) || []

      return {
        transactions: formattedTransactions,
        totalCount: count || 0,
        hasMore: offset + limit < (count || 0),
      }
    } catch (error: any) {
      console.error("Error fetching transaction history:", error)
      throw new Error(error.message || "Failed to fetch transaction history")
    }
  }

  // Get transaction summary with accurate totals
  async getTransactionSummary(userId: string, period: "today" | "week" | "month" | "year" = "month") {
    try {
      const dateRange = this.getDateRange(period)

      const { data, error } = await this.supabase
        .from("transactions")
        .select("amount, type, transaction_type, fee_amount, net_amount, created_at")
        .eq("user_id", userId)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())

      if (error) {
        throw new Error(`Failed to fetch transaction summary: ${error.message}`)
      }

      const summary = {
        totalCredits: 0,
        totalDebits: 0,
        totalFees: 0,
        netAmount: 0,
        transactionCount: data?.length || 0,
        ridePayments: 0,
        rideEarnings: 0,
        walletTopups: 0,
        walletWithdrawals: 0,
        cancellationFees: 0,
        breakdown: {} as Record<string, { count: number; amount: number }>,
      }

      data?.forEach((transaction) => {
        const amount = Number.parseFloat(transaction.amount)
        const feeAmount = Number.parseFloat(transaction.fee_amount || 0)
        const netAmount = Number.parseFloat(transaction.net_amount || amount)

        if (transaction.type === "credit") {
          summary.totalCredits += netAmount
        } else {
          summary.totalDebits += amount
        }

        summary.totalFees += feeAmount

        // Categorize by transaction type
        switch (transaction.transaction_type) {
          case "ride_payment":
            summary.ridePayments += amount
            break
          case "ride_earnings":
            summary.rideEarnings += netAmount
            break
          case "wallet_topup":
            summary.walletTopups += netAmount
            break
          case "wallet_withdrawal":
            summary.walletWithdrawals += amount
            break
          case "cancellation_fee":
            summary.cancellationFees += amount
            break
        }

        // Build breakdown
        const type = transaction.transaction_type || "general"
        if (!summary.breakdown[type]) {
          summary.breakdown[type] = { count: 0, amount: 0 }
        }
        summary.breakdown[type].count++
        summary.breakdown[type].amount += transaction.type === "credit" ? netAmount : amount
      })

      summary.netAmount = summary.totalCredits - summary.totalDebits

      return {
        ...summary,
        period,
        dateRange,
        formattedTotals: {
          totalCredits: this.formatCurrency(summary.totalCredits),
          totalDebits: this.formatCurrency(summary.totalDebits),
          totalFees: this.formatCurrency(summary.totalFees),
          netAmount: this.formatCurrency(summary.netAmount),
          ridePayments: this.formatCurrency(summary.ridePayments),
          rideEarnings: this.formatCurrency(summary.rideEarnings),
          walletTopups: this.formatCurrency(summary.walletTopups),
          walletWithdrawals: this.formatCurrency(summary.walletWithdrawals),
          cancellationFees: this.formatCurrency(summary.cancellationFees),
        },
      }
    } catch (error: any) {
      console.error("Error fetching transaction summary:", error)
      throw new Error(error.message || "Failed to fetch transaction summary")
    }
  }

  // Get wallet balance with transaction verification
  async getWalletBalance(userId: string) {
    try {
      // Get current balance from users table
      const { data: userData, error: userError } = await this.supabase
        .from("users")
        .select("wallet_balance, total_credits, total_debits")
        .eq("id", userId)
        .single()

      if (userError) {
        throw new Error(`Failed to fetch wallet balance: ${userError.message}`)
      }

      // Verify balance by calculating from transactions
      const { data: transactions, error: transError } = await this.supabase
        .from("transactions")
        .select("amount, type, net_amount")
        .eq("user_id", userId)
        .eq("status", "completed")

      if (transError) {
        console.warn("Could not verify balance from transactions:", transError.message)
      }

      let calculatedBalance = 0
      if (transactions) {
        transactions.forEach((transaction) => {
          const amount = Number.parseFloat(transaction.net_amount || transaction.amount)
          if (transaction.type === "credit") {
            calculatedBalance += amount
          } else {
            calculatedBalance -= Number.parseFloat(transaction.amount)
          }
        })
      }

      const currentBalance = Number.parseFloat(userData.wallet_balance || 0)
      const balanceDiscrepancy = Math.abs(currentBalance - calculatedBalance)

      return {
        currentBalance,
        calculatedBalance,
        totalCredits: Number.parseFloat(userData.total_credits || 0),
        totalDebits: Number.parseFloat(userData.total_debits || 0),
        balanceDiscrepancy,
        isBalanceAccurate: balanceDiscrepancy < 0.01, // Allow for minor rounding differences
        formattedBalance: this.formatCurrency(currentBalance),
        formattedCalculatedBalance: this.formatCurrency(calculatedBalance),
        lastUpdated: new Date().toISOString(),
      }
    } catch (error: any) {
      console.error("Error fetching wallet balance:", error)
      throw new Error(error.message || "Failed to fetch wallet balance")
    }
  }

  // Add funds with comprehensive transaction tracking
  async addFunds(userId: string, amount: number, paymentMethod = "card", paymentReference?: string) {
    try {
      const { data, error } = await this.supabase.rpc("add_funds_with_transaction", {
        p_user_id: userId,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference,
      })

      if (error) {
        throw new Error(`Failed to add funds: ${error.message}`)
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to add funds")
      }

      return {
        success: true,
        transactionId: data.transaction_id,
        amount: data.amount,
        processingFee: data.processing_fee,
        netAmount: data.net_amount,
        message: data.message,
      }
    } catch (error: any) {
      console.error("Error adding funds:", error)
      throw new Error(error.message || "Failed to add funds")
    }
  }

  // Withdraw funds with comprehensive transaction tracking
  async withdrawFunds(userId: string, amount: number, withdrawalMethod = "bank_transfer", accountReference?: string) {
    try {
      const { data, error } = await this.supabase.rpc("withdraw_funds_with_transaction", {
        p_user_id: userId,
        p_amount: amount,
        p_withdrawal_method: withdrawalMethod,
        p_account_reference: accountReference,
      })

      if (error) {
        throw new Error(`Failed to withdraw funds: ${error.message}`)
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to withdraw funds")
      }

      return {
        success: true,
        transactionId: data.transaction_id,
        amount: data.amount,
        withdrawalFee: data.withdrawal_fee,
        totalDeducted: data.total_deducted,
        message: data.message,
      }
    } catch (error: any) {
      console.error("Error withdrawing funds:", error)
      throw new Error(error.message || "Failed to withdraw funds")
    }
  }

  // Complete ride with accurate transaction handling
  async completeRide(rideId: string, driverId: string) {
    try {
      const { data, error } = await this.supabase.rpc("complete_ride_with_accurate_transactions", {
        p_ride_id: rideId,
        p_driver_id: driverId,
      })

      if (error) {
        throw new Error(`Failed to complete ride: ${error.message}`)
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to complete ride")
      }

      return {
        success: true,
        rideId: data.ride_id,
        fare: data.fare,
        platformFee: data.platform_fee,
        driverEarnings: data.driver_earnings,
        parentTransactionId: data.parent_transaction_id,
        driverTransactionId: data.driver_transaction_id,
        completedAt: data.completed_at,
        message: data.message,
      }
    } catch (error: any) {
      console.error("Error completing ride:", error)
      throw new Error(error.message || "Failed to complete ride")
    }
  }

  // Cancel ride with accurate transaction handling
  async cancelRide(rideId: string, cancelledBy: string, cancellationReason = "No reason provided") {
    try {
      const { data, error } = await this.supabase.rpc("cancel_ride_with_accurate_transactions", {
        p_ride_id: rideId,
        p_cancelled_by: cancelledBy,
        p_cancellation_reason: cancellationReason,
      })

      if (error) {
        throw new Error(`Failed to cancel ride: ${error.message}`)
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to cancel ride")
      }

      return {
        success: true,
        rideId: data.ride_id,
        cancelledBy: data.cancelled_by,
        cancelledByType: data.cancelled_by_type,
        cancellationFee: data.cancellation_fee,
        cancellationTransactionId: data.cancellation_transaction_id,
        cancelledAt: data.cancelled_at,
        message: data.message,
      }
    } catch (error: any) {
      console.error("Error cancelling ride:", error)
      throw new Error(error.message || "Failed to cancel ride")
    }
  }

  // Helper methods
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount)
  }

  private getDisplayDescription(transaction: any): string {
    const baseDescription = transaction.description || "Transaction"

    if (transaction.ride_details) {
      return `${baseDescription} - ${transaction.ride_details}`
    }

    return baseDescription
  }

  private getCategoryIcon(transactionType: string): string {
    const iconMap: Record<string, string> = {
      ride_payment: "🚗",
      ride_earnings: "💰",
      wallet_topup: "⬆️",
      wallet_withdrawal: "⬇️",
      cancellation_fee: "❌",
      general: "💳",
    }

    return iconMap[transactionType] || "💳"
  }

  private getCategoryColor(type: string): string {
    return type === "credit" ? "text-green-600" : "text-red-600"
  }

  private getDateRange(period: string) {
    const now = new Date()
    const start = new Date()

    switch (period) {
      case "today":
        start.setHours(0, 0, 0, 0)
        break
      case "week":
        start.setDate(now.getDate() - 7)
        break
      case "month":
        start.setMonth(now.getMonth() - 1)
        break
      case "year":
        start.setFullYear(now.getFullYear() - 1)
        break
      default:
        start.setMonth(now.getMonth() - 1)
    }

    return { start, end: now }
  }
}

// Export singleton instance
export const transactionManager = new TransactionManager()

// Export individual functions for backward compatibility
export const getTransactionHistory = (userId: string, options?: any) =>
  transactionManager.getTransactionHistory(userId, options)

export const getTransactionSummary = (userId: string, period?: any) =>
  transactionManager.getTransactionSummary(userId, period)

export const getWalletBalance = (userId: string) => transactionManager.getWalletBalance(userId)

export const addFundsWithTransaction = (
  userId: string,
  amount: number,
  paymentMethod?: string,
  paymentReference?: string,
) => transactionManager.addFunds(userId, amount, paymentMethod, paymentReference)

export const withdrawFundsWithTransaction = (
  userId: string,
  amount: number,
  withdrawalMethod?: string,
  accountReference?: string,
) => transactionManager.withdrawFunds(userId, amount, withdrawalMethod, accountReference)

export const completeRideWithTransactions = (rideId: string, driverId: string) =>
  transactionManager.completeRide(rideId, driverId)

export const cancelRideWithTransactions = (rideId: string, cancelledBy: string, cancellationReason?: string) =>
  transactionManager.cancelRide(rideId, cancelledBy, cancellationReason)
