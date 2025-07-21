"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getUserProfile, getDriverEarnings } from "@/lib/api"
import DriverNavbar from "@/components/driver-navbar"
import WalletSystem from "@/components/wallet-system"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { AlertCircle, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react"

export default function DriverWalletPage() {
  const [user, setUser] = useState<any>(null)
  const [earnings, setEarnings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const userData = await getUserProfile()
        const earningsData = await getDriverEarnings()
        setUser(userData)
        setEarnings(earningsData)
      } catch (error: any) {
        setError(error.message || "Failed to fetch wallet data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleRefresh = async () => {
    try {
      const userData = await getUserProfile()
      const earningsData = await getDriverEarnings()
      setUser(userData)
      setEarnings(earningsData)
    } catch (error) {
      console.error("Error refreshing data:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DriverNavbar user={user} />
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DriverNavbar user={user} />
        <main className="container mx-auto px-4 py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DriverNavbar user={user} />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Driver Wallet</h1>
          <p className="text-gray-600 mt-1">Manage your earnings and withdraw funds</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Main Wallet Section */}
          <div className="w-full">
            <WalletSystem user={user} onUpdate={handleRefresh} />
          </div>
        </div>

        {/* Transaction History */}
        <div className="mt-8">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="transactions">Transaction History</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {user?.wallet?.transactions?.length > 0 ? (
                    <div className="space-y-4">
                      {user.wallet.transactions.map((transaction: any) => (
                        <div
                          key={transaction.id}
                          className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-full ${
                                transaction.type === "credit"
                                  ? "bg-green-100 text-green-600"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {transaction.type === "credit" ? (
                                <ArrowUpCircle className="h-4 w-4" />
                              ) : (
                                <ArrowDownCircle className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <p className="text-sm text-gray-500">{formatDateTime(transaction.date)}</p>
                            </div>
                          </div>
                          <p
                            className={`font-medium text-lg ${
                              transaction.type === "credit" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {transaction.type === "credit" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No transaction history</p>
                      <p className="text-sm text-gray-400 mt-1">Complete rides to see your earnings</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
