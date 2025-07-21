"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Send, AlertCircle, RefreshCw, MessageCircle } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { sendMessage, getMessages } from "@/lib/api"
import { formatTime } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getBrowserClient } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

interface MessageSystemProps {
  recipientId: string
  recipientName: string
  recipientType: "parent" | "driver"
  rideId?: string
}

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  created_at: string
  ride_id?: string
  is_auto_notification?: boolean
}

export function MessageSystem({ recipientId, recipientName, recipientType, rideId }: MessageSystemProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUser = getCurrentUser()
  const channelRef = useRef<any>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  // Send auto notification message
  const sendAutoNotification = useCallback(
    async (notificationMessage: string) => {
      try {
        const supabase = getBrowserClient()

        // Insert auto notification message
        const { data, error } = await supabase
          .from("messages")
          .insert({
            sender_id: "system", // Use system as sender
            recipient_id: recipientId,
            content: notificationMessage,
            ride_id: rideId,
            is_auto_notification: true,
          })
          .select()
          .single()

        if (!error && data) {
          setMessages((prevMessages) => {
            const messageExists = prevMessages.some((msg) => msg.id === data.id)
            if (messageExists) return prevMessages

            const newMessages = [...prevMessages, data as Message]
            return newMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          })
        }
      } catch (error) {
        console.error("Error sending auto notification:", error)
      }
    },
    [recipientId, rideId],
  )

  // Listen for ride status changes and send auto notifications
  useEffect(() => {
    if (!rideId || !currentUser) return

    const supabase = getBrowserClient()

    // Listen for ride status changes
    const rideChannel = supabase
      .channel(`ride-status-${rideId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          const newRide = payload.new
          const oldRide = payload.old

          // Check if status changed
          if (newRide.status !== oldRide.status) {
            let notificationMessage = ""

            switch (newRide.status) {
              case "in_progress":
                if (currentUser.userType === "parent") {
                  notificationMessage = "🚗 Your ride has started! The driver is on the way to pick up your child."
                } else {
                  notificationMessage = "✅ Ride confirmed started. Please proceed to pickup location."
                }
                break
              case "completed":
                if (currentUser.userType === "parent") {
                  notificationMessage = "✅ Ride completed successfully! Your child has been safely delivered."
                } else {
                  notificationMessage = "✅ Ride completed. Payment has been processed to your wallet."
                }
                break
            }

            if (notificationMessage) {
              sendAutoNotification(notificationMessage)
            }
          }
        },
      )
      .subscribe()

    // Listen for ride cancellations
    const cancellationChannel = supabase
      .channel(`ride-cancellation-${rideId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cancelled_rides",
          filter: `original_ride_id=eq.${rideId}`,
        },
        (payload) => {
          const cancelledRide = payload.new
          let notificationMessage = ""

          if (cancelledRide.cancelled_by === currentUser.id) {
            // User cancelled themselves
            notificationMessage = "❌ You have successfully cancelled this ride."
            if (cancelledRide.fine_applied && cancelledRide.cancellation_fine > 0) {
              notificationMessage += ` A cancellation fine of R${cancelledRide.cancellation_fine} has been applied to your account.`
            }
          } else {
            // Other party cancelled
            const cancellerType = currentUser.userType === "parent" ? "driver" : "parent"
            notificationMessage = `❌ This ride has been cancelled by the ${cancellerType}.`

            if (cancelledRide.cancellation_reason) {
              notificationMessage += ` Reason: ${cancelledRide.cancellation_reason}`
            }
          }

          if (notificationMessage) {
            sendAutoNotification(notificationMessage)
          }
        },
      )
      .subscribe()

    // Listen for ride acceptance
    const acceptanceChannel = supabase
      .channel(`ride-acceptance-${rideId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rides",
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          const newRide = payload.new

          if (currentUser.userType === "parent") {
            sendAutoNotification("🎉 Great news! A driver has accepted your ride request and will be there soon.")
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(rideChannel)
      supabase.removeChannel(cancellationChannel)
      supabase.removeChannel(acceptanceChannel)
    }
  }, [rideId, currentUser, sendAutoNotification])

  // Fetch messages with retry logic
  const fetchMessages = useCallback(
    async (showLoading = true) => {
      if (!currentUser || !recipientId) return

      if (showLoading) setLoading(true)
      setError(null)

      try {
        const fetchedMessages = await getMessages(recipientId, rideId)
        setMessages(fetchedMessages || [])
        setRetryCount(0) // Reset retry count on success
      } catch (err: any) {
        console.error("Error fetching messages:", err)
        setError("Failed to load messages. Please try again.")

        // Retry logic
        if (retryCount < maxRetries) {
          setRetryCount((prev) => prev + 1)
          retryTimeoutRef.current = setTimeout(() => {
            fetchMessages(false)
          }, Math.pow(2, retryCount) * 1000) // Exponential backoff
        }
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [currentUser, recipientId, rideId, retryCount, maxRetries],
  )

  // Set up real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!currentUser?.id || connectionStatus === "connecting") return

    const supabase = getBrowserClient()
    setConnectionStatus("connecting")

    try {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      // Create new channel with unique name
      const channelName = `messages-${currentUser.id}-${recipientId}-${Date.now()}`

      channelRef.current = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `recipient_id=eq.${currentUser.id}`,
          },
          (payload) => {
            console.log("New message received:", payload)

            // Only add message if it's from the current conversation or is auto notification
            if (payload.new.sender_id === recipientId || payload.new.is_auto_notification) {
              setMessages((prevMessages) => {
                // Check if message already exists to prevent duplicates
                const messageExists = prevMessages.some((msg) => msg.id === payload.new.id)
                if (messageExists) return prevMessages

                const newMessages = [...prevMessages, payload.new as Message]
                // Sort by created_at to maintain order
                return newMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              })

              // Show toast notification for regular messages (not auto notifications)
              if (!payload.new.is_auto_notification) {
                toast({
                  title: "New Message",
                  description: `${recipientName} sent you a message`,
                  duration: 3000,
                })
              }
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `sender_id=eq.${currentUser.id}`,
          },
          (payload) => {
            console.log("Message sent confirmation:", payload)

            // Add sent message to local state if not already there
            if (payload.new.recipient_id === recipientId) {
              setMessages((prevMessages) => {
                const messageExists = prevMessages.some((msg) => msg.id === payload.new.id)
                if (messageExists) return prevMessages

                const newMessages = [...prevMessages, payload.new as Message]
                return newMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              })
            }
          },
        )
        .subscribe((status) => {
          console.log("Subscription status:", status)

          if (status === "SUBSCRIBED") {
            setConnectionStatus("connected")
            setError(null)
          } else if (status === "CHANNEL_ERROR") {
            setConnectionStatus("disconnected")
            setError("Connection lost. Trying to reconnect...")

            // Retry connection after delay
            setTimeout(() => {
              setupRealtimeSubscription()
            }, 5000)
          }
        })
    } catch (err) {
      console.error("Error setting up real-time subscription:", err)
      setConnectionStatus("disconnected")
      setError("Failed to connect to real-time updates")
    }
  }, [currentUser, recipientId, recipientName, connectionStatus])

  // Initialize component
  useEffect(() => {
    fetchMessages()
    setupRealtimeSubscription()

    return () => {
      // Cleanup
      if (channelRef.current) {
        const supabase = getBrowserClient()
        supabase.removeChannel(channelRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [fetchMessages, setupRealtimeSubscription])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !currentUser || sending) return

    const messageContent = newMessage.trim()
    setNewMessage("") // Clear input immediately for better UX
    setSending(true)
    setError(null)

    try {
      // Validate recipient ID
      if (!recipientId || recipientId === currentUser.id) {
        throw new Error("Invalid recipient")
      }

      const sentMessage = await sendMessage({
        recipientId,
        content: messageContent,
        rideId,
      })

      if (sentMessage) {
        // Add message to local state immediately
        setMessages((prevMessages) => {
          const messageExists = prevMessages.some((msg) => msg.id === sentMessage.id)
          if (messageExists) return prevMessages

          const newMessages = [...prevMessages, sentMessage]
          return newMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        })

        // Show success feedback
        toast({
          title: "Message Sent",
          description: "Your message has been delivered successfully.",
          duration: 2000,
        })
      }
    } catch (err: any) {
      console.error("Error sending message:", err)

      // Provide specific error messages
      let errorMessage = "Failed to send message. Please try again."

      if (err.message.includes("Invalid recipient")) {
        errorMessage = "Cannot send message to invalid recipient."
      } else if (err.message.includes("not authenticated")) {
        errorMessage = "You must be logged in to send messages."
      } else if (err.message.includes("network")) {
        errorMessage = "Network error. Please check your connection."
      }

      setError(errorMessage)
      setNewMessage(messageContent) // Restore message content on error

      toast({
        title: "Message Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setSending(false)
    }
  }

  // Handle retry
  const handleRetry = () => {
    setRetryCount(0)
    fetchMessages()
    setupRealtimeSubscription()
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as any)
    }
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src="/placeholder.svg?height=32&width=32" alt={recipientName} />
              <AvatarFallback>{recipientName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span>{recipientName}</span>
              <span className="text-xs text-gray-500 font-normal">
                {recipientType === "parent" ? "Parent" : "Driver"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection status indicator */}
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              title={`Connection: ${connectionStatus}`}
            />

            {error && (
              <Button variant="ghost" size="sm" onClick={handleRetry} title="Retry connection">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto mb-4 p-3 bg-gray-50 rounded-md min-h-[300px] max-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Loading messages...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <MessageCircle className="h-12 w-12" />
                <span className="text-sm">No messages yet</span>
                <span className="text-xs">Start the conversation!</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.is_auto_notification
                      ? "justify-center"
                      : message.sender_id === currentUser?.id
                        ? "justify-end"
                        : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      message.is_auto_notification
                        ? "bg-blue-100 text-blue-800 text-center text-sm border border-blue-200"
                        : message.sender_id === currentUser?.id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{message.content}</p>
                    {!message.is_auto_notification && (
                      <p
                        className={`text-xs mt-1 ${
                          message.sender_id === currentUser?.id ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message input */}
        <form onSubmit={handleSendMessage} className="flex space-x-2 flex-shrink-0">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={sending || connectionStatus === "disconnected"}
            className="flex-1"
            maxLength={1000}
          />
          <Button
            type="submit"
            disabled={sending || !newMessage.trim() || connectionStatus === "disconnected"}
            className="px-3"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {/* Character count */}
        {newMessage.length > 800 && (
          <div className="text-xs text-gray-500 mt-1 text-right">{newMessage.length}/1000</div>
        )}
      </CardContent>
    </Card>
  )
}

export default MessageSystem
