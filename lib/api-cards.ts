import { getBrowserClient } from "./supabase"

// Get user's payment cards
export const getUserPaymentCards = async () => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Get payment cards for the user
  const { data, error } = await supabase
    .from("payment_cards")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

// Add a new payment card
export const addPaymentCard = async (cardData: {
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  cardholderName: string
  bankName: string
  isDefault?: boolean
}) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Validate card number (basic validation)
  const cleanCardNumber = cardData.cardNumber.replace(/\s/g, "")
  if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
    throw new Error("Invalid card number")
  }

  // Validate expiry date
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  const expiryYear = Number.parseInt(cardData.expiryYear)
  const expiryMonth = Number.parseInt(cardData.expiryMonth)

  if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
    throw new Error("Card has expired")
  }

  // Check for duplicate cards (same last 4 digits and expiry)
  const lastFourDigits = cleanCardNumber.slice(-4)
  const { data: existingCards, error: checkError } = await supabase
    .from("payment_cards")
    .select("id")
    .eq("user_id", user.id)
    .eq("last_four_digits", lastFourDigits)
    .eq("expiry_month", expiryMonth)
    .eq("expiry_year", expiryYear)

  if (checkError) {
    throw new Error(checkError.message)
  }

  if (existingCards && existingCards.length > 0) {
    throw new Error("This card is already added to your account")
  }

  // Determine card brand
  const cardBrand = getCardBrand(cleanCardNumber)

  // If this is the first card or explicitly set as default, make it default
  const { data: userCards, error: userCardsError } = await supabase
    .from("payment_cards")
    .select("id")
    .eq("user_id", user.id)

  if (userCardsError) {
    throw new Error(userCardsError.message)
  }

  const isFirstCard = !userCards || userCards.length === 0
  const shouldBeDefault = cardData.isDefault || isFirstCard

  // If setting as default, update other cards to not be default
  if (shouldBeDefault) {
    await supabase.from("payment_cards").update({ is_default: false }).eq("user_id", user.id)
  }

  // Insert the new card
  const { data, error } = await supabase
    .from("payment_cards")
    .insert({
      user_id: user.id,
      last_four_digits: lastFourDigits,
      card_brand: cardBrand,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      cardholder_name: cardData.cardholderName,
      bank_name: cardData.bankName,
      is_default: shouldBeDefault,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// Set a card as default
export const setDefaultCard = async (cardId: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // First, set all cards to not default
  const { error: updateAllError } = await supabase
    .from("payment_cards")
    .update({ is_default: false })
    .eq("user_id", user.id)

  if (updateAllError) {
    throw new Error(updateAllError.message)
  }

  // Then set the selected card as default
  const { error: setDefaultError } = await supabase
    .from("payment_cards")
    .update({ is_default: true })
    .eq("id", cardId)
    .eq("user_id", user.id)

  if (setDefaultError) {
    throw new Error(setDefaultError.message)
  }

  return true
}

// Delete a payment card
export const deletePaymentCard = async (cardId: string) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Check if this is the only card
  const { data: userCards, error: checkError } = await supabase
    .from("payment_cards")
    .select("id, is_default")
    .eq("user_id", user.id)

  if (checkError) {
    throw new Error(checkError.message)
  }

  if (userCards && userCards.length === 1) {
    throw new Error("Cannot delete your only payment card")
  }

  // Get the card to be deleted
  const cardToDelete = userCards?.find((card) => card.id === cardId)

  // Delete the card
  const { error: deleteError } = await supabase.from("payment_cards").delete().eq("id", cardId).eq("user_id", user.id)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  // If the deleted card was default, set another card as default
  if (cardToDelete?.is_default && userCards && userCards.length > 1) {
    const remainingCards = userCards.filter((card) => card.id !== cardId)
    if (remainingCards.length > 0) {
      await setDefaultCard(remainingCards[0].id)
    }
  }

  return true
}

// Helper function to determine card brand
const getCardBrand = (cardNumber: string): string => {
  const firstDigit = cardNumber.charAt(0)
  const firstTwoDigits = cardNumber.substring(0, 2)
  const firstFourDigits = cardNumber.substring(0, 4)

  if (firstDigit === "4") {
    return "Visa"
  } else if (
    ["51", "52", "53", "54", "55"].includes(firstTwoDigits) ||
    (Number.parseInt(firstFourDigits) >= 2221 && Number.parseInt(firstFourDigits) <= 2720)
  ) {
    return "Mastercard"
  } else if (["34", "37"].includes(firstTwoDigits)) {
    return "American Express"
  } else if (firstTwoDigits === "60") {
    return "Discover"
  } else {
    return "Unknown"
  }
}

// Validate card number using Luhn algorithm
export const validateCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\s/g, "")

  if (!/^\d+$/.test(cleanNumber)) {
    return false
  }

  let sum = 0
  let isEven = false

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(cleanNumber.charAt(i))

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}
