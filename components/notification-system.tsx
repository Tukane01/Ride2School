"use client"

import { useState, useEffect } from "react"
import { Bell, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getNotifications, markNotificationAsRead } from "@/lib/api"
import { formatDateTime } from "@/lib/utils"

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const data = await getNotifications()
      setNotifications(data)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications(
        notifications.map((notification) =>
          notification.id === id ? { ...notification, is_read: true } : notification,
        ),
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative" onClick={() => setShowNotifications(!showNotifications)}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {showNotifications && (
        <Card className="absolute right-0 mt-2 w-80 z-50 shadow-lg">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-medium">Notifications</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No notifications</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b flex items-start gap-2 ${!notification.is_read ? "bg-blue-50" : ""}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-sm text-gray-600">{notification.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(notification.created_at)}</p>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
