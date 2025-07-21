"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUserProfile, updateUserProfile, updateChildDetails, addNewChild, getChildrenForParent } from "@/lib/api"
import { isAuthenticated } from "@/lib/auth"
import { ParentNavbar } from "@/components/parent-navbar"
import { useToast } from "@/components/ui/use-toast"
import { DeleteAccountDialog } from "@/components/delete-account-dialog"
import { Loader2, Plus, Save, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { validateName, validatePhoneNumber, validateSouthAfricanID, validateChildAge } from "@/lib/enhanced-validation"

export default function ParentProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    phoneNumber: "",
    address: "",
  })

  const [selectedChildIndex, setSelectedChildIndex] = useState<number | null>(null)
  const [childFormData, setChildFormData] = useState({
    id: "",
    name: "",
    surname: "",
    idNumber: "",
    schoolName: "",
    schoolAddress: "",
  })

  const [showAddChildDialog, setShowAddChildDialog] = useState(false)
  const [addChildFormData, setAddChildFormData] = useState({
    name: "",
    surname: "",
    idNumber: "",
    schoolName: "",
    schoolAddress: "",
  })
  const [addChildError, setAddChildError] = useState("")
  const [addingChild, setAddingChild] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Validation states
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
  const [validFields, setValidFields] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    // Check if user is authenticated
    if (typeof window !== "undefined") {
      if (!isAuthenticated()) {
        router.push("/auth/login")
        return
      }

      // Get user profile
      fetchUserProfile()
    }
  }, [router])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const data = await getUserProfile()
      setUserData(data)

      // Set form data
      setFormData({
        name: data.name || "",
        surname: data.surname || "",
        phoneNumber: data.phoneNumber || "",
        address: data.address || "",
      })

      // Fetch all children for the parent
      const childrenData = await getChildrenForParent()
      setChildren(childrenData)

      // If there are children, select the first one by default
      if (childrenData.length > 0) {
        setSelectedChildIndex(0)
        setChildFormData({
          id: childrenData[0].id || "",
          name: childrenData[0].name || "",
          surname: childrenData[0].surname || "",
          idNumber: childrenData[0].idNumber || "",
          schoolName: childrenData[0].school?.name || "",
          schoolAddress: childrenData[0].school?.address || "",
        })
      }
    } catch (error: any) {
      console.error("Error fetching user profile:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load profile data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const validateField = (name: string, value: string) => {
    try {
      switch (name) {
        case "name":
        case "surname":
        case "childName":
        case "childSurname":
          validateName(
            value,
            name === "name"
              ? "First Name"
              : name === "surname"
                ? "Surname"
                : name === "childName"
                  ? "Child's First Name"
                  : "Child's Surname",
          )
          break
        case "phoneNumber":
          validatePhoneNumber(value)
          break
        case "childIdNumber":
          validateSouthAfricanID(value)
          validateChildAge(value)
          break
        case "schoolName":
          if (value.trim().length < 3) {
            throw new Error("School name must be at least 3 characters long")
          }
          break
        case "schoolAddress":
        case "address":
          if (value.trim().length < 10) {
            throw new Error("Address must be at least 10 characters long")
          }
          break
      }

      setValidationErrors((prev) => ({ ...prev, [name]: "" }))
      setValidFields((prev) => ({ ...prev, [name]: true }))
      return true
    } catch (error: any) {
      setValidationErrors((prev) => ({ ...prev, [name]: error.message }))
      setValidFields((prev) => ({ ...prev, [name]: false }))
      return false
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    // Real-time input filtering
    let filteredValue = value
    if (name === "name" || name === "surname" || name === "childName" || name === "childSurname") {
      filteredValue = value.replace(/[^a-zA-Z\s]/g, "")
    } else if (name === "phoneNumber") {
      filteredValue = value.replace(/\D/g, "").slice(0, 10)
    } else if (name === "childIdNumber") {
      filteredValue = value.replace(/\D/g, "").slice(0, 13)
    }

    setFormData((prev) => ({ ...prev, [name]: filteredValue }))

    // Validate field if it has content
    if (filteredValue.trim()) {
      validateField(name, filteredValue)
    } else {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }))
      setValidFields((prev) => ({ ...prev, [name]: false }))
    }
  }

  const handleChildInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    // Real-time input filtering
    let filteredValue = value
    if (name === "name" || name === "surname") {
      filteredValue = value.replace(/[^a-zA-Z\s]/g, "")
    } else if (name === "idNumber") {
      filteredValue = value.replace(/\D/g, "").slice(0, 13)
    }

    setChildFormData((prev) => ({ ...prev, [name]: filteredValue }))

    // Validate field if it has content
    if (filteredValue.trim()) {
      validateField(
        name === "idNumber" ? "childIdNumber" : `child${name.charAt(0).toUpperCase() + name.slice(1)}`,
        filteredValue,
      )
    }
  }

  const handleAddChildInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    // Real-time input filtering
    let filteredValue = value
    if (name === "name" || name === "surname") {
      filteredValue = value.replace(/[^a-zA-Z\s]/g, "")
    } else if (name === "idNumber") {
      filteredValue = value.replace(/\D/g, "").slice(0, 13)
    }

    setAddChildFormData((prev) => ({ ...prev, [name]: filteredValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const isNameValid = validateField("name", formData.name)
    const isSurnameValid = validateField("surname", formData.surname)
    const isPhoneValid = validateField("phoneNumber", formData.phoneNumber)
    const isAddressValid = validateField("address", formData.address)

    if (!isNameValid || !isSurnameValid || !isPhoneValid || !isAddressValid) {
      toast({
        title: "Validation Error",
        description: "Please fix all validation errors before saving",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      await updateUserProfile(formData)
      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
      fetchUserProfile() // Refresh data
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all child fields
    const isNameValid = validateField("childName", childFormData.name)
    const isSurnameValid = validateField("childSurname", childFormData.surname)
    const isSchoolNameValid = validateField("schoolName", childFormData.schoolName)
    const isSchoolAddressValid = validateField("schoolAddress", childFormData.schoolAddress)

    if (!isNameValid || !isSurnameValid || !isSchoolNameValid || !isSchoolAddressValid) {
      toast({
        title: "Validation Error",
        description: "Please fix all validation errors before saving",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      await updateChildDetails(childFormData)
      toast({
        title: "Success",
        description: "Child details updated successfully",
      })
      fetchUserProfile() // Refresh data
    } catch (error: any) {
      console.error("Error updating child details:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update child details",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddChildError("")

    // Validate all add child fields
    try {
      validateName(addChildFormData.name, "Child's First Name")
      validateName(addChildFormData.surname, "Child's Surname")
      validateSouthAfricanID(addChildFormData.idNumber)
      validateChildAge(addChildFormData.idNumber)

      if (addChildFormData.schoolName.trim().length < 3) {
        throw new Error("School name must be at least 3 characters long")
      }

      if (addChildFormData.schoolAddress.trim().length < 10) {
        throw new Error("School address must be at least 10 characters long")
      }
    } catch (error: any) {
      setAddChildError(error.message)
      return
    }

    try {
      setAddingChild(true)
      await addNewChild(addChildFormData)

      toast({
        title: "Success",
        description: "Child added successfully",
      })

      // Reset form and close dialog
      setAddChildFormData({
        name: "",
        surname: "",
        idNumber: "",
        schoolName: "",
        schoolAddress: "",
      })
      setShowAddChildDialog(false)

      // Refresh data
      fetchUserProfile()
    } catch (error: any) {
      console.error("Error adding child:", error)
      setAddChildError(error.message || "Failed to add child")
    } finally {
      setAddingChild(false)
    }
  }

  const selectChild = (index: number) => {
    setSelectedChildIndex(index)
    const child = children[index]
    setChildFormData({
      id: child.id || "",
      name: child.name || "",
      surname: child.surname || "",
      idNumber: child.idNumber || "",
      schoolName: child.school?.name || "",
      schoolAddress: child.school?.address || "",
    })
  }

  const getFieldIcon = (fieldName: string) => {
    if (validFields[fieldName]) {
      return <span className="text-green-500 text-sm">✓</span>
    } else if (validationErrors[fieldName]) {
      return <span className="text-red-500 text-sm">✗</span>
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <ParentNavbar />
        <div className="container mx-auto py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-lg ml-2">Loading profile data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ParentNavbar />
      <div className="container mx-auto py-8">
        <div className="mb-8 flex items-center">
          <Avatar className="h-16 w-16 mr-4">
            <AvatarImage src={userData?.profilePic || "/placeholder.svg"} alt={userData?.name} />
            <AvatarFallback>
              {userData?.name?.charAt(0)}
              {userData?.surname?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">
              {userData?.name} {userData?.surname}
            </h1>
            <p className="text-gray-500">{userData?.email}</p>
          </div>
        </div>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Personal Information</TabsTrigger>
            <TabsTrigger value="children">Children Information</TabsTrigger>
            <TabsTrigger value="account">Account Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details here. All fields are validated in real-time.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">First Name</Label>
                      <div className="relative">
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className={
                            validationErrors.name ? "border-red-500" : validFields.name ? "border-green-500" : ""
                          }
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          {getFieldIcon("name")}
                        </div>
                      </div>
                      {validationErrors.name && <p className="text-red-500 text-sm">{validationErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="surname">Last Name</Label>
                      <div className="relative">
                        <Input
                          id="surname"
                          name="surname"
                          value={formData.surname}
                          onChange={handleInputChange}
                          required
                          className={
                            validationErrors.surname ? "border-red-500" : validFields.surname ? "border-green-500" : ""
                          }
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          {getFieldIcon("surname")}
                        </div>
                      </div>
                      {validationErrors.surname && <p className="text-red-500 text-sm">{validationErrors.surname}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <div className="relative">
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        required
                        placeholder="0712345678"
                        className={
                          validationErrors.phoneNumber
                            ? "border-red-500"
                            : validFields.phoneNumber
                              ? "border-green-500"
                              : ""
                        }
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        {getFieldIcon("phoneNumber")}
                      </div>
                    </div>
                    {validationErrors.phoneNumber && (
                      <p className="text-red-500 text-sm">{validationErrors.phoneNumber}</p>
                    )}
                    <p className="text-xs text-gray-500">Must start with 06, 07, or 08</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Home Address</Label>
                    <div className="relative">
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        className={
                          validationErrors.address ? "border-red-500" : validFields.address ? "border-green-500" : ""
                        }
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        {getFieldIcon("address")}
                      </div>
                    </div>
                    {validationErrors.address && <p className="text-red-500 text-sm">{validationErrors.address}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idNumber">ID Number</Label>
                    <Input id="idNumber" name="idNumber" value={userData?.idNumber || ""} disabled />
                    <p className="text-sm text-gray-500">ID number cannot be changed</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    disabled={saving || Object.keys(validationErrors).some((key) => validationErrors[key])}
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
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="children">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Children Information</CardTitle>
                  <CardDescription>
                    Manage your children's details here. All fields are validated in real-time.
                  </CardDescription>
                </div>
                <Dialog open={showAddChildDialog} onOpenChange={setShowAddChildDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Child
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Child</DialogTitle>
                      <DialogDescription>
                        Enter your child's details below. All fields are required and validated.
                      </DialogDescription>
                    </DialogHeader>

                    {addChildError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{addChildError}</AlertDescription>
                      </Alert>
                    )}

                    <form onSubmit={handleAddChild}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="newChildName">First Name</Label>
                            <Input
                              id="newChildName"
                              name="name"
                              value={addChildFormData.name}
                              onChange={handleAddChildInputChange}
                              required
                              placeholder="Min 3 characters, letters only"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newChildSurname">Last Name</Label>
                            <Input
                              id="newChildSurname"
                              name="surname"
                              value={addChildFormData.surname}
                              onChange={handleAddChildInputChange}
                              required
                              placeholder="Min 3 characters, letters only"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newChildIdNumber">ID Number</Label>
                          <Input
                            id="newChildIdNumber"
                            name="idNumber"
                            value={addChildFormData.idNumber}
                            onChange={handleAddChildInputChange}
                            required
                            placeholder="13 digits, age 5-18 years"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newChildSchoolName">School Name</Label>
                          <Input
                            id="newChildSchoolName"
                            name="schoolName"
                            value={addChildFormData.schoolName}
                            onChange={handleAddChildInputChange}
                            required
                            placeholder="Min 3 characters"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newChildSchoolAddress">School Address</Label>
                          <Input
                            id="newChildSchoolAddress"
                            name="schoolAddress"
                            value={addChildFormData.schoolAddress}
                            onChange={handleAddChildInputChange}
                            required
                            placeholder="Min 10 characters"
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowAddChildDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addingChild}>
                          {addingChild ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add Child"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent>
                {children.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">You haven't added any children yet.</p>
                    <Button onClick={() => setShowAddChildDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Child
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1 border-r pr-4">
                      <div className="space-y-2">
                        <h3 className="font-medium text-sm text-gray-500">Your Children</h3>
                        <div className="space-y-1">
                          {children.map((child, index) => (
                            <button
                              key={child.id}
                              type="button"
                              className={`w-full text-left px-3 py-2 rounded-md ${
                                selectedChildIndex === index ? "bg-primary text-white" : "hover:bg-gray-100"
                              }`}
                              onClick={() => selectChild(index)}
                            >
                              {child.name} {child.surname}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      {selectedChildIndex !== null && (
                        <form onSubmit={handleChildSubmit}>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="childName">First Name</Label>
                                <div className="relative">
                                  <Input
                                    id="childName"
                                    name="name"
                                    value={childFormData.name}
                                    onChange={handleChildInputChange}
                                    required
                                    className={
                                      validationErrors.childName
                                        ? "border-red-500"
                                        : validFields.childName
                                          ? "border-green-500"
                                          : ""
                                    }
                                  />
                                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                    {getFieldIcon("childName")}
                                  </div>
                                </div>
                                {validationErrors.childName && (
                                  <p className="text-red-500 text-sm">{validationErrors.childName}</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="childSurname">Last Name</Label>
                                <div className="relative">
                                  <Input
                                    id="childSurname"
                                    name="surname"
                                    value={childFormData.surname}
                                    onChange={handleChildInputChange}
                                    required
                                    className={
                                      validationErrors.childSurname
                                        ? "border-red-500"
                                        : validFields.childSurname
                                          ? "border-green-500"
                                          : ""
                                    }
                                  />
                                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                    {getFieldIcon("childSurname")}
                                  </div>
                                </div>
                                {validationErrors.childSurname && (
                                  <p className="text-red-500 text-sm">{validationErrors.childSurname}</p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="childIdNumber">ID Number</Label>
                              <Input
                                id="childIdNumber"
                                name="idNumber"
                                value={childFormData.idNumber}
                                disabled
                                className="bg-gray-100"
                              />
                              <p className="text-xs text-gray-500">ID number cannot be changed</p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="schoolName">School Name</Label>
                              <div className="relative">
                                <Input
                                  id="schoolName"
                                  name="schoolName"
                                  value={childFormData.schoolName}
                                  onChange={handleChildInputChange}
                                  required
                                  className={
                                    validationErrors.schoolName
                                      ? "border-red-500"
                                      : validFields.schoolName
                                        ? "border-green-500"
                                        : ""
                                  }
                                />
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                  {getFieldIcon("schoolName")}
                                </div>
                              </div>
                              {validationErrors.schoolName && (
                                <p className="text-red-500 text-sm">{validationErrors.schoolName}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="schoolAddress">School Address</Label>
                              <div className="relative">
                                <Input
                                  id="schoolAddress"
                                  name="schoolAddress"
                                  value={childFormData.schoolAddress}
                                  onChange={handleChildInputChange}
                                  required
                                  className={
                                    validationErrors.schoolAddress
                                      ? "border-red-500"
                                      : validFields.schoolAddress
                                        ? "border-green-500"
                                        : ""
                                  }
                                />
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                  {getFieldIcon("schoolAddress")}
                                </div>
                              </div>
                              {validationErrors.schoolAddress && (
                                <p className="text-red-500 text-sm">{validationErrors.schoolAddress}</p>
                              )}
                            </div>

                            <div className="flex justify-between pt-4">
                              <Button
                                type="submit"
                                disabled={saving || Object.keys(validationErrors).some((key) => validationErrors[key])}
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
                            </div>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences and settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border rounded-lg p-4 bg-red-50">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Danger Zone</h3>
                  <p className="text-sm text-red-600 mb-4">
                    Once you delete your account, there is no going back. This will permanently remove all your data
                    including child information, user information, and account details.
                  </p>
                  <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DeleteAccountDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} userType="parent" />
      </div>
    </div>
  )
}

export { ParentProfilePage }
