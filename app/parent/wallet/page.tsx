"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ParentNavbar } from "@/components/parent-navbar"
import { getUserProfile } from "@/lib/api"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ParentDownloadHistory } from "@/components/parent-download-history"
import { Wallet, ArrowUpCircle, AlertCircle } from "lucide-react"
import WalletSystem from "@/components/wallet-system"

export default function ParentWalletPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true)
        const userData = await getUserProfile()
        setUser(userData)
      } catch (err: any) {
        setError(err.message || "Failed to fetch wallet data")
      } finally {
        setLoading(false)
      }
    }

    fetchWalletData()
  }, [])

  const handleRefresh = async () => {
    try {
      const userData = await getUserProfile()
      setUser(userData)
    } catch (error) {
      console.error("Error refreshing data:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ParentNavbar />
        <main className="container mx-auto py-6 px-4">
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
        <ParentNavbar />
        <main className="container mx-auto py-6 px-4">
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
      <ParentNavbar />
      <main className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>
          <p className="text-gray-600 mt-1">Manage your funds and payment methods for your child's rides</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Wallet Section */}
          <div className="lg:col-span-2">
            <WalletSystem user={user} onUpdate={handleRefresh} />
          </div>

          {/* Sidebar with Quick Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Balance</span>
                    <span className="font-bold text-lg">{formatCurrency(user?.wallet?.balance || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Transactions</span>
                    <span className="font-medium">{user?.wallet?.transactions?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="font-medium">
                      {formatCurrency(
                        user?.wallet?.transactions
                          ?.filter((t: any) => {
                            const transactionDate = new Date(t.date)
                            const now = new Date()
                            return (
                              transactionDate.getMonth() === now.getMonth() &&
                              transactionDate.getFullYear() === now.getFullYear()
                            )
                          })
                          ?.reduce((sum: number, t: any) => {
                            return t.type === "credit" ? sum + t.amount : sum - t.amount
                          }, 0) || 0,
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Add funds before requesting rides to ensure smooth payments</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Funds are automatically deducted when rides are completed</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Keep a minimum balance for emergency rides</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>All transactions are secure and encrypted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Download History Section */}
        <div className="mt-8">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">Transaction History</TabsTrigger>
              <TabsTrigger value="downloads">Download Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                  <CardDescription>Complete history of your wallet transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {user?.wallet?.transactions?.length > 0 ? (
                    <div className="space-y-4">
                      {user.wallet.transactions.map((tx: any) => (
                        <div
                          key={tx.id}
                          className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-full ${
                                tx.type === "credit" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                              }`}
                            >
                              {tx.type === "credit" ? (
                                <ArrowUpCircle className="h-4 w-4" />
                              ) : (
                                <ArrowUpCircle className="h-4 w-4 rotate-180" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{tx.description}</p>
                              <p className="text-sm text-gray-500">{formatDateTime(tx.date)}</p>
                            </div>
                          </div>
                          <p
                            className={`font-medium text-lg ${
                              tx.type === "credit" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {tx.type === "credit" ? "+" : "-"}
                            {formatCurrency(tx.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No transactions yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add funds to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="downloads" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ParentDownloadHistory
                  type="transactions"
                  title="Transaction History"
                  description="Download your transaction history in various formats."
                />

                <ParentDownloadHistory
                  type="rides"
                  title="Ride History"
                  description="Download your ride history in various formats."
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
