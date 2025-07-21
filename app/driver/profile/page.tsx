"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUserProfile, updateUserProfile, updateCarDetails } from "@/lib/api"
import { DriverNavbar } from "@/components/driver-navbar"
import { Loader2, AlertCircle, Save, User, Car } from "lucide-react"
import { DeleteAccountDialog } from "@/components/delete-account-dialog"

export default function DriverProfile() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("personal")

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    phoneNumber: "",
    address: "",
    email: "",
    idNumber: "",
    carMake: "",
    carModel: "",
    carColor: "",
    carRegistration: "",
    carVinNumber: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const userData = await getUserProfile()
        setUser(userData)

        // Populate form data
        setFormData({
          name: userData.name || "",
          surname: userData.surname || "",
          phoneNumber: userData.phoneNumber || "",
          address: userData.address || "",
          email: userData.email || "",
          idNumber: userData.idNumber || "",
          carMake: userData.car?.make || "",
          carModel: userData.car?.model || "",
          carColor: userData.car?.color || "",
          carRegistration: userData.car?.registration || "",
          carVinNumber: userData.car?.vinNumber || "",
        })
      } catch (error: any) {
        console.error("Error fetching data:", error)
        setError(error.message || "Failed to load profile data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await updateUserProfile({
        name: formData.name,
        surname: formData.surname,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
      })

      setSuccess("Personal information updated successfully")
    } catch (error: any) {
      console.error("Error updating profile:", error)
      setError(error.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await updateCarDetails({
        make: formData.carMake,
        model: formData.carModel,
        color: formData.carColor,
        registration: formData.carRegistration,
        vinNumber: formData.carVinNumber,
      })

      setSuccess("Vehicle information updated successfully")
    } catch (error: any) {
      console.error("Error updating vehicle:", error)
      setError(error.message || "Failed to update vehicle information")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DriverNavbar user={user} />

      <main className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Driver Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={user?.profilePic || "/placeholder.svg?height=96&width=96"} alt={user?.name} />
                  <AvatarFallback>{user?.name?.charAt(0) || "D"}</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  Change Photo
                </Button>
                <div className="mt-4 text-center">
                  <p className="font-medium">
                    {user?.name} {user?.surname}
                  </p>
                  <p className="text-sm text-gray-500">Driver</p>
                  <p className="text-sm text-gray-500">ID: {user?.idNumber}</p>
                  <div className="flex items-center justify-center mt-1">
                    <span className="text-yellow-500 font-medium">{user?.rating?.toFixed(1) || "0.0"}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4 text-yellow-500 ml-1"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="flex border-b mb-4">
                  <button
                    className={`px-4 py-2 font-medium ${
                      activeTab === "personal" ? "border-b-2 border-primary text-primary" : "text-gray-500"
                    }`}
                    onClick={() => setActiveTab("personal")}
                  >
                    <User className="h-4 w-4 inline-block mr-2" />
                    Personal Information
                  </button>
                  <button
                    className={`px-4 py-2 font-medium ${
                      activeTab === "vehicle" ? "border-b-2 border-primary text-primary" : "text-gray-500"
                    }`}
                    onClick={() => setActiveTab("vehicle")}
                  >
                    <Car className="h-4 w-4 inline-block mr-2" />
                    Vehicle Information
                  </button>
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-4 bg-green-50 border-green-200">
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}

                {activeTab === "personal" && (
                  <div className="space-y-6">
                    <form onSubmit={handleSavePersonal}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">First Name</Label>
                          <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="surname">Surname</Label>
                          <Input
                            id="surname"
                            name="surname"
                            value={formData.surname}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" value={formData.email} disabled className="bg-gray-100" />
                          <p className="text-xs text-gray-500">Email cannot be changed</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="idNumber">ID Number</Label>
                          <Input
                            id="idNumber"
                            name="idNumber"
                            value={formData.idNumber}
                            disabled
                            className="bg-gray-100"
                          />
                          <p className="text-xs text-gray-500">ID number cannot be changed</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phoneNumber">Phone Number</Label>
                          <Input
                            id="phoneNumber"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full md:w-auto bg-primary hover:bg-primary/90"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </form>

                    {/* Delete Account Section */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-red-600 mb-2">Danger Zone</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Once you delete your account, there is no going back. Please be certain.
                      </p>
                      <DeleteAccountDialog userType="driver" />
                    </div>
                  </div>
                )}

                {activeTab === "vehicle" && (
                  <form onSubmit={handleSaveVehicle}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor="carMake">Car Make</Label>
                        <Input
                          id="carMake"
                          name="carMake"
                          value={formData.carMake}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carModel">Car Model</Label>
                        <Input
                          id="carModel"
                          name="carModel"
                          value={formData.carModel}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carColor">Car Color</Label>
                        <Input
                          id="carColor"
                          name="carColor"
                          value={formData.carColor}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carRegistration">Registration Number</Label>
                        <Input
                          id="carRegistration"
                          name="carRegistration"
                          value={formData.carRegistration}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="carVinNumber">VIN Number</Label>
                        <Input
                          id="carVinNumber"
                          name="carVinNumber"
                          value={formData.carVinNumber}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary/90" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Vehicle Information
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export { DriverProfile }
