"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { registerUser } from "@/lib/auth"
import { Loader2, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Image from "next/image"
import MapAddressPicker from "@/components/map-address-picker"
import {
  validateName,
  validatePassword,
  validatePhoneNumber,
  validateSouthAfricanID,
  validateEmail,
  validateChildAge,
} from "@/lib/enhanced-validation"

export default function Register() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userType = searchParams.get("type") || "parent"

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Common user details
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    idNumber: "",
    gender: "male",
    address: "",

    // Parent specific
    hasChild: "",
    childName: "",
    childSurname: "",
    childIdNumber: "",
    childSchoolName: "",
    childSchoolAddress: "",

    // Driver specific
    hasCar: "",
    carMake: "",
    carModel: "",
    carRegistration: "",
    carColor: "",
    carVinNumber: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    // Real-time validation for specific fields
    if (name === "name" || name === "surname" || name === "childName" || name === "childSurname") {
      // Only allow alphabetic characters and spaces
      const filteredValue = value.replace(/[^a-zA-Z\s]/g, "")
      setFormData({ ...formData, [name]: filteredValue })
    } else if (name === "password" || name === "confirmPassword") {
      // Remove any whitespace characters
      const filteredValue = value.replace(/\s/g, "")
      setFormData({ ...formData, [name]: filteredValue })
    } else if (name === "phoneNumber") {
      // Only allow digits and limit to 10 characters
      const filteredValue = value.replace(/\D/g, "").slice(0, 10)
      setFormData({ ...formData, [name]: filteredValue })
    } else if (name === "idNumber" || name === "childIdNumber") {
      // Only allow digits and limit to 13 characters
      const filteredValue = value.replace(/\D/g, "").slice(0, 13)
      setFormData({ ...formData, [name]: filteredValue })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const validateStep = () => {
    setError("")

    if (step === 1) {
      // Validate all name fields
      try {
        validateName(formData.name, "First Name")
        validateName(formData.surname, "Surname")
      } catch (err: any) {
        setError(err.message)
        return false
      }

      // Validate email
      try {
        validateEmail(formData.email)
      } catch (err: any) {
        setError(err.message)
        return false
      }

      // Validate password with enhanced rules
      try {
        validatePassword(formData.password)
      } catch (err: any) {
        setError(err.message)
        return false
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match")
        return false
      }
    }

    if (step === 2) {
      // Validate phone number with 06/07/08 requirement
      try {
        validatePhoneNumber(formData.phoneNumber)
      } catch (err: any) {
        setError(err.message)
        return false
      }

      // Validate ID number with strict structure validation and age requirements
      try {
        const validation = validateSouthAfricanID(formData.idNumber, formData.gender, userType)
        console.log("ID Validation:", validation)
      } catch (err: any) {
        setError(err.message)
        return false
      }

      // Validate address
      if (formData.address.trim().length < 10) {
        setError("Please enter a valid address")
        return false
      }
    }

    if (step === 3) {
      if (userType === "parent") {
        if (formData.hasChild === "") {
          setError("Please indicate if you have a child")
          return false
        }

        if (formData.hasChild === "yes") {
          try {
            validateName(formData.childName, "Child's First Name")
            validateName(formData.childSurname, "Child's Surname")
          } catch (err: any) {
            setError(err.message)
            return false
          }

          try {
            validateSouthAfricanID(formData.childIdNumber)
            validateChildAge(formData.childIdNumber)
          } catch (err: any) {
            setError(err.message)
            return false
          }

          if (formData.childSchoolName.trim().length < 3) {
            setError("Please enter a valid school name")
            return false
          }

          if (formData.childSchoolAddress.trim().length < 10) {
            setError("Please enter a valid school address")
            return false
          }
        }
      } else if (userType === "driver") {
        if (formData.hasCar === "") {
          setError("Please indicate if you have a car")
          return false
        }

        if (formData.hasCar === "yes") {
          if (formData.carMake.trim().length < 2) {
            setError("Please enter a valid car make")
            return false
          }

          if (formData.carModel.trim().length < 2) {
            setError("Please enter a valid car model")
            return false
          }

          if (formData.carRegistration.trim().length < 5) {
            setError("Please enter a valid car registration number")
            return false
          }

          if (formData.carColor.trim().length < 3) {
            setError("Please enter a valid car color")
            return false
          }

          if (formData.carVinNumber.trim().length < 10) {
            setError("Please enter a valid VIN number")
            return false
          }
        }
      }
    }

    return true
  }

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStep()) {
      return
    }

    // Check user type specific validations
    if (userType === "parent" && formData.hasChild === "no") {
      setError("You must have a child to register as a parent")
      return
    }

    if (userType === "driver" && formData.hasCar === "no") {
      setError("You must have a car to register as a driver")
      return
    }

    setLoading(true)

    try {
      await registerUser(userType, formData)

      // Redirect directly to dashboard since we're skipping email verification
      if (userType === "parent") {
        router.push("/parent/dashboard")
      } else {
        router.push("/driver/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center bg-white pb-2">
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 mb-2">
                <Image src="/images/ride.png" alt="Ride2School Logo" fill className="object-contain" priority />
              </div>
              <CardTitle className="text-2xl font-bold text-blue-600">Ride2School</CardTitle>
              <p className="text-gray-600 text-sm mt-1">Safe transportation for your children</p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-center mb-6">
              Register as {userType === "parent" ? "Parent" : "Driver"}
            </h2>

            {/* Age Requirements Notice */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Age Requirements:</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {userType === "parent"
                  ? "Parents: 15-70 years old • Children: 5-18 years old"
                  : "Drivers: 18-70 years old"}
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">First Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="John (min 3 chars, letters only)"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="surname">Surname</Label>
                    <Input
                      id="surname"
                      name="surname"
                      placeholder="Doe (min 3 chars, letters only)"
                      value={formData.surname}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your.email@gmail.com (Gmail only)"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      8+ chars, uppercase, lowercase, number, special char, no spaces
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <Button type="button" className="w-full bg-blue-600 hover:bg-blue-700" onClick={nextStep}>
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      placeholder="0712345678"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-xs text-gray-500">Must start with 06, 07, or 08</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idNumber">ID Number</Label>
                    <Input
                      id="idNumber"
                      name="idNumber"
                      placeholder="9001015009087"
                      value={formData.idNumber}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      13 digits • Age: {userType === "parent" ? "15-70 years" : "18-70 years"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <RadioGroup
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female">Female</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <MapAddressPicker
                      value={formData.address}
                      onChange={(address) => setFormData({ ...formData, address })}
                      placeholder="123 Main Street, Suburb, City"
                      label="Home Address"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="button" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={nextStep}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && userType === "parent" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Do you have a child?</Label>
                    <RadioGroup
                      value={formData.hasChild}
                      onValueChange={(value) => setFormData({ ...formData, hasChild: value })}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="hasChildYes" />
                        <Label htmlFor="hasChildYes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="hasChildNo" />
                        <Label htmlFor="hasChildNo">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.hasChild === "yes" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="childName">Child's First Name</Label>
                        <Input
                          id="childName"
                          name="childName"
                          placeholder="Jane (min 3 chars, letters only)"
                          value={formData.childName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="childSurname">Child's Surname</Label>
                        <Input
                          id="childSurname"
                          name="childSurname"
                          placeholder="Doe (min 3 chars, letters only)"
                          value={formData.childSurname}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="childIdNumber">Child's ID Number</Label>
                        <Input
                          id="childIdNumber"
                          name="childIdNumber"
                          placeholder="1001015009087"
                          value={formData.childIdNumber}
                          onChange={handleInputChange}
                          required
                        />
                        <p className="text-xs text-gray-500">13 digits • Age: 5-18 years</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="childSchoolName">School Name</Label>
                        <Input
                          id="childSchoolName"
                          name="childSchoolName"
                          placeholder="Springfield Elementary"
                          value={formData.childSchoolName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <MapAddressPicker
                          value={formData.childSchoolAddress}
                          onChange={(address) => setFormData({ ...formData, childSchoolAddress: address })}
                          placeholder="456 School Road, Suburb, City"
                          label="School Address"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex space-x-2">
                    <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && userType === "driver" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Do you have a car?</Label>
                    <RadioGroup
                      value={formData.hasCar}
                      onValueChange={(value) => setFormData({ ...formData, hasCar: value })}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="hasCarYes" />
                        <Label htmlFor="hasCarYes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="hasCarNo" />
                        <Label htmlFor="hasCarNo">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.hasCar === "yes" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="carMake">Car Make</Label>
                        <Input
                          id="carMake"
                          name="carMake"
                          placeholder="Toyota"
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
                          placeholder="Corolla"
                          value={formData.carModel}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="carRegistration">Registration Number</Label>
                        <Input
                          id="carRegistration"
                          name="carRegistration"
                          placeholder="ABC123GP"
                          value={formData.carRegistration}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="carColor">Car Color</Label>
                        <Input
                          id="carColor"
                          name="carColor"
                          placeholder="White"
                          value={formData.carColor}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="carVinNumber">VIN Number</Label>
                        <Input
                          id="carVinNumber"
                          name="carVinNumber"
                          placeholder="1HGCM82633A123456"
                          value={formData.carVinNumber}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="flex space-x-2">
                    <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            <div className="mt-4 text-center text-sm">
              <p className="text-gray-600">
                Already have an account?{" "}
                <Link href={`/auth/login?type=${userType}`} className="text-blue-600 hover:underline">
                  Login
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Button variant="ghost" className="text-gray-500" onClick={() => router.push("/")}>
                Back to Home
              </Button>
            </div>

            <div className="text-center text-gray-500 text-sm mt-6">© 2025 Ride2School. All rights reserved.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
