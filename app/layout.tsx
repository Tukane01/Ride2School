import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import NotificationsProvider from "@/components/notifications-provider"
import { GoogleMapsProvider } from "@/contexts/google-maps-context"
import ErrorBoundary from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "School Ride App",
  description: "Safe and reliable school transportation for your children",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <GoogleMapsProvider>
            {children}
            <Toaster />
            <NotificationsProvider />
          </GoogleMapsProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
