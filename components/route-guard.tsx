"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"

interface RouteGuardProps {
  children: React.ReactNode
  userType?: string | string[]
}

export default function RouteGuard({ children, userType }: RouteGuardProps) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    // Check if the user is authenticated
    const authCheck = () => {
      if (!isAuthenticated()) {
        setAuthorized(false)
        router.push("/auth/login")
        return
      }

      // If userType is specified, check if the user has the required type
      if (userType) {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
        const userTypes = Array.isArray(userType) ? userType : [userType]

        if (!userTypes.includes(currentUser.userType)) {
          setAuthorized(false)
          router.push("/")
          return
        }
      }

      setAuthorized(true)
    }

    authCheck()

    // Add event listener for changes in localStorage
    window.addEventListener("storage", authCheck)

    return () => {
      window.removeEventListener("storage", authCheck)
    }
  }, [router, userType])

  return authorized ? <>{children}</> : null
}
