"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getUserPaymentCards,
  addPaymentCard,
  setDefaultCard,
  deletePaymentCard,
  validateCardNumber,
} from "@/lib/api-cards"
import { CreditCard, Plus, Trash2, Star } from "lucide-react"

interface CardManagementProps {
  userType: "parent" | "driver"
  onCardAdded?: () => void
}

export default function CardManagement({ userType, onCardAdded }: CardManagementProps) {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAddCard, setShowAddCard] = useState(false)
  const [addingCard, setAddingCard] = useState(false)

  // Form state
  const [cardNumber, setCardNumber] = useState("")
  const [expiryMonth, setExpiryMonth] = useState("")
  const [expiryYear, setExpiryYear] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardholderName, setCardholderName] = useState("")
  const [bankName, setBankName] = useState("")

  const southAfricanBanks = [
    "ABSA Bank",
    "Standard Bank",
    "First National Bank (FNB)",
    "Nedbank",
    "Capitec Bank",
    "African Bank",
    "Bidvest Bank",
    "Discovery Bank",
    "TymeBank",
    "Bank Zero",
  ]

  useEffect(() => {
    loadCards()
  }, [])

  const loadCards = async () => {
    try {
      setLoading(true)
      const userCards = await getUserPaymentCards()
      setCards(userCards)
    } catch (err: any) {
      setError(err.message || "Failed to load cards")
    } finally {
      setLoading(false)
    }
  }

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setAddingCard(true)
      setError(null)

      // Validate card number
      if (!validateCardNumber(cardNumber)) {
        throw new Error("Invalid card number")
      }

      await addPaymentCard({
        cardNumber,
        expiryMonth,
        expiryYear,
        cvv,
        cardholderName,
        bankName,
      })

      setSuccess("Card added successfully!")
      setShowAddCard(false)

      // Reset form
      setCardNumber("")
      setExpiryMonth("")
      setExpiryYear("")
      setCvv("")
      setCardholderName("")
      setBankName("")

      // Reload cards
      await loadCards()

      // Notify parent component
      if (onCardAdded) {
        onCardAdded()
      }

      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to add card")
    } finally {
      setAddingCard(false)
    }
  }

  const handleSetDefault = async (cardId: string) => {
    try {
      await setDefaultCard(cardId)
      setSuccess("Default card updated!")
      await loadCards()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to set default card")
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deletePaymentCard(cardId)
      setSuccess("Card deleted successfully!")
      await loadCards()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to delete card")
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return v
    }
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setCardNumber(formatted)
  }

  if (loading) {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Payment Cards</span>
          <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Payment Card</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    maxLength={19}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryMonth">Expiry Month</Label>
                    <Select value={expiryMonth} onValueChange={setExpiryMonth} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>
                            {String(i + 1).padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiryYear">Expiry Year</Label>
                    <Select value={expiryYear} onValueChange={setExpiryYear} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() + i
                          return (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    placeholder="John Doe"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank</Label>
                  <Select value={bankName} onValueChange={setBankName} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {southAfricanBanks.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={addingCard}>
                  {addingCard ? "Adding..." : "Add Card"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {cards.length === 0 ? (
          <div className="text-center py-6">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No payment cards added</p>
            <p className="text-sm text-gray-500">
              Add a payment card to {userType === "parent" ? "fund your wallet" : "receive withdrawals"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`p-4 border rounded-lg ${
                  card.is_default ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-6 w-6 text-gray-600" />
                    <div>
                      <p className="font-medium">
                        {card.card_brand} •••• {card.last_four_digits}
                      </p>
                      <p className="text-sm text-gray-500">
                        {card.bank_name} • Expires {card.expiry_month}/{card.expiry_year}
                      </p>
                      {card.is_default && <p className="text-xs text-blue-600 font-medium">Default Card</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!card.is_default && (
                      <Button size="sm" variant="outline" onClick={() => handleSetDefault(card.id)}>
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCard(card.id)}
                      disabled={cards.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
