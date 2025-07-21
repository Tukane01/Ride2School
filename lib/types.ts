// Type definitions for the application

export interface Location {
  lat: number
  lng: number
  address: string
  name?: string
}

export interface Child {
  id: string
  name: string
  surname: string
  idNumber?: string
  school?: {
    name: string
    address: string
  }
}

export interface Parent {
  id: string
  name: string
  phoneNumber: string
}

export interface Driver {
  id: string
  name: string
  profilePic: string
  carDetails: string
  rating: number
  phoneNumber?: string
}

export interface Ride {
  id: string
  child: Child
  parent: Parent
  driver: Driver
  origin: Location
  destination: Location
  scheduledTime: string
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  otp: string
  otp_generated_at?: string
  currentLocation: Location
  estimatedArrival: string
  completedAt?: string
  cancelledAt?: string
  cancelledBy?: string
  cancelledByName?: string
  cancelledByType?: "parent" | "driver"
  fare?: number
  isRated?: boolean
}

export interface RideRequest {
  id: string
  child: Child
  parent: Parent
  origin: Location
  destination: Location
  scheduledTime: string
  estimatedFare: number
  notes?: string
}

export interface Transaction {
  id: string
  date: string
  amount: number
  description: string
  type: "credit" | "debit"
}

export interface Wallet {
  balance: number
  transactions: Transaction[]
}

export interface Notification {
  id: string
  title: string
  content: string
  type: string
  rideId?: string
  isRead: boolean
  createdAt: string
}

export interface User {
  id: string
  name: string
  surname: string
  email: string
  phoneNumber: string
  idNumber: string
  address: string
  profilePic?: string
  userType: "parent" | "driver"
  wallet: Wallet
  notifications: Notification[]
}

export interface ParentUser extends User {
  child: {
    id: string
    name: string
    surname: string
    idNumber: string
    school: {
      name: string
      address: string
    }
  }
}

export interface DriverUser extends User {
  car: {
    make: string
    model: string
    color: string
    registration: string
    vinNumber: string
  }
  rating: number
  isOnline: boolean
}

export interface Rating {
  id: string
  rideId: string
  raterId: string
  ratedId: string
  ratedType: "parent" | "driver"
  rating: number
  comment?: string
  createdAt: string
}

export interface HelpArticle {
  id: string
  title: string
  content: string
  category: string
}
