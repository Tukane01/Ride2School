"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import MessageSystem from "@/components/message-system"
import { getBrowserClient } from "@/lib/supabase"
import { getActiveRides } from "@/lib/api"
import { formatTime } from "@/lib/utils"

interface ParentMessagingProps {
  userId: string
}

interface ActiveConversation {
  driverId: string
  driverName: string
  driverProfilePic: string
  rideId: string
  destination: string
  unreadCount: number
  lastMessageTime?: string
}

export function ParentMessaging({ userId }: ParentMessagingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeConversations, setActiveConversations] = useState<ActiveConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ActiveConversation | null>(null)
  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  // Fetch active rides and set up conversations
  useEffect(() => {
    const fetchActiveRides = async () => {
      try {
        const rides = await getActiveRides()

        // Map rides to conversations with drivers
        const conversations = rides.map((ride) => ({
          driverId: ride.driver.id,
          driverName: ride.driver.name,
          driverProfilePic: ride.driver.profilePic,
          rideId: ride.id,
          destination: ride.destination.name || ride.destination.address,
          unreadCount: 0, // Will be updated by the subscription
          lastMessageTime: undefined,
        }))

        setActiveConversations(conversations)
      } catch (error) {
        console.error("Error fetching active rides for messaging:", error)
      }
    }

    fetchActiveRides()

    // Set up interval to refresh conversations every 2 minutes
    const interval = setInterval(fetchActiveRides, 120000)

    return () => clearInterval(interval)
  }, [userId])

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!userId || activeConversations.length === 0) return

    const supabase = getBrowserClient()

    // Create a list of driver IDs to monitor for messages
    const driverIds = activeConversations.map((conv) => conv.driverId)

    const channel = supabase
      .channel(`parent-messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          // Check if the message is from one of our active drivers
          if (driverIds.includes(payload.new.sender_id)) {
            // Update unread count for this conversation
            setActiveConversations((prev) =>
              prev.map((conv) =>
                conv.driverId === payload.new.sender_id
                  ? {
                      ...conv,
                      unreadCount: conv.unreadCount + 1,
                      lastMessageTime: payload.new.created_at,
                    }
                  : conv,
              ),
            )

            // Set the global unread flag
            setHasUnread(true)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, activeConversations])

  // Update the hasUnread flag whenever conversations change
  useEffect(() => {
    const hasAnyUnread = activeConversations.some((conv) => conv.unreadCount > 0)
    setHasUnread(hasAnyUnread)
  }, [activeConversations])

  const handleOpenConversation = (conversation: ActiveConversation) => {
    setSelectedConversation(conversation)
    setShowMessageDialog(true)
    setIsOpen(false)

    // Mark messages as read for this conversation
    setActiveConversations((prev) =>
      prev.map((conv) => (conv.driverId === conversation.driverId ? { ...conv, unreadCount: 0 } : conv)),
    )
  }

  const handleCloseDialog = () => {
    setShowMessageDialog(false)
    setSelectedConversation(null)
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <MessageSquare className="h-5 w-5" />
            {hasUnread && <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Messages</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {activeConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No active conversations</div>
          ) : (
            activeConversations.map((conversation) => (
              <DropdownMenuItem
                key={conversation.driverId}
                className="p-2 cursor-pointer"
                onClick={() => handleOpenConversation(conversation)}
              >
                <div className="flex items-center w-full">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage
                      src={conversation.driverProfilePic || "/placeholder.svg"}
                      alt={conversation.driverName}
                    />
                    <AvatarFallback>{conversation.driverName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium text-sm">{conversation.driverName}</p>
                      {conversation.unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-2 h-5 min-w-[20px] px-1 flex items-center justify-center"
                        >
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">Ride to {conversation.destination}</p>
                    {conversation.lastMessageTime && (
                      <p className="text-xs text-gray-400">{formatTime(conversation.lastMessageTime)}</p>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Message Dialog */}
      {selectedConversation && (
        <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage
                    src={selectedConversation.driverProfilePic || "/placeholder.svg"}
                    alt={selectedConversation.driverName}
                  />
                  <AvatarFallback>{selectedConversation.driverName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p>{selectedConversation.driverName}</p>
                  <p className="text-xs text-gray-500">Driver</p>
                </div>
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={handleCloseDialog}>
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <div className="mt-2">
              <MessageSystem
                recipientId={selectedConversation.driverId}
                recipientName={selectedConversation.driverName}
                recipientType="driver"
                rideId={selectedConversation.rideId}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default ParentMessaging
