import { getBrowserClient } from "./supabase"

// Enhanced message sending with comprehensive error handling
export const sendMessageEnhanced = async ({
  recipientId,
  content,
  rideId,
}: {
  recipientId: string
  content: string
  rideId?: string
}) => {
  const supabase = getBrowserClient()

  // Get current user from localStorage
  const userJson = localStorage.getItem("user")

  if (!userJson) {
    throw new Error("User not authenticated")
  }

  const user = JSON.parse(userJson)

  // Comprehensive input validation
  if (!recipientId || typeof recipientId !== "string" || recipientId.trim() === "") {
    throw new Error("Invalid recipient ID")
  }

  if (recipientId === user.id) {
    throw new Error("Cannot send message to yourself")
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Message content cannot be empty")
  }

  if (content.length > 1000) {
    throw new Error("Message is too long (max 1000 characters)")
  }

  try {
    // First, verify that both users exist
    const { data: senderData, error: senderError } = await supabase
      .from("users")
      .select("id, name")
      .eq("id", user.id)
      .single()

    if (senderError || !senderData) {
      throw new Error("Sender account not found")
    }

    const { data: recipientData, error: recipientError } = await supabase
      .from("users")
      .select("id, name")
      .eq("id", recipientId)
      .single()

    if (recipientError || !recipientData) {
      throw new Error("Recipient not found")
    }

    // If rideId is provided, verify the ride exists and user has access
    if (rideId) {
      const { data: rideData, error: rideError } = await supabase
        .from("rides")
        .select("parent_id, driver_id")
        .eq("id", rideId)
        .single()

      if (rideError) {
        // Check if ride is in completed or cancelled tables
        const { data: completedRide } = await supabase
          .from("completed_rides")
          .select("parent_id, driver_id")
          .eq("original_ride_id", rideId)
          .single()

        const { data: cancelledRide } = await supabase
          .from("cancelled_rides")
          .select("parent_id, driver_id")
          .eq("original_ride_id", rideId)
          .single()

        const rideRecord = completedRide || cancelledRide

        if (!rideRecord) {
          throw new Error("Ride not found")
        }

        // Verify user has access to this ride
        if (rideRecord.parent_id !== user.id && rideRecord.driver_id !== user.id) {
          throw new Error("You don't have access to this ride")
        }
      } else if (rideData) {
        // Verify user has access to active ride
        if (rideData.parent_id !== user.id && rideData.driver_id !== user.id) {
          throw new Error("You don't have access to this ride")
        }
      }
    }

    // Insert message with retry logic
    let insertAttempts = 0
    const maxAttempts = 3
    let messageData = null

    while (insertAttempts < maxAttempts) {
      try {
        const { data, error } = await supabase
          .from("messages")
          .insert({
            sender_id: user.id,
            recipient_id: recipientId,
            content: content.trim(),
            ride_id: rideId,
            created_at: new Date().toISOString(),
            is_read: false,
            archived: false,
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        messageData = data
        break
      } catch (insertError: any) {
        insertAttempts++
        console.error(`Message insert attempt ${insertAttempts} failed:`, insertError)

        if (insertAttempts >= maxAttempts) {
          throw new Error(`Failed to send message after ${maxAttempts} attempts: ${insertError.message}`)
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * insertAttempts))
      }
    }

    if (!messageData) {
      throw new Error("Failed to send message: No data returned")
    }

    // Create notification for recipient (don't fail if this fails)
    try {
      await supabase.from("notifications").insert({
        user_id: recipientId,
        title: "New Message",
        content: `${senderData.name} sent you a message`,
        type: "message",
        created_at: new Date().toISOString(),
      })
    } catch (notificationError) {
      console.warn("Failed to create notification:", notificationError)
      // Don't fail the whole operation for notification
    }

    return messageData
  } catch (error: any) {
    console.error("Error in sendMessageEnhanced:", error)

    // Provide specific error messages based on error type
    if (error.message.includes("not found")) {
      throw new Error("User not found")
    } else if (error.message.includes("network")) {
      throw new Error("Network error. Please check your connection and try again.")
    } else if (error.message.includes("timeout")) {
      throw new Error("Request timed out. Please try again.")
    } else {
      throw new Error(error.message || "Failed to send message")
    }
  }
}

// Enhanced message retrieval with error handling
export const getMessagesEnhanced = async (otherUserId: string, rideId?: string) => {
  try {
    const supabase = getBrowserClient()

    // Get current user from localStorage
    const userJson = localStorage.getItem("user")

    if (!userJson) {
      throw new Error("User not authenticated")
    }

    const user = JSON.parse(userJson)

    // Validate inputs
    if (!user.id || !otherUserId) {
      console.error("Invalid user IDs:", { currentUserId: user.id, otherUserId })
      return []
    }

    if (user.id === otherUserId) {
      console.error("Cannot get messages with self")
      return []
    }

    // Build query with proper error handling
    let sentQuery = supabase
      .from("messages")
      .select("*")
      .eq("sender_id", user.id)
      .eq("recipient_id", otherUserId)
      .eq("archived", false)
      .order("created_at", { ascending: true })

    let receivedQuery = supabase
      .from("messages")
      .select("*")
      .eq("sender_id", otherUserId)
      .eq("recipient_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: true })

    if (rideId) {
      sentQuery = sentQuery.eq("ride_id", rideId)
      receivedQuery = receivedQuery.eq("ride_id", rideId)
    }

    const [sentMessages, receivedMessages] = await Promise.all([sentQuery, receivedQuery])

    if (sentMessages.error) {
      console.error("Error fetching sent messages:", sentMessages.error)
      throw new Error(`Failed to fetch sent messages: ${sentMessages.error.message}`)
    }

    if (receivedMessages.error) {
      console.error("Error fetching received messages:", receivedMessages.error)
      throw new Error(`Failed to fetch received messages: ${receivedMessages.error.message}`)
    }

    // Combine and sort messages by timestamp
    const allMessages = [...(sentMessages.data || []), ...(receivedMessages.data || [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

    return allMessages
  } catch (error: any) {
    console.error("Error in getMessagesEnhanced:", error)
    // Return empty array instead of throwing to prevent UI crashes
    return []
  }
}
