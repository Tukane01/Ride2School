import { getBrowserClient } from "./supabase"

export class DriverTransactionManager {
  private supabase = getBrowserClient()

  // Get comprehensive driver transactions including all types
  async getDriverTransactions(
    driverId: string,
    options: {
      limit?: number
      offset?: number
      timeRange?: "today" | "week" | "month" | "year" | "custom"
      customRange?: { from: Date; to: Date }
    } = {},
  ) {
    const { limit = 50, offset = 0, timeRange = "month", customRange } = options

    // Calculate date range
    const { startDate, endDate } = this.getDateRange(timeRange, customRange)

    try {
      // Get all transactions for the driver
      const { data: transactions, error } = await this.supabase
        .from("transactions")
        .select("*")
        .eq("user_id", driverId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`)
      }

      // Categorize and enhance transactions with accurate money flow
      const enhancedTransactions = transactions.map((transaction) => {
        const category = this.categorizeTransaction(transaction)
        const isMoneyIn = this.isMoneyIn(transaction)
        const isMoneyOut = this.isMoneyOut(transaction)

        return {
          ...transaction,
          category,
          displayDescription: this.enhanceDescription(transaction),
          formattedAmount: this.formatCurrency(Math.abs(transaction.amount)),
          categoryColor: isMoneyIn ? "text-green-600" : "text-red-600",
          flowDirection: isMoneyIn ? "in" : "out",
          flowLabel: isMoneyIn ? "Money In" : "Money Out",
          isPenalty: this.isPenaltyTransaction(transaction),
          isEarning: this.isEarningTransaction(transaction),
          isWalletOperation: this.isWalletOperation(transaction),
          transactionIcon: this.getTransactionIcon(transaction),
          detailedCategory: this.getDetailedCategory(transaction),
        }
      })

      // Get total count for pagination
      const { count, error: countError } = await this.supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", driverId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)

      if (countError) {
        console.warn("Failed to get transaction count:", countError)
      }

      return {
        transactions: enhancedTransactions,
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit,
      }
    } catch (error: any) {
      console.error("Error fetching driver transactions:", error)
      throw new Error(error.message || "Failed to fetch driver transactions")
    }
  }

  // Enhanced helper methods for accurate transaction categorization
  private isMoneyIn(transaction: any): boolean {
    // Money coming into the wallet
    return (
      transaction.type === "credit" ||
      (transaction.amount > 0 &&
        (transaction.description.toLowerCase().includes("ride completed") ||
          transaction.description.toLowerCase().includes("earnings") ||
          transaction.description.toLowerCase().includes("bonus") ||
          transaction.description.toLowerCase().includes("refund") ||
          transaction.description.toLowerCase().includes("added") ||
          transaction.description.toLowerCase().includes("deposit") ||
          transaction.description.toLowerCase().includes("topup") ||
          transaction.description.toLowerCase().includes("top-up")))
    )
  }

  private isMoneyOut(transaction: any): boolean {
    // Money going out of the wallet
    return (
      transaction.type === "debit" ||
      transaction.amount < 0 ||
      transaction.description.toLowerCase().includes("withdrawal") ||
      transaction.description.toLowerCase().includes("fine") ||
      transaction.description.toLowerCase().includes("penalty") ||
      transaction.description.toLowerCase().includes("cancellation") ||
      transaction.description.toLowerCase().includes("fee") ||
      transaction.description.toLowerCase().includes("charge")
    )
  }

  private isWalletOperation(transaction: any): boolean {
    const description = transaction.description.toLowerCase()
    return (
      description.includes("withdrawal") ||
      description.includes("added") ||
      description.includes("deposit") ||
      description.includes("topup") ||
      description.includes("top-up")
    )
  }

  private getTransactionIcon(transaction: any): string {
    const description = transaction.description.toLowerCase()

    if (description.includes("ride completed") || description.includes("ride earnings")) {
      return "car"
    }
    if (description.includes("cancellation")) {
      return "alert-circle"
    }
    if (description.includes("fine") || description.includes("penalty")) {
      return "alert-triangle"
    }
    if (description.includes("withdrawal")) {
      return "arrow-down-circle"
    }
    if (description.includes("added") || description.includes("deposit") || description.includes("topup")) {
      return "arrow-up-circle"
    }
    if (description.includes("bonus")) {
      return "gift"
    }
    if (description.includes("refund")) {
      return "rotate-ccw"
    }

    return "credit-card"
  }

  private getDetailedCategory(transaction: any): string {
    const description = transaction.description.toLowerCase()

    if (description.includes("ride completed") || description.includes("ride earnings")) {
      return "Ride Earnings"
    }
    if (description.includes("cancellation")) {
      return "Cancellation Penalty"
    }
    if (description.includes("fine") || description.includes("penalty")) {
      return "Policy Fine"
    }
    if (description.includes("withdrawal")) {
      return "Wallet Withdrawal"
    }
    if (description.includes("added") || description.includes("deposit") || description.includes("topup")) {
      return "Wallet Deposit"
    }
    if (description.includes("bonus")) {
      return "Performance Bonus"
    }
    if (description.includes("refund")) {
      return "Refund"
    }
    if (description.includes("fee")) {
      return "Service Fee"
    }

    return "Other Transaction"
  }

  // Get driver transaction summary with accurate money flow
  async getDriverTransactionSummary(
    driverId: string,
    timeRange: "today" | "week" | "month" | "year" | "custom" = "month",
    customRange?: { from: Date; to: Date },
  ) {
    const { startDate, endDate } = this.getDateRange(timeRange, customRange)

    try {
      const { data: transactions, error } = await this.supabase
        .from("transactions")
        .select("*")
        .eq("user_id", driverId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)

      if (error) {
        throw new Error(`Failed to fetch transaction summary: ${error.message}`)
      }

      let totalMoneyIn = 0
      let totalMoneyOut = 0
      let rideEarnings = 0
      let walletDeposits = 0
      let bonuses = 0
      let refunds = 0
      let cancellationFines = 0
      let policyFines = 0
      let walletWithdrawals = 0
      let serviceFees = 0

      transactions.forEach((transaction) => {
        const amount = Math.abs(transaction.amount)
        const description = transaction.description.toLowerCase()

        if (this.isMoneyIn(transaction)) {
          totalMoneyIn += amount

          if (description.includes("ride completed") || description.includes("ride earnings")) {
            rideEarnings += amount
          } else if (
            description.includes("added") ||
            description.includes("deposit") ||
            description.includes("topup")
          ) {
            walletDeposits += amount
          } else if (description.includes("bonus")) {
            bonuses += amount
          } else if (description.includes("refund")) {
            refunds += amount
          }
        } else if (this.isMoneyOut(transaction)) {
          totalMoneyOut += amount

          if (description.includes("cancellation")) {
            cancellationFines += amount
          } else if (description.includes("fine") || description.includes("penalty")) {
            policyFines += amount
          } else if (description.includes("withdrawal")) {
            walletWithdrawals += amount
          } else if (description.includes("fee")) {
            serviceFees += amount
          }
        }
      })

      return {
        totalMoneyIn,
        totalMoneyOut,
        netAmount: totalMoneyIn - totalMoneyOut,
        rideEarnings,
        walletDeposits,
        bonuses,
        refunds,
        cancellationFines,
        policyFines,
        walletWithdrawals,
        serviceFees,
        transactionCount: transactions.length,
        formattedTotals: {
          totalMoneyIn: this.formatCurrency(totalMoneyIn),
          totalMoneyOut: this.formatCurrency(totalMoneyOut),
          netAmount: this.formatCurrency(totalMoneyIn - totalMoneyOut),
          rideEarnings: this.formatCurrency(rideEarnings),
          walletDeposits: this.formatCurrency(walletDeposits),
          bonuses: this.formatCurrency(bonuses),
          refunds: this.formatCurrency(refunds),
          cancellationFines: this.formatCurrency(cancellationFines),
          policyFines: this.formatCurrency(policyFines),
          walletWithdrawals: this.formatCurrency(walletWithdrawals),
          serviceFees: this.formatCurrency(serviceFees),
        },
      }
    } catch (error: any) {
      console.error("Error fetching driver transaction summary:", error)
      throw new Error(error.message || "Failed to fetch transaction summary")
    }
  }

  // Helper methods
  private categorizeTransaction(transaction: any): string {
    const description = transaction.description.toLowerCase()

    if (description.includes("ride completed") || description.includes("ride earnings")) {
      return "ride_earnings"
    }
    if (description.includes("cancellation")) {
      return "cancellation_fee"
    }
    if (description.includes("fine") || description.includes("penalty")) {
      return "policy_fine"
    }
    if (description.includes("withdrawal")) {
      return "wallet_withdrawal"
    }
    if (description.includes("added")) {
      return "wallet_topup"
    }

    return "other"
  }

  private enhanceDescription(transaction: any): string {
    const description = transaction.description

    // Add context for different transaction types
    if (description.includes("Ride completed")) {
      return `${description} - Earnings received`
    }
    if (description.toLowerCase().includes("cancellation")) {
      return `${description} - Cancellation penalty`
    }
    if (description.toLowerCase().includes("fine") || description.toLowerCase().includes("penalty")) {
      return `${description} - Policy violation fine`
    }

    return description
  }

  private isPenaltyTransaction(transaction: any): boolean {
    const description = transaction.description.toLowerCase()
    return (
      description.includes("cancellation") ||
      description.includes("fine") ||
      description.includes("penalty") ||
      (transaction.type === "debit" && !description.includes("withdrawal"))
    )
  }

  private isEarningTransaction(transaction: any): boolean {
    const description = transaction.description.toLowerCase()
    return (
      transaction.type === "credit" && (description.includes("ride completed") || description.includes("ride earnings"))
    )
  }

  private getDateRange(
    timeRange: "today" | "week" | "month" | "year" | "custom",
    customRange?: { from: Date; to: Date },
  ) {
    const now = new Date()
    let startDate: string
    let endDate: string = now.toISOString()

    if (timeRange === "custom" && customRange) {
      startDate = customRange.from.toISOString()
      endDate = customRange.to.toISOString()
    } else {
      switch (timeRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
          break
        case "week":
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          startDate = weekStart.toISOString()
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          break
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1).toISOString()
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          break
      }
    }

    return { startDate, endDate }
  }

  private formatCurrency(amount: number): string {
    return `R${amount.toFixed(2)}`
  }
}

export const driverTransactionManager = new DriverTransactionManager()
