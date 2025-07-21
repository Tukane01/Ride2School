"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { comprehensiveProfileValidator, ErrorRecovery } from "@/lib/comprehensive-profile-validation"
import { AlertCircle, CheckCircle, User, Users, Car, Save, RefreshCw, X, Plus } from "lucide-react"

interface ProfileFormProps {
  user: any
  onUpdate: (updatedUser: any) => void
  userType: "parent" | "driver"
}

interface FormErrors {
  [key: string]: string[]
}

interface FormData {
  // Personal Information
  name: string
  surname: string
  phoneNumber: string
  email: string
  idNumber: string
  address: string
  gender: string

  // Children Information (for parents)
  children: Array<{
    id?: string
    name: string
    surname: string
    idNumber: string
    schoolName: string
    schoolAddress: string
  }>

  // Vehicle Information (for drivers)
  car?: {
    make: string
    model: string
    color: string
    registration: string
    vinNumber: string
  }
}

export default function EnhancedProfileFormWithValidations({ user, onUpdate, userType }: ProfileFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: user?.name || "",
    surname: user?.surname || "",
    phoneNumber: user?.phoneNumber || "",
    email: user?.email || "",
    idNumber: user?.idNumber || "",
    address: user?.address || "",
    gender: user?.gender || "",
    children: user?.children || [],
    car: user?.car || {
      make: "",
      model: "",
      color: "",
      registration: "",
      vinNumber: "",
    },
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [warnings, setWarnings] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [validationInProgress, setValidationInProgress] = useState<string | null>(null)
  const [fieldValidationStatus, setFieldValidationStatus] = useState<{
    [key: string]: "valid" | "invalid" | "pending"
  }>({})

  // Real-time validation with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateAllFields()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData])

  // Track unsaved changes
  useEffect(() => {
    const hasChanges =
      JSON.stringify(formData) !==
      JSON.stringify({
        name: user?.name || "",
        surname: user?.surname || "",
        phoneNumber: user?.phoneNumber || "",
        email: user?.email || "",
        idNumber: user?.idNumber || "",
        address: user?.address || "",
        gender: user?.gender || "",
        children: user?.children || [],
        car: user?.car || { make: "", model: "", color: "", registration: "", vinNumber: "" },
      })
    setHasUnsavedChanges(hasChanges)
  }, [formData, user])

  const validateAllFields = async () => {
    try {
      const newErrors: FormErrors = {}
      const newWarnings: FormErrors = {}
      const newFieldStatus: { [key: string]: "valid" | "invalid" | "pending" } = {}

      // Validate Personal Information with ALL registration exceptions
      const personalValidation = comprehensiveProfileValidator.validatePersonalInfo({
        name: formData.name,
        surname: formData.surname,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        idNumber: formData.idNumber,
        address: formData.address,
        gender: formData.gender,
      })

      if (!personalValidation.isValid) {
        const validationErrors = comprehensiveProfileValidator.getErrors()
        Object.keys(validationErrors).forEach((field) => {
          newErrors[field] = validationErrors[field]
          newFieldStatus[field] = "invalid"
        })
      } else {
        // Mark personal fields as valid
        ;["name", "surname", "phoneNumber", "email", "idNumber", "address", "gender"].forEach((field) => {
          if (formData[field as keyof FormData]) {
            newFieldStatus[field] = "valid"
          }
        })
      }

      // Validate Children Information with ALL registration exceptions (for parents)
      if (userType === "parent" && formData.children.length > 0) {
        formData.children.forEach((child, index) => {
          const childValidation = comprehensiveProfileValidator.validateChildInfo({
            name: child.name,
            surname: child.surname,
            idNumber: child.idNumber,
            schoolName: child.schoolName,
            schoolAddress: child.schoolAddress,
          })

          if (!childValidation.isValid) {
            const childErrors = comprehensiveProfileValidator.getErrors()
            Object.keys(childErrors).forEach((field) => {
              const fieldKey = `child_${index}_${field}`
              newErrors[fieldKey] = childErrors[field]
              newFieldStatus[fieldKey] = "invalid"
            })
          } else {
            // Mark child fields as valid
            ;["name", "surname", "idNumber", "schoolName", "schoolAddress"].forEach((field) => {
              const fieldKey = `child_${index}_${field}`
              if (child[field as keyof typeof child]) {
                newFieldStatus[fieldKey] = "valid"
              }
            })
          }
        })
      }

      // Validate Vehicle Information with ALL registration exceptions (for drivers)
      if (userType === "driver" && formData.car) {
        const vehicleValidation = comprehensiveProfileValidator.validateVehicleInfo({
          make: formData.car.make,
          model: formData.car.model,
          color: formData.car.color,
          registration: formData.car.registration,
          vinNumber: formData.car.vinNumber,
        })

        if (!vehicleValidation.isValid) {
          const vehicleErrors = comprehensiveProfileValidator.getErrors()
          Object.keys(vehicleErrors).forEach((field) => {
            const fieldKey = `car_${field}`
            newErrors[fieldKey] = vehicleErrors[field]
            newFieldStatus[fieldKey] = "invalid"
          })
        } else {
          // Mark vehicle fields as valid
          ;["make", "model", "color", "registration", "vinNumber"].forEach((field) => {
            const fieldKey = `car_${field}`
            if (formData.car?.[field as keyof typeof formData.car]) {
              newFieldStatus[fieldKey] = "valid"
            }
          })
        }
      }

      setErrors(newErrors)
      setWarnings(newWarnings)
      setFieldValidationStatus(newFieldStatus)
    } catch (error) {
      console.error("Validation error:", error)
    }
  }

  const handleInputChange = (field: string, value: string, childIndex?: number) => {
    setValidationInProgress(field)

    try {
      // Auto-sanitize input based on field type with ALL registration rules
      let sanitizedValue = value

      if (field === "name" || field === "surname") {
        sanitizedValue = ErrorRecovery.sanitizeInput(value, "name")
      } else if (field === "phoneNumber") {
        sanitizedValue = ErrorRecovery.sanitizeInput(value, "phone")
      } else if (field === "address" || field === "schoolAddress") {
        sanitizedValue = ErrorRecovery.sanitizeInput(value, "address")
      } else {
        sanitizedValue = ErrorRecovery.sanitizeInput(value, "general")
      }

      if (childIndex !== undefined) {
        // Update child data
        const updatedChildren = [...formData.children]
        updatedChildren[childIndex] = {
          ...updatedChildren[childIndex],
          [field]: sanitizedValue,
        }
        setFormData((prev) => ({ ...prev, children: updatedChildren }))
      } else if (field.startsWith("car_")) {
        // Update car data
        const carField = field.replace("car_", "")
        setFormData((prev) => ({
          ...prev,
          car: {
            ...prev.car!,
            [carField]: sanitizedValue,
          },
        }))
      } else {
        // Update personal data
        setFormData((prev) => ({ ...prev, [field]: sanitizedValue }))
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error)
    } finally {
      setTimeout(() => setValidationInProgress(null), 300)
    }
  }

  const addChild = () => {
    setFormData((prev) => ({
      ...prev,
      children: [
        ...prev.children,
        {
          name: "",
          surname: "",
          idNumber: "",
          schoolName: "",
          schoolAddress: "",
        },
      ],
    }))
  }

  const removeChild = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      // Final validation before submission
      await validateAllFields()

      if (Object.keys(errors).length > 0) {
        toast({
          title: "Validation Failed",
          description: `Please fix ${Object.keys(errors).length} validation error${Object.keys(errors).length !== 1 ? "s" : ""} before saving.`,
          variant: "destructive",
        })
        return
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update user data
      onUpdate({
        ...user,
        ...formData,
      })

      setHasUnsavedChanges(false)

      toast({
        title: "Profile Updated Successfully",
        description: "Your profile has been updated with all validation checks passed.",
      })
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getFieldValidationIcon = (fieldKey: string) => {
    const status = fieldValidationStatus[fieldKey]
    if (validationInProgress === fieldKey) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
    }
    if (status === "valid") {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (status === "invalid") {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const renderFieldError = (fieldKey: string) => {
    if (errors[fieldKey] && errors[fieldKey].length > 0) {
      return (
        <div className="mt-1 space-y-1">
          {errors[fieldKey].map((error, index) => (
            <p key={index} className="text-sm text-red-600 flex items-start">
              <AlertCircle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
              {error}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const getValidationSummary = () => {
    const errorCount = Object.keys(errors).length
    const validCount = Object.values(fieldValidationStatus).filter((status) => status === "valid").length
    return { errorCount, validCount }
  }

  const { errorCount, validCount } = getValidationSummary()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasUnsavedChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Make sure to save your profile before leaving this page.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className={`grid w-full ${userType === "parent" ? "grid-cols-3" : "grid-cols-2"}`}>
          <TabsTrigger value="personal" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Personal Info
            {fieldValidationStatus.name === "valid" && fieldValidationStatus.surname === "valid" && (
              <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
            )}
          </TabsTrigger>
          {userType === "parent" && (
            <TabsTrigger value="children" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Children Info
              {formData.children.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {formData.children.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          {userType === "driver" && (
            <TabsTrigger value="vehicle" className="flex items-center">
              <Car className="h-4 w-4 mr-2" />
              Vehicle Info
              {fieldValidationStatus.car_make === "valid" && fieldValidationStatus.car_model === "valid" && (
                <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Personal Information
                <div className="flex items-center space-x-2">
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {errorCount} Error{errorCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {validCount > 0 && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      {validCount} Valid
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">
                    First Name *<span className="text-xs text-gray-500 ml-1">(3+ chars, letters only)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter your first name"
                      className={
                        errors.name
                          ? "border-red-500 pr-10"
                          : fieldValidationStatus.name === "valid"
                            ? "border-green-500 pr-10"
                            : "pr-10"
                      }
                    />
                    <div className="absolute right-2 top-2">{getFieldValidationIcon("name")}</div>
                  </div>
                  {renderFieldError("name")}
                </div>

                <div>
                  <Label htmlFor="surname">
                    Surname *<span className="text-xs text-gray-500 ml-1">(3+ chars, letters only)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="surname"
                      value={formData.surname}
                      onChange={(e) => handleInputChange("surname", e.target.value)}
                      placeholder="Enter your surname"
                      className={
                        errors.surname
                          ? "border-red-500 pr-10"
                          : fieldValidationStatus.surname === "valid"
                            ? "border-green-500 pr-10"
                            : "pr-10"
                      }
                    />
                    <div className="absolute right-2 top-2">{getFieldValidationIcon("surname")}</div>
                  </div>
                  {renderFieldError("surname")}
                </div>

                <div>
                  <Label htmlFor="phoneNumber">
                    Phone Number *<span className="text-xs text-gray-500 ml-1">(Must start with 06/07/08)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                      placeholder="0612345678"
                      className={
                        errors.phoneNumber
                          ? "border-red-500 pr-10"
                          : fieldValidationStatus.phoneNumber === "valid"
                            ? "border-green-500 pr-10"
                            : "pr-10"
                      }
                    />
                    <div className="absolute right-2 top-2">{getFieldValidationIcon("phoneNumber")}</div>
                  </div>
                  {renderFieldError("phoneNumber")}
                </div>

                <div>
                  <Label htmlFor="email">
                    Email Address *<span className="text-xs text-gray-500 ml-1">(Gmail only, max 3 numbers)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="example@gmail.com"
                      className={
                        errors.email
                          ? "border-red-500 pr-10"
                          : fieldValidationStatus.email === "valid"
                            ? "border-green-500 pr-10"
                            : "pr-10"
                      }
                    />
                    <div className="absolute right-2 top-2">{getFieldValidationIcon("email")}</div>
                  </div>
                  {renderFieldError("email")}
                </div>

                <div>
                  <Label htmlFor="idNumber">
                    ID Number *<span className="text-xs text-gray-500 ml-1">(13 digits, valid SA format)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="idNumber"
                      value={formData.idNumber}
                      onChange={(e) => handleInputChange("idNumber", e.target.value)}
                      placeholder="9001010001088"
                      className={
                        errors.idNumber
                          ? "border-red-500 pr-10"
                          : fieldValidationStatus.idNumber === "valid"
                            ? "border-green-500 pr-10"
                            : "pr-10"
                      }
                    />
                    <div className="absolute right-2 top-2">{getFieldValidationIcon("idNumber")}</div>
                  </div>
                  {renderFieldError("idNumber")}
                </div>

                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger
                      className={
                        errors.gender
                          ? "border-red-500"
                          : fieldValidationStatus.gender === "valid"
                            ? "border-green-500"
                            : ""
                      }
                    >
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {renderFieldError("gender")}
                </div>
              </div>

              <div>
                <Label htmlFor="address">
                  Address *<span className="text-xs text-gray-500 ml-1">(Min 10 chars, include street number)</span>
                </Label>
                <div className="relative">
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="123 Main Street, City, Province, Postal Code"
                    className={
                      errors.address
                        ? "border-red-500 pr-10"
                        : fieldValidationStatus.address === "valid"
                          ? "border-green-500 pr-10"
                          : "pr-10"
                    }
                    rows={3}
                  />
                  <div className="absolute right-2 top-2">{getFieldValidationIcon("address")}</div>
                </div>
                {renderFieldError("address")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {userType === "parent" && (
          <TabsContent value="children" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center">
                    Children Information
                    {formData.children.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {formData.children.length} Child{formData.children.length !== 1 ? "ren" : ""}
                      </Badge>
                    )}
                  </CardTitle>
                  <Button type="button" onClick={addChild} variant="outline" size="sm" className="flex items-center">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Child
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.children.map((child, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium flex items-center">
                        Child {index + 1}
                        {fieldValidationStatus[`child_${index}_name`] === "valid" &&
                          fieldValidationStatus[`child_${index}_surname`] === "valid" && (
                            <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                          )}
                      </h4>
                      <Button
                        type="button"
                        onClick={() => removeChild(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`child_${index}_name`}>
                          Child's First Name *
                          <span className="text-xs text-gray-500 ml-1">(3+ chars, letters only)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id={`child_${index}_name`}
                            value={child.name}
                            onChange={(e) => handleInputChange("name", e.target.value, index)}
                            placeholder="Child's first name"
                            className={
                              errors[`child_${index}_childName`]
                                ? "border-red-500 pr-10"
                                : fieldValidationStatus[`child_${index}_name`] === "valid"
                                  ? "border-green-500 pr-10"
                                  : "pr-10"
                            }
                          />
                          <div className="absolute right-2 top-2">{getFieldValidationIcon(`child_${index}_name`)}</div>
                        </div>
                        {renderFieldError(`child_${index}_childName`)}
                      </div>

                      <div>
                        <Label htmlFor={`child_${index}_surname`}>
                          Child's Surname *<span className="text-xs text-gray-500 ml-1">(3+ chars, letters only)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id={`child_${index}_surname`}
                            value={child.surname}
                            onChange={(e) => handleInputChange("surname", e.target.value, index)}
                            placeholder="Child's surname"
                            className={
                              errors[`child_${index}_childSurname`]
                                ? "border-red-500 pr-10"
                                : fieldValidationStatus[`child_${index}_surname`] === "valid"
                                  ? "border-green-500 pr-10"
                                  : "pr-10"
                            }
                          />
                          <div className="absolute right-2 top-2">
                            {getFieldValidationIcon(`child_${index}_surname`)}
                          </div>
                        </div>
                        {renderFieldError(`child_${index}_childSurname`)}
                      </div>

                      <div>
                        <Label htmlFor={`child_${index}_idNumber`}>
                          Child's ID Number *<span className="text-xs text-gray-500 ml-1">(Age 4-18, 13 digits)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id={`child_${index}_idNumber`}
                            value={child.idNumber}
                            onChange={(e) => handleInputChange("idNumber", e.target.value, index)}
                            placeholder="1234567890123"
                            className={
                              errors[`child_${index}_childIdNumber`]
                                ? "border-red-500 pr-10"
                                : fieldValidationStatus[`child_${index}_idNumber`] === "valid"
                                  ? "border-green-500 pr-10"
                                  : "pr-10"
                            }
                          />
                          <div className="absolute right-2 top-2">
                            {getFieldValidationIcon(`child_${index}_idNumber`)}
                          </div>
                        </div>
                        {renderFieldError(`child_${index}_childIdNumber`)}
                      </div>

                      <div>
                        <Label htmlFor={`child_${index}_schoolName`}>
                          School Name *<span className="text-xs text-gray-500 ml-1">(3-100 chars)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id={`child_${index}_schoolName`}
                            value={child.schoolName}
                            onChange={(e) => handleInputChange("schoolName", e.target.value, index)}
                            placeholder="School name"
                            className={
                              errors[`child_${index}_schoolName`]
                                ? "border-red-500 pr-10"
                                : fieldValidationStatus[`child_${index}_schoolName`] === "valid"
                                  ? "border-green-500 pr-10"
                                  : "pr-10"
                            }
                          />
                          <div className="absolute right-2 top-2">
                            {getFieldValidationIcon(`child_${index}_schoolName`)}
                          </div>
                        </div>
                        {renderFieldError(`child_${index}_schoolName`)}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`child_${index}_schoolAddress`}>
                        School Address *<span className="text-xs text-gray-500 ml-1">(Min 10 chars)</span>
                      </Label>
                      <div className="relative">
                        <Textarea
                          id={`child_${index}_schoolAddress`}
                          value={child.schoolAddress}
                          onChange={(e) => handleInputChange("schoolAddress", e.target.value, index)}
                          placeholder="Full school address"
                          className={
                            errors[`child_${index}_schoolAddress`]
                              ? "border-red-500 pr-10"
                              : fieldValidationStatus[`child_${index}_schoolAddress`] === "valid"
                                ? "border-green-500 pr-10"
                                : "pr-10"
                          }
                          rows={2}
                        />
                        <div className="absolute right-2 top-2">
                          {getFieldValidationIcon(`child_${index}_schoolAddress`)}
                        </div>
                      </div>
                      {renderFieldError(`child_${index}_schoolAddress`)}
                    </div>
                  </div>
                ))}

                {formData.children.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No children added yet</p>
                    <p className="text-sm">Click "Add Child" to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {userType === "driver" && (
          <TabsContent value="vehicle" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Vehicle Information
                  {fieldValidationStatus.car_make === "valid" &&
                    fieldValidationStatus.car_model === "valid" &&
                    fieldValidationStatus.car_color === "valid" && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Vehicle Valid
                      </Badge>
                    )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="car_make">
                      Car Make *
                      <span className="text-xs text-gray-500 ml-1">(2-30 chars, letters/numbers/hyphens)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="car_make"
                        value={formData.car?.make || ""}
                        onChange={(e) => handleInputChange("car_make", e.target.value)}
                        placeholder="Toyota, BMW, Ford, etc."
                        className={
                          errors.car_carMake
                            ? "border-red-500 pr-10"
                            : fieldValidationStatus.car_make === "valid"
                              ? "border-green-500 pr-10"
                              : "pr-10"
                        }
                      />
                      <div className="absolute right-2 top-2">{getFieldValidationIcon("car_make")}</div>
                    </div>
                    {renderFieldError("car_carMake")}
                  </div>

                  <div>
                    <Label htmlFor="car_model">
                      Car Model *<span className="text-xs text-gray-500 ml-1">(1-50 chars)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="car_model"
                        value={formData.car?.model || ""}
                        onChange={(e) => handleInputChange("car_model", e.target.value)}
                        placeholder="Corolla, X3, Focus, etc."
                        className={
                          errors.car_carModel
                            ? "border-red-500 pr-10"
                            : fieldValidationStatus.car_model === "valid"
                              ? "border-green-500 pr-10"
                              : "pr-10"
                        }
                      />
                      <div className="absolute right-2 top-2">{getFieldValidationIcon("car_model")}</div>
                    </div>
                    {renderFieldError("car_carModel")}
                  </div>

                  <div>
                    <Label htmlFor="car_color">
                      Car Color *<span className="text-xs text-gray-500 ml-1">(3-20 chars, letters only)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="car_color"
                        value={formData.car?.color || ""}
                        onChange={(e) => handleInputChange("car_color", e.target.value)}
                        placeholder="Red, Blue, White, etc."
                        className={
                          errors.car_carColor
                            ? "border-red-500 pr-10"
                            : fieldValidationStatus.car_color === "valid"
                              ? "border-green-500 pr-10"
                              : "pr-10"
                        }
                      />
                      <div className="absolute right-2 top-2">{getFieldValidationIcon("car_color")}</div>
                    </div>
                    {renderFieldError("car_carColor")}
                  </div>

                  <div>
                    <Label htmlFor="car_registration">
                      Registration Number *<span className="text-xs text-gray-500 ml-1">(SA format: ABC 123 GP)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="car_registration"
                        value={formData.car?.registration || ""}
                        onChange={(e) => handleInputChange("car_registration", e.target.value)}
                        placeholder="ABC 123 GP"
                        className={
                          errors.car_carRegistration
                            ? "border-red-500 pr-10"
                            : fieldValidationStatus.car_registration === "valid"
                              ? "border-green-500 pr-10"
                              : "pr-10"
                        }
                      />
                      <div className="absolute right-2 top-2">{getFieldValidationIcon("car_registration")}</div>
                    </div>
                    {renderFieldError("car_carRegistration")}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="car_vinNumber">
                      VIN Number *<span className="text-xs text-gray-500 ml-1">(17 chars, no I/O/Q)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="car_vinNumber"
                        value={formData.car?.vinNumber || ""}
                        onChange={(e) => handleInputChange("car_vinNumber", e.target.value)}
                        placeholder="1HGBH41JXMN109186"
                        className={
                          errors.car_carVinNumber
                            ? "border-red-500 pr-10"
                            : fieldValidationStatus.car_vinNumber === "valid"
                              ? "border-green-500 pr-10"
                              : "pr-10"
                        }
                      />
                      <div className="absolute right-2 top-2">{getFieldValidationIcon("car_vinNumber")}</div>
                    </div>
                    {renderFieldError("car_carVinNumber")}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <div className="flex justify-between items-center pt-6 border-t">
        <div className="flex items-center space-x-2">
          {errorCount > 0 && (
            <Badge variant="destructive" className="flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {errorCount} Error{errorCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {errorCount === 0 && validCount > 0 && (
            <Badge variant="default" className="flex items-center bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              All Fields Valid
            </Badge>
          )}
          {hasUnsavedChanges && (
            <Badge variant="outline" className="flex items-center">
              <RefreshCw className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
        </div>

        <Button type="submit" disabled={loading || errorCount > 0} className="flex items-center">
          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </form>
  )
}
