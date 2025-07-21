"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Send, AlertCircle, RefreshCw, MessageCircle, Phone, User } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { sendMessage, getMessages, markMessagesAsRead } from "@/lib/api"
import { formatTime } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getBrowserClient } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

interface EnhancedMessageSystemProps {
  recipientId: string
  recipientName: string
  recipientType: "parent" | "driver"
  recipientPhone?: string
  rideId?: string
  onClose?: () => void
}

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  created_at: string
  ride_id?: string
  is_read: boolean
  is_auto_notification?: boolean
}

export function EnhancedMessageSystem({
  recipientId,
  recipientName,
  recipientType,
  recipientPhone,
  rideId,
  onClose,
}: EnhancedMessageSystemProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected")
  const [unreadCount, setUnreadCount] = useState(0)
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

  // Mark messages as read when component mounts or messages change
  const markAsRead = useCallback(async () => {
    if (!currentUser?.id || !recipientId) return

    try {
      await markMessagesAsRead(recipientId)
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }, [currentUser?.id, recipientId])

  // Fetch messages with retry logic
  const fetchMessages = useCallback(
    async (showLoading = true) => {
      if (!currentUser || !recipientId) return

      if (showLoading) setLoading(true)
      setError(null)

      try {
        const fetchedMessages = await getMessages(recipientId, rideId)
        setMessages(fetchedMessages || [])
        setRetryCount(0)

        // Count unread messages from recipient
        const unread = fetchedMessages.filter((msg: Message) => msg.sender_id === recipientId && !msg.is_read).length
        setUnreadCount(unread)

        // Mark messages as read
        if (unread > 0) {
          await markAsRead()
        }
      } catch (err: any) {
        console.error("Error fetching messages:", err)
        setError("Failed to load messages. Please try again.")

        // Retry logic
        if (retryCount < maxRetries) {
          setRetryCount((prev) => prev + 1)
          retryTimeoutRef.current = setTimeout(() => {
            fetchMessages(false)
          }, Math.pow(2, retryCount) * 1000)
        }
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [currentUser, recipientId, rideId, retryCount, maxRetries, markAsRead],
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
      const channelName = `enhanced-messages-${currentUser.id}-${recipientId}-${Date.now()}`

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

            // Only add message if it's from the current conversation
            if (payload.new.sender_id === recipientId || payload.new.is_auto_notification) {
              setMessages((prevMessages) => {
                const messageExists = prevMessages.some((msg) => msg.id === payload.new.id)
                if (messageExists) return prevMessages

                const newMessages = [...prevMessages, payload.new as Message]
                return newMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              })

              // Update unread count
              if (!payload.new.is_auto_notification) {
                setUnreadCount((prev) => prev + 1)

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
    setNewMessage("")
    setSending(true)
    setError(null)

    try {
      const sentMessage = await sendMessage({
        recipientId,
        content: messageContent,
        rideId,
      })

      if (sentMessage) {
        // Message will be added via real-time subscription
        toast({
          title: "Message Sent",
          description: "Your message has been delivered",
          duration: 2000,
        })
      }
    } catch (err: any) {
      console.error("Error sending message:", err)
      setError("Failed to send message. Please try again.")
      setNewMessage(messageContent)

      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
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

  // Handle phone call
  const handlePhoneCall = () => {
    if (recipientPhone) {
      window.open(`tel:${recipientPhone}`, "_self")
    }
  }

  return (
    <Card className="w-full h-full flex flex-col max-w-2xl mx-auto">
      <CardHeader className="pb-3 flex-shrink-0 border-b">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src="/placeholder.svg?height=40&width=40" alt={recipientName} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold">{recipientName}</span>
              <span className="text-sm text-gray-500 font-normal">
                {recipientType === "parent" ? "Parent" : "Driver"}
                {recipientPhone && ` • ${recipientPhone}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection status indicator */}
            <div
              className={`w-3 h-3 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
              }`}
              title={`Connection: ${connectionStatus}`}
            />

            {/* Unread count */}
            {unreadCount > 0 && (
              <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {unreadCount}
              </div>
            )}

            {/* Phone call button */}
            {recipientPhone && (
              <Button variant="outline" size="sm" onClick={handlePhoneCall} title="Call">
                <Phone className="h-4 w-4" />
              </Button>
            )}

            {/* Retry button */}
            {error && (
              <Button variant="ghost" size="sm" onClick={handleRetry} title="Retry connection">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}

            {/* Close button */}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} title="Close chat">
                ✕
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
        <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg min-h-[400px] max-h-[500px]">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Loading messages...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <MessageCircle className="h-16 w-16" />
                <span className="text-lg font-medium">No messages yet</span>
                <span className="text-sm">Start the conversation!</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.is_auto_notification
                        ? "bg-blue-100 text-blue-800 text-center text-sm border border-blue-200"
                        : message.sender_id === currentUser?.id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-800 border border-gray-200 shadow-sm"
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{message.content}</p>
                    {!message.is_auto_notification && (
                      <div className="flex items-center justify-between mt-2">
                        <p
                          className={`text-xs ${
                            message.sender_id === currentUser?.id ? "text-blue-100" : "text-gray-500"
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </p>
                        {message.sender_id === currentUser?.id && (
                          <span className={`text-xs ${message.is_read ? "text-blue-200" : "text-blue-300"}`}>
                            {message.is_read ? "Read" : "Sent"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message input */}
        <form onSubmit={handleSendMessage} className="flex space-x-3 flex-shrink-0">
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
            className="px-4"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {/* Character count */}
        {newMessage.length > 800 && (
          <div className="text-xs text-gray-500 mt-2 text-right">{newMessage.length}/1000</div>
        )}

        {/* Connection status */}
        <div className="text-xs text-gray-500 mt-2 text-center">
          {connectionStatus === "connected" && "✓ Connected"}
          {connectionStatus === "connecting" && "⏳ Connecting..."}
          {connectionStatus === "disconnected" && "⚠️ Disconnected"}
        </div>
      </CardContent>
    </Card>
  )
}

export default EnhancedMessageSystem
