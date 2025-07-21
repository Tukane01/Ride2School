"use client"

import { useState } from "react"
import Link from "next/link"
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
import { logoutUser } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Menu, User, LogOut, Home, CreditCard, HelpCircle, History } from "lucide-react"
import NotificationSystem from "./notification-system"
import ParentMessaging from "./parent-messaging"

interface ParentNavbarProps {
  user: any
}

export function ParentNavbar({ user }: ParentNavbarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = useRouter().pathname

  const handleLogout = async () => {
    try {
      await logoutUser()
      router.push("/auth/login?type=parent")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  return (
    <header className="bg-white border-b sticky top-0 z-30">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/parent/dashboard" className="flex items-center">
            <img src="/images/ride.png" alt="School Ride" className="h-8 mr-2" />
            <span className="font-bold text-xl text-blue-600">SchoolRide</span>
          </Link>

          <div className="flex items-center space-x-2">
            <ParentMessaging userId={user?.id} />
            <NotificationSystem />

            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profilePic || "/placeholder.svg?height=32&width=32"} alt={user?.name} />
                    <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>
                      {user?.name} {user?.surname}
                    </span>
                    <span className="text-xs text-gray-500">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/parent/dashboard")}>
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/parent/history")}>
                  <History className="mr-2 h-4 w-4" />
                  History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/parent/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/parent/wallet")}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Wallet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/parent/help")}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

// Keep the default export as well
export default ParentNavbar
