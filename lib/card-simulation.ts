// Simulation functions for testing card management
export const simulateHasCards = (userType: "parent" | "driver"): boolean => {
  // For testing purposes, we can simulate different scenarios
  // In production, this would be replaced with actual API calls

  // Simulate that users don't have cards initially
  const hasCards = localStorage.getItem(`${userType}_has_cards`) === "true"
  return hasCards
}

export const simulateAddCard = (userType: "parent" | "driver"): void => {
  // Simulate adding a card
  localStorage.setItem(`${userType}_has_cards`, "true")
}

export const simulateRemoveAllCards = (userType: "parent" | "driver"): void => {
  // Simulate removing all cards
  localStorage.removeItem(`${userType}_has_cards`)
}

export const simulateTransaction = (
  type: "add_funds" | "withdraw",
  amount: number,
  hasCards: boolean,
): { success: boolean; message: string } => {
  if (!hasCards) {
    if (type === "add_funds") {
      return {
        success: false,
        message: "Please add a card before adding funds.",
      }
    } else {
      return {
        success: false,
        message: "Please add a card before withdrawing funds.",
      }
    }
  }

  if (type === "add_funds") {
    return {
      success: true,
      message: "Funds have successfully added to your wallet",
    }
  } else {
    return {
      success: true,
      message: "Funds will be transferred to your account",
    }
  }
}
