"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { addFundsToWallet, withdrawFunds, getUserPaymentCards } from "@/lib/api"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { Loader2, AlertCircle, CreditCard, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import CardManagement from "./card-management"

interface WalletSystemProps {
  user: any
  onUpdate?: () => void
}

export default function WalletSystem({ user, onUpdate }: WalletSystemProps) {
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasCards, setHasCards] = useState(false)
  const [checkingCards, setCheckingCards] = useState(true)

  const isDriver = user?.userType === "driver" || user?.user_type === "driver"
  const isParent = user?.userType === "parent" || user?.user_type === "parent"

  useEffect(() => {
    checkUserCards()
  }, [])

  const checkUserCards = async () => {
    try {
      setCheckingCards(true)
      const cards = await getUserPaymentCards()
      setHasCards(cards.length > 0)
    } catch (error) {
      console.error("Error checking cards:", error)
      setHasCards(false)
    } finally {
      setCheckingCards(false)
    }
  }

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasCards) {
      setError("Please add a payment card before adding funds.")
      return
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (Number(amount) < 10) {
      setError("Minimum amount is R10")
      return
    }

    if (Number(amount) > 10000) {
      setError("Maximum amount is R10,000 per transaction")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await addFundsToWallet(Number(amount))
      setSuccess(`R${Number(amount).toFixed(2)} has been successfully added to your wallet`)
      setAmount("")
      if (onUpdate) onUpdate()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message || "Failed to add funds")
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasCards) {
      setError("Please add a payment card before withdrawing funds.")
      return
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (Number(amount) > (user?.wallet?.balance || 0)) {
      setError("Insufficient funds in your wallet")
      return
    }

    if (Number(amount) < 50) {
      setError("Minimum withdrawal amount is R50")
      return
    }

    if (Number(amount) > 5000) {
      setError("Maximum withdrawal amount is R5,000 per transaction")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await withdrawFunds(Number(amount))
      setSuccess(`R${Number(amount).toFixed(2)} will be transferred to your bank account within 1-3 business days`)
      setAmount("")
      if (onUpdate) onUpdate()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message || "Failed to withdraw funds")
    } finally {
      setLoading(false)
    }
  }

  const handleCardAdded = () => {
    setHasCards(true)
    setError(null)
  }

  if (checkingCards) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <p className="text-4xl font-bold text-primary mb-2">{formatCurrency(user?.wallet?.balance || 0)}</p>
            <p className="text-sm text-gray-500">Available Balance</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Tabs for different user types */}
          <Tabs defaultValue={isParent ? "add" : "withdraw"} className="w-full">
            <TabsList className={`grid w-full ${isDriver ? "grid-cols-1" : "grid-cols-1"}`}>
              {isParent && <TabsTrigger value="add">Add Funds</TabsTrigger>}
              {isDriver && <TabsTrigger value="withdraw">Withdraw</TabsTrigger>}
            </TabsList>

            {/* Add Funds Tab - Only for parents */}
            {isParent && (
              <TabsContent value="add" className="mt-4">
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpCircle className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900">Add Funds to Wallet</h3>
                  </div>
                  <p className="text-sm text-blue-700">
                    Add funds to pay for your child's rides. Funds are deducted automatically when rides are completed.
                  </p>
                </div>

                {!hasCards ? (
                  <div className="text-center py-6">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Please add a payment card before adding funds.</p>
                    <p className="text-sm text-gray-500 mb-4">
                      You need to add a payment card before you can add funds to your wallet.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleAddFunds}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-amount">Amount (R)</Label>
                        <Input
                          id="add-amount"
                          type="number"
                          min="10"
                          max="10000"
                          step="10"
                          placeholder="100 (min R10, max R10,000)"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                        />
                        <p className="text-xs text-gray-500">Minimum: R10 | Maximum: R10,000 per transaction</p>
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Add R{amount || "0"} to Wallet
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
            )}

            {/* Withdraw Tab - Only for drivers */}
            {isDriver && (
              <TabsContent value="withdraw" className="mt-4">
                <div className="mb-4 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-green-900">Withdraw Earnings</h3>
                  </div>
                  <p className="text-sm text-green-700">
                    Withdraw your earnings to your bank account. Funds will be transferred within 1-3 business days.
                  </p>
                </div>

                {!hasCards ? (
                  <div className="text-center py-6">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Please add a payment card before withdrawing funds.</p>
                    <p className="text-sm text-gray-500 mb-4">
                      You need to add a payment card before you can withdraw funds from your wallet.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleWithdraw}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="withdraw-amount">Amount (R)</Label>
                        <Input
                          id="withdraw-amount"
                          type="number"
                          min="50"
                          max="5000"
                          step="10"
                          placeholder="100 (min R50, max R5,000)"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                        />
                        <p className="text-xs text-gray-500">
                          Available: {formatCurrency(user?.wallet?.balance || 0)} | Minimum: R50 | Maximum: R5,000 per
                          transaction
                        </p>
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Withdraw R{amount || "0"}
                          </>
                        )}
                      </Button>

                      <div className="text-xs text-gray-500 space-y-1">
                        <p>• Funds will be transferred to your linked bank account</p>
                        <p>• Processing time: 1-3 business days</p>
                        <p>• No withdrawal fees apply</p>
                      </div>
                    </div>
                  </form>
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {user?.wallet?.transactions?.length > 0 ? (
            <div className="space-y-3">
              {user.wallet.transactions.slice(0, 5).map((transaction: any) => (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        transaction.type === "credit" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      }`}
                    >
                      {transaction.type === "credit" ? (
                        <ArrowUpCircle className="h-4 w-4" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(transaction.date)}</p>
                    </div>
                  </div>
                  <p className={`font-medium ${transaction.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                    {transaction.type === "credit" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent transactions</p>
              <p className="text-sm text-gray-400 mt-1">
                {isParent ? "Add funds to start using the service" : "Complete rides to earn and withdraw funds"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Management Section */}
      <CardManagement userType={isDriver ? "driver" : "parent"} onCardAdded={handleCardAdded} />
    </div>
  )
}
