"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, CheckCircle, AlertTriangle, Save } from "lucide-react"
import {
  updateUserProfileEnhanced,
  updateChildDetailsEnhanced,
  updateCarDetailsEnhanced,
} from "@/lib/api-profile-enhanced"
import { profileValidator, ProfileUpdateException, ErrorRecovery } from "@/lib/profile-validation"

interface EnhancedProfileFormProps {
  userType: "parent" | "driver"
  initialData: any
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}

export function EnhancedProfileForm({ userType, initialData, onSuccess, onError }: EnhancedProfileFormProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({})
  const [warnings, setWarnings] = useState<{ [key: string]: string[] }>({})
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("personal")

  // Form data states
  const [personalForm, setPersonalForm] = useState({
    name: initialData?.name || "",
    surname: initialData?.surname || "",
    phoneNumber: initialData?.phoneNumber || "",
    address: initialData?.address || "",
    gender: initialData?.gender || "",
    email: initialData?.email || "",
    idNumber: initialData?.idNumber || "",
  })

  const [childForm, setChildForm] = useState({
    name: initialData?.child?.name || "",
    surname: initialData?.child?.surname || "",
    idNumber: initialData?.child?.idNumber || "",
    schoolName: initialData?.child?.school?.name || "",
    schoolAddress: initialData?.child?.school?.address || "",
  })

  const [carForm, setCarForm] = useState({
    make: initialData?.car?.make || "",
    model: initialData?.car?.model || "",
    color: initialData?.car?.color || "",
    registration: initialData?.car?.registration || "",
    vinNumber: initialData?.car?.vinNumber || "",
  })

  // Real-time validation
  const validateField = (field: string, value: string, formType: "personal" | "child" | "car") => {
    try {
      profileValidator.clearErrors()

      switch (formType) {
        case "personal":
          profileValidator.validatePersonalInfo({ [field]: value })
          break
        case "child":
          profileValidator.validateChildInfo({ [field]: value })
          break
        case "car":
          profileValidator.validateVehicleInfo({ [field]: value })
          break
      }

      // Clear field errors if validation passes
      setErrors((prev) => ({
        ...prev,
        [field]: [],
      }))
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        [field]: [error.message],
      }))
    }
  }

  // Input change handlers with real-time validation and sanitization
  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    // Sanitize input based on field type
    let sanitizedValue = value
    if (name === "name" || name === "surname") {
      sanitizedValue = ErrorRecovery.sanitizeInput(value, "name")
    } else if (name === "phoneNumber") {
      sanitizedValue = ErrorRecovery.sanitizeInput(value, "phone")
    } else if (name === "address") {
      sanitizedValue = ErrorRecovery.sanitizeInput(value, "address")
    }

    setPersonalForm((prev) => ({ ...prev, [name]: sanitizedValue }))

    // Real-time validation
    if (sanitizedValue.trim().length > 0) {
      validateField(name, sanitizedValue, "personal")
    }
  }

  const handleChildChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Sanitize input
    let sanitizedValue = value
    if (name === "name" || name === "surname") {
      sanitizedValue = ErrorRecovery.sanitizeInput(value, "name")
    } else if (name === "idNumber") {
      sanitizedValue = ErrorRecovery.sanitizeInput(value, "phone")
    }

    setChildForm((prev) => ({ ...prev, [name]: sanitizedValue }))

    // Real-time validation
    if (sanitizedValue.trim().length > 0) {
      validateField(name, sanitizedValue, "child")
    }
  }

  const handleCarChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Sanitize input
    let sanitizedValue = value
    if (name === "registration" || name === "vinNumber") {
      sanitizedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "")
    }

    setCarForm((prev) => ({ ...prev, [name]: sanitizedValue }))

    // Real-time validation
    if (sanitizedValue.trim().length > 0) {
      validateField(name, sanitizedValue, "car")
    }
  }

  // Form submission handlers
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setWarnings({})
    setSuccess(null)

    try {
      const result = await updateUserProfileEnhanced(personalForm)

      if (result.warnings && result.warnings.length > 0) {
        setWarnings({ general: result.warnings })
      }

      setSuccess("Personal information updated successfully")
      onSuccess?.(result.data)
    } catch (error: any) {
      console.error("Profile update error:", error)

      if (error instanceof ProfileUpdateException) {
        if (error.details?.errors) {
          setErrors({ [error.field || "general"]: error.details.errors })
        } else {
          setErrors({ [error.field || "general"]: [error.message] })
        }
      } else {
        setErrors({ general: [error.message || "Failed to update profile"] })
      }

      onError?.(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveChild = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setWarnings({})
    setSuccess(null)

    try {
      const result = await updateChildDetailsEnhanced(childForm)

      if (result.warnings && result.warnings.length > 0) {
        setWarnings({ general: result.warnings })
      }

      setSuccess("Child information updated successfully")
      onSuccess?.(result.data)
    } catch (error: any) {
      console.error("Child update error:", error)

      if (error instanceof ProfileUpdateException) {
        if (error.details?.errors) {
          setErrors({ [error.field || "general"]: error.details.errors })
        } else {
          setErrors({ [error.field || "general"]: [error.message] })
        }
      } else {
        setErrors({ general: [error.message || "Failed to update child information"] })
      }

      onError?.(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setWarnings({})
    setSuccess(null)

    try {
      const result = await updateCarDetailsEnhanced(carForm)

      if (result.warnings && result.warnings.length > 0) {
        setWarnings({ general: result.warnings })
      }

      setSuccess("Vehicle information updated successfully")
      onSuccess?.(result.data)
    } catch (error: any) {
      console.error("Vehicle update error:", error)

      if (error instanceof ProfileUpdateException) {
        if (error.details?.errors) {
          setErrors({ [error.field || "general"]: error.details.errors })
        } else {
          setErrors({ [error.field || "general"]: [error.message] })
        }
      } else {
        setErrors({ general: [error.message || "Failed to update vehicle information"] })
      }

      onError?.(error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to render field errors
  const renderFieldErrors = (fieldName: string) => {
    const fieldErrors = errors[fieldName]
    if (!fieldErrors || fieldErrors.length === 0) return null

    return (
      <div className="mt-1">
        {fieldErrors.map((error, index) => (
          <p key={index} className="text-sm text-red-600 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {error}
          </p>
        ))}
      </div>
    )
  }

  // Helper function to render field warnings
  const renderFieldWarnings = (fieldName: string) => {
    const fieldWarnings = warnings[fieldName]
    if (!fieldWarnings || fieldWarnings.length === 0) return null

    return (
      <div className="mt-1">
        {fieldWarnings.map((warning, index) => (
          <p key={index} className="text-sm text-yellow-600 flex items-center">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {warning}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global Messages */}
      {errors.general && errors.general.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.general.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warnings.general && warnings.general.length > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Warning</AlertTitle>
          <AlertDescription className="text-yellow-700">
            <ul className="list-disc list-inside">
              {warnings.general.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "personal" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("personal")}
        >
          Personal Information
        </button>

        {userType === "parent" && (
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "child" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("child")}
          >
            Child Information
          </button>
        )}

        {userType === "driver" && (
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "vehicle" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("vehicle")}
          >
            Vehicle Information
          </button>
        )}
      </div>

      {/* Personal Information Tab */}
      {activeTab === "personal" && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePersonal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">First Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={personalForm.name}
                    onChange={handlePersonalChange}
                    className={errors.name?.length ? "border-red-500" : ""}
                    placeholder="Minimum 3 characters"
                    required
                  />
                  {renderFieldErrors("name")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surname">Surname *</Label>
                  <Input
                    id="surname"
                    name="surname"
                    value={personalForm.surname}
                    onChange={handlePersonalChange}
                    className={errors.surname?.length ? "border-red-500" : ""}
                    placeholder="Minimum 3 characters"
                    required
                  />
                  {renderFieldErrors("surname")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={personalForm.email}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                  {renderFieldWarnings("email")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    value={personalForm.phoneNumber}
                    onChange={handlePersonalChange}
                    className={errors.phoneNumber?.length ? "border-red-500" : ""}
                    placeholder="0612345678"
                    maxLength={10}
                    required
                  />
                  {renderFieldErrors("phoneNumber")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID Number</Label>
                  <Input id="idNumber" name="idNumber" value={personalForm.idNumber} disabled className="bg-gray-100" />
                  <p className="text-xs text-gray-500">ID number cannot be changed</p>
                  {renderFieldWarnings("idNumber")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <select
                    id="gender"
                    name="gender"
                    value={personalForm.gender}
                    onChange={handlePersonalChange}
                    className={`w-full p-2 border rounded-md ${errors.gender?.length ? "border-red-500" : ""}`}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {renderFieldErrors("gender")}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={personalForm.address}
                    onChange={handlePersonalChange}
                    className={errors.address?.length ? "border-red-500" : ""}
                    rows={3}
                    placeholder="Enter your full address including street number"
                    required
                  />
                  {renderFieldErrors("address")}
                </div>
              </div>

              <Button type="submit" className="w-full md:w-auto" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Personal Information
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Child Information Tab */}
      {activeTab === "child" && userType === "parent" && (
        <Card>
          <CardHeader>
            <CardTitle>Child Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveChild} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="childName">Child's First Name *</Label>
                  <Input
                    id="childName"
                    name="name"
                    value={childForm.name}
                    onChange={handleChildChange}
                    className={errors.childName?.length ? "border-red-500" : ""}
                    placeholder="Minimum 3 characters"
                    required
                  />
                  {renderFieldErrors("childName")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="childSurname">Child's Surname *</Label>
                  <Input
                    id="childSurname"
                    name="surname"
                    value={childForm.surname}
                    onChange={handleChildChange}
                    className={errors.childSurname?.length ? "border-red-500" : ""}
                    placeholder="Minimum 3 characters"
                    required
                  />
                  {renderFieldErrors("childSurname")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="childIdNumber">Child's ID Number *</Label>
                  <Input
                    id="childIdNumber"
                    name="idNumber"
                    value={childForm.idNumber}
                    onChange={handleChildChange}
                    className={errors.childIdNumber?.length ? "border-red-500" : ""}
                    maxLength={13}
                    placeholder="1234567890123"
                    required
                  />
                  {renderFieldErrors("childIdNumber")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name *</Label>
                  <Input
                    id="schoolName"
                    name="schoolName"
                    value={childForm.schoolName}
                    onChange={handleChildChange}
                    className={errors.schoolName?.length ? "border-red-500" : ""}
                    required
                  />
                  {renderFieldErrors("schoolName")}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="schoolAddress">School Address *</Label>
                  <Textarea
                    id="schoolAddress"
                    name="schoolAddress"
                    value={childForm.schoolAddress}
                    onChange={handleChildChange}
                    className={errors.schoolAddress?.length ? "border-red-500" : ""}
                    rows={3}
                    placeholder="Enter the complete school address"
                    required
                  />
                  {renderFieldErrors("schoolAddress")}
                </div>
              </div>

              <Button type="submit" className="w-full md:w-auto" disabled={loading}>
                {loading ? (
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
          </CardContent>
        </Card>
      )}

      {/* Vehicle Information Tab */}
      {activeTab === "vehicle" && userType === "driver" && (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveCar} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carMake">Car Make *</Label>
                  <Input
                    id="carMake"
                    name="make"
                    value={carForm.make}
                    onChange={handleCarChange}
                    className={errors.carMake?.length ? "border-red-500" : ""}
                    placeholder="e.g., Toyota, BMW, Ford"
                    required
                  />
                  {renderFieldErrors("carMake")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carModel">Car Model *</Label>
                  <Input
                    id="carModel"
                    name="model"
                    value={carForm.model}
                    onChange={handleCarChange}
                    className={errors.carModel?.length ? "border-red-500" : ""}
                    placeholder="e.g., Corolla, 3 Series, Focus"
                    required
                  />
                  {renderFieldErrors("carModel")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carColor">Car Color *</Label>
                  <Input
                    id="carColor"
                    name="color"
                    value={carForm.color}
                    onChange={handleCarChange}
                    className={errors.carColor?.length ? "border-red-500" : ""}
                    placeholder="e.g., White, Black, Silver"
                    required
                  />
                  {renderFieldErrors("carColor")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carRegistration">Registration Number *</Label>
                  <Input
                    id="carRegistration"
                    name="registration"
                    value={carForm.registration}
                    onChange={handleCarChange}
                    className={errors.carRegistration?.length ? "border-red-500" : ""}
                    placeholder="ABC 123 GP"
                    maxLength={10}
                    required
                  />
                  {renderFieldErrors("carRegistration")}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="carVinNumber">VIN Number *</Label>
                  <Input
                    id="carVinNumber"
                    name="vinNumber"
                    value={carForm.vinNumber}
                    onChange={handleCarChange}
                    className={errors.carVinNumber?.length ? "border-red-500" : ""}
                    placeholder="17-character VIN number"
                    maxLength={17}
                    required
                  />
                  {renderFieldErrors("carVinNumber")}
                  <p className="text-xs text-gray-500">Vehicle Identification Number (17 characters, no I, O, or Q)</p>
                </div>
              </div>

              <Button type="submit" className="w-full md:w-auto" disabled={loading}>
                {loading ? (
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
