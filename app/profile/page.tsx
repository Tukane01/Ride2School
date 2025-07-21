"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUserProfile, updateUserProfile, updateChildDetails, updateCarDetails } from "@/lib/api"
import ParentNavbar from "@/components/parent-navbar"
import DriverNavbar from "@/components/driver-navbar"
import { Loader2, AlertCircle, Save, Upload, User, Car, GraduationCap } from "lucide-react"
import { DeleteAccountDialog } from "@/components/delete-account-dialog"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("personal")
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [personalForm, setPersonalForm] = useState({
    name: "",
    surname: "",
    email: "",
    phoneNumber: "",
    idNumber: "",
    address: "",
    gender: "",
  })

  const [childForm, setChildForm] = useState({
    name: "",
    surname: "",
    idNumber: "",
    schoolName: "",
    schoolAddress: "",
  })

  const [carForm, setCarForm] = useState({
    make: "",
    model: "",
    color: "",
    registration: "",
    vinNumber: "",
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        const userData = await getUserProfile()
        setUser(userData)

        // Populate personal form
        setPersonalForm({
          name: userData.name || "",
          surname: userData.surname || "",
          email: userData.email || "",
          phoneNumber: userData.phoneNumber || "",
          idNumber: userData.idNumber || "",
          address: userData.address || "",
          gender: userData.gender || "",
        })

        // Populate child form if user is parent
        if (userData.child) {
          setChildForm({
            name: userData.child.name || "",
            surname: userData.child.surname || "",
            idNumber: userData.child.idNumber || "",
            schoolName: userData.child.school?.name || "",
            schoolAddress: userData.child.school?.address || "",
          })
        }

        // Populate car form if user is driver
        if (userData.car) {
          setCarForm({
            make: userData.car.make || "",
            model: userData.car.model || "",
            color: userData.car.color || "",
            registration: userData.car.registration || "",
            vinNumber: userData.car.vinNumber || "",
          })
        }
      } catch (err: any) {
        setError(err.message || "Failed to load profile data")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Add this useEffect after the existing one
  useEffect(() => {
    // Test if delete function exists
    const testDeleteFunction = async () => {
      try {
        const response = await fetch("/api/test-delete-function")
        const result = await response.json()
        console.log("Delete function test:", result)
      } catch (error) {
        console.error("Delete function test failed:", error)
      }
    }

    testDeleteFunction()
  }, [])

  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPersonalForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleChildChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setChildForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCarChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCarForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setProfileImage(file)
      setProfileImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await updateUserProfile({
        name: personalForm.name,
        surname: personalForm.surname,
        phoneNumber: personalForm.phoneNumber,
        address: personalForm.address,
        // Note: email and ID number cannot be changed after registration
      })

      // Handle profile image upload if selected
      if (profileImage) {
        // In a real app, you would upload the image to storage and update the profile
        console.log("Profile image would be uploaded here")
      }

      setSuccess("Personal information updated successfully")
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveChild = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await updateChildDetails({
        name: childForm.name,
        surname: childForm.surname,
        idNumber: childForm.idNumber,
        schoolName: childForm.schoolName,
        schoolAddress: childForm.schoolAddress,
      })

      setSuccess("Child information updated successfully")
    } catch (err: any) {
      setError(err.message || "Failed to update child information")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await updateCarDetails({
        make: carForm.make,
        model: carForm.model,
        color: carForm.color,
        registration: carForm.registration,
        vinNumber: carForm.vinNumber,
      })

      setSuccess("Vehicle information updated successfully")
    } catch (err: any) {
      setError(err.message || "Failed to update vehicle information")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user?.userType === "parent" ? <ParentNavbar user={user} /> : <DriverNavbar user={user} />}

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Profile Settings</CardTitle>
            <CardDescription>Manage your account information and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
              <div className="flex flex-col items-center">
                <Avatar className="h-32 w-32 mb-4">
                  <AvatarImage
                    src={profileImagePreview || user?.profilePic || "/placeholder.svg?height=128&width=128"}
                    alt={user?.name}
                  />
                  <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center">
                  <Label htmlFor="profile-image" className="cursor-pointer bg-primary text-white px-4 py-2 rounded-md">
                    <Upload className="h-4 w-4 mr-2 inline-block" />
                    Change Photo
                  </Label>
                  <Input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                </div>
              </div>

              <div className="flex-1 w-full">
                <Tabs defaultValue="personal" onValueChange={setActiveTab} value={activeTab}>
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
                    <TabsTrigger value="personal">
                      <User className="h-4 w-4 mr-2" />
                      Personal Info
                    </TabsTrigger>
                    {user?.userType === "parent" && (
                      <TabsTrigger value="child">
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Child Info
                      </TabsTrigger>
                    )}
                    {user?.userType === "driver" && (
                      <TabsTrigger value="car">
                        <Car className="h-4 w-4 mr-2" />
                        Vehicle Info
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="mt-4 bg-green-50 border-green-200">
                      <AlertTitle className="text-green-800">Success</AlertTitle>
                      <AlertDescription className="text-green-700">{success}</AlertDescription>
                    </Alert>
                  )}

                  <TabsContent value="personal" className="mt-4">
                    <form onSubmit={handleSavePersonal}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">First Name</Label>
                          <Input
                            id="name"
                            name="name"
                            value={personalForm.name}
                            onChange={handlePersonalChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="surname">Surname</Label>
                          <Input
                            id="surname"
                            name="surname"
                            value={personalForm.surname}
                            onChange={handlePersonalChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" value={personalForm.email} disabled className="bg-gray-100" />
                          <p className="text-xs text-gray-500">Email cannot be changed</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phoneNumber">Phone Number</Label>
                          <Input
                            id="phoneNumber"
                            name="phoneNumber"
                            value={personalForm.phoneNumber}
                            onChange={handlePersonalChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="idNumber">ID Number</Label>
                          <Input
                            id="idNumber"
                            name="idNumber"
                            value={personalForm.idNumber}
                            disabled
                            className="bg-gray-100"
                          />
                          <p className="text-xs text-gray-500">ID number cannot be changed</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gender">Gender</Label>
                          <select
                            id="gender"
                            name="gender"
                            value={personalForm.gender}
                            onChange={handlePersonalChange}
                            className="w-full p-2 border rounded-md"
                            required
                          >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="address">Address</Label>
                          <Textarea
                            id="address"
                            name="address"
                            value={personalForm.address}
                            onChange={handlePersonalChange}
                            rows={3}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full md:w-auto" disabled={saving}>
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
                  </TabsContent>

                  {user?.userType === "parent" && (
                    <TabsContent value="child" className="mt-4">
                      <form onSubmit={handleSaveChild}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label htmlFor="childName">Child's First Name</Label>
                            <Input
                              id="childName"
                              name="name"
                              value={childForm.name}
                              onChange={handleChildChange}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="childSurname">Child's Surname</Label>
                            <Input
                              id="childSurname"
                              name="surname"
                              value={childForm.surname}
                              onChange={handleChildChange}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="childIdNumber">Child's ID Number</Label>
                            <Input
                              id="childIdNumber"
                              name="idNumber"
                              value={childForm.idNumber}
                              onChange={handleChildChange}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="schoolName">School Name</Label>
                            <Input
                              id="schoolName"
                              name="schoolName"
                              value={childForm.schoolName}
                              onChange={handleChildChange}
                              required
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="schoolAddress">School Address</Label>
                            <Textarea
                              id="schoolAddress"
                              name="schoolAddress"
                              value={childForm.schoolAddress}
                              onChange={handleChildChange}
                              rows={3}
                              required
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full md:w-auto" disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Child Information
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  )}

                  {user?.userType === "driver" && (
                    <TabsContent value="car" className="mt-4">
                      <form onSubmit={handleSaveCar}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label htmlFor="carMake">Car Make</Label>
                            <Input id="carMake" name="make" value={carForm.make} onChange={handleCarChange} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="carModel">Car Model</Label>
                            <Input
                              id="carModel"
                              name="model"
                              value={carForm.model}
                              onChange={handleCarChange}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="carColor">Car Color</Label>
                            <Input
                              id="carColor"
                              name="color"
                              value={carForm.color}
                              onChange={handleCarChange}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="carRegistration">Registration Number</Label>
                            <Input
                              id="carRegistration"
                              name="registration"
                              value={carForm.registration}
                              onChange={handleCarChange}
                              required
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="carVinNumber">VIN Number</Label>
                            <Input
                              id="carVinNumber"
                              name="vinNumber"
                              value={carForm.vinNumber}
                              onChange={handleCarChange}
                              required
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full md:w-auto" disabled={saving}>
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
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Account
              </Button>
            </div>
            <Button onClick={() => router.push("/")}>Back to Dashboard</Button>

            <DeleteAccountDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} />
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
