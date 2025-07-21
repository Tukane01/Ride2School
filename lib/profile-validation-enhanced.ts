// Enhanced validation library for user profile editing with all registration validations
import {
  validateName,
  validatePhoneNumber,
  validateSouthAfricanID,
  validateEmail,
  validatePassword,
  validateChildAge,
} from "./enhanced-validation"

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  field?: string
}

export interface ProfileValidationErrors {
  [key: string]: string[]
}

// Profile validation class with comprehensive error handling including all registration validations
export class EnhancedProfileValidator {
  private errors: ProfileValidationErrors = {}
  private warnings: ProfileValidationErrors = {}

  // Clear all errors and warnings
  clearErrors(): void {
    this.errors = {}
    this.warnings = {}
  }

  // Add error for a specific field
  addError(field: string, message: string): void {
    if (!this.errors[field]) {
      this.errors[field] = []
    }
    this.errors[field].push(message)
  }

  // Add warning for a specific field
  addWarning(field: string, message: string): void {
    if (!this.warnings[field]) {
      this.warnings[field] = []
    }
    this.warnings[field].push(message)
  }

  // Get all errors
  getErrors(): ProfileValidationErrors {
    return this.errors
  }

  // Get all warnings
  getWarnings(): ProfileValidationErrors {
    return this.warnings
  }

  // Check if there are any errors
  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0
  }

  // Get error count
  getErrorCount(): number {
    return Object.values(this.errors).reduce((count, errors) => count + errors.length, 0)
  }

  // Validate personal information with all registration validations
  validatePersonalInfo(data: {
    name?: string
    surname?: string
    phoneNumber?: string
    address?: string
    gender?: string
    email?: string
    idNumber?: string
    password?: string
  }): ValidationResult {
    this.clearErrors()

    try {
      // Validate name with all registration exceptions (3+ chars, alphabetic only, etc.)
      if (data.name !== undefined) {
        try {
          validateName(data.name, "First Name")
        } catch (error: any) {
          this.addError("name", error.message)
        }
      }

      // Validate surname with all registration exceptions
      if (data.surname !== undefined) {
        try {
          validateName(data.surname, "Surname")
        } catch (error: any) {
          this.addError("surname", error.message)
        }
      }

      // Validate phone number with all registration exceptions (must start with 06/07/08)
      if (data.phoneNumber !== undefined) {
        try {
          validatePhoneNumber(data.phoneNumber)
        } catch (error: any) {
          this.addError("phoneNumber", error.message)
        }
      }

      // Validate address with all registration exceptions
      if (data.address !== undefined) {
        try {
          this.validateAddress(data.address)
        } catch (error: any) {
          this.addError("address", error.message)
        }
      }

      // Validate gender with all registration exceptions
      if (data.gender !== undefined) {
        try {
          this.validateGender(data.gender)
        } catch (error: any) {
          this.addError("gender", error.message)
        }
      }

      // Validate email with all registration exceptions (Gmail only, max 3 numbers, etc.)
      if (data.email !== undefined) {
        try {
          validateEmail(data.email)
        } catch (error: any) {
          this.addError("email", error.message)
        }
      }

      // Validate ID number with all registration exceptions (13 digits, date validation, etc.)
      if (data.idNumber !== undefined) {
        try {
          validateSouthAfricanID(data.idNumber, data.gender)
        } catch (error: any) {
          this.addError("idNumber", error.message)
        }
      }

      // Validate password with all registration exceptions (no whitespace, special chars, etc.)
      if (data.password !== undefined) {
        try {
          validatePassword(data.password)
        } catch (error: any) {
          this.addError("password", error.message)
        }
      }
    } catch (error: any) {
      this.addError("general", `Personal information validation failed: ${error.message}`)
    }

    return {
      isValid: !this.hasErrors(),
      errors: Object.values(this.errors).flat(),
      warnings: Object.values(this.warnings).flat(),
    }
  }

  // Validate child information with all registration validations
  validateChildInfo(data: {
    name?: string
    surname?: string
    idNumber?: string
    schoolName?: string
    schoolAddress?: string
  }): ValidationResult {
    this.clearErrors()

    try {
      // Validate child name with all registration exceptions (3+ chars, alphabetic only, etc.)
      if (data.name !== undefined) {
        try {
          validateName(data.name, "Child's First Name")
        } catch (error: any) {
          this.addError("childName", error.message)
        }
      }

      // Validate child surname with all registration exceptions
      if (data.surname !== undefined) {
        try {
          validateName(data.surname, "Child's Surname")
        } catch (error: any) {
          this.addError("childSurname", error.message)
        }
      }

      // Validate child ID number with all registration exceptions (age 4-18, 13 digits, etc.)
      if (data.idNumber !== undefined) {
        try {
          validateChildAge(data.idNumber)
        } catch (error: any) {
          this.addError("childIdNumber", error.message)
        }
      }

      // Validate school name with all registration exceptions
      if (data.schoolName !== undefined) {
        try {
          this.validateSchoolName(data.schoolName)
        } catch (error: any) {
          this.addError("schoolName", error.message)
        }
      }

      // Validate school address with all registration exceptions
      if (data.schoolAddress !== undefined) {
        try {
          this.validateAddress(data.schoolAddress, "School address")
        } catch (error: any) {
          this.addError("schoolAddress", error.message)
        }
      }
    } catch (error: any) {
      this.addError("general", `Child information validation failed: ${error.message}`)
    }

    return {
      isValid: !this.hasErrors(),
      errors: Object.values(this.errors).flat(),
      warnings: Object.values(this.warnings).flat(),
    }
  }

  // Validate vehicle information with all registration validations
  validateVehicleInfo(data: {
    make?: string
    model?: string
    color?: string
    registration?: string
    vinNumber?: string
  }): ValidationResult {
    this.clearErrors()

    try {
      // Validate car make with all registration exceptions
      if (data.make !== undefined) {
        try {
          this.validateCarMake(data.make)
        } catch (error: any) {
          this.addError("carMake", error.message)
        }
      }

      // Validate car model with all registration exceptions
      if (data.model !== undefined) {
        try {
          this.validateCarModel(data.model)
        } catch (error: any) {
          this.addError("carModel", error.message)
        }
      }

      // Validate car color with all registration exceptions
      if (data.color !== undefined) {
        try {
          this.validateCarColor(data.color)
        } catch (error: any) {
          this.addError("carColor", error.message)
        }
      }

      // Validate registration number with all registration exceptions
      if (data.registration !== undefined) {
        try {
          this.validateRegistrationNumber(data.registration)
        } catch (error: any) {
          this.addError("carRegistration", error.message)
        }
      }

      // Validate VIN number with all registration exceptions
      if (data.vinNumber !== undefined) {
        try {
          this.validateVinNumber(data.vinNumber)
        } catch (error: any) {
          this.addError("carVinNumber", error.message)
        }
      }
    } catch (error: any) {
      this.addError("general", `Vehicle information validation failed: ${error.message}`)
    }

    return {
      isValid: !this.hasErrors(),
      errors: Object.values(this.errors).flat(),
      warnings: Object.values(this.warnings).flat(),
    }
  }

  // Private validation methods with all registration exceptions
  private validateAddress(address: string, fieldName = "Address"): void {
    if (!address || address.trim().length === 0) {
      throw new Error(`${fieldName} is required`)
    }

    const trimmedAddress = address.trim()

    if (trimmedAddress.length < 10) {
      throw new Error(`${fieldName} must be at least 10 characters long`)
    }

    if (trimmedAddress.length > 200) {
      throw new Error(`${fieldName} cannot be longer than 200 characters`)
    }

    // Check for valid address format (should contain some numbers and letters)
    if (!/\d/.test(trimmedAddress)) {
      this.addWarning("address", `${fieldName} should typically contain a street number`)
    }

    // Check for inappropriate content
    const inappropriateWords = ["test", "fake", "dummy", "example"]
    const lowerAddress = trimmedAddress.toLowerCase()
    for (const word of inappropriateWords) {
      if (lowerAddress.includes(word)) {
        throw new Error(`${fieldName} appears to contain placeholder text`)
      }
    }

    // Check for special characters that aren't allowed in addresses
    if (!/^[a-zA-Z0-9\s\-'.,()#/]+$/.test(trimmedAddress)) {
      throw new Error(`${fieldName} contains invalid characters`)
    }
  }

  private validateGender(gender: string): void {
    const validGenders = ["male", "female", "other"]
    if (!validGenders.includes(gender.toLowerCase())) {
      throw new Error("Please select a valid gender option")
    }
  }

  private validateSchoolName(schoolName: string): void {
    if (!schoolName || schoolName.trim().length === 0) {
      throw new Error("School name is required")
    }

    const trimmedName = schoolName.trim()

    if (trimmedName.length < 3) {
      throw new Error("School name must be at least 3 characters long")
    }

    if (trimmedName.length > 100) {
      throw new Error("School name cannot be longer than 100 characters")
    }

    // Allow letters, numbers, spaces, and common school-related characters
    if (!/^[a-zA-Z0-9\s\-'.,()&]+$/.test(trimmedName)) {
      throw new Error("School name contains invalid characters")
    }

    // Check for inappropriate content
    const inappropriateWords = ["test", "fake", "dummy"]
    const lowerName = trimmedName.toLowerCase()
    for (const word of inappropriateWords) {
      if (lowerName.includes(word)) {
        throw new Error("School name appears to contain placeholder text")
      }
    }

    // Check for numbers at the start (schools shouldn't start with numbers)
    if (/^\d/.test(trimmedName)) {
      throw new Error("School name cannot start with a number")
    }
  }

  private validateCarMake(make: string): void {
    if (!make || make.trim().length === 0) {
      throw new Error("Car make is required")
    }

    const trimmedMake = make.trim()

    if (trimmedMake.length < 2) {
      throw new Error("Car make must be at least 2 characters long")
    }

    if (trimmedMake.length > 30) {
      throw new Error("Car make cannot be longer than 30 characters")
    }

    // Allow letters, numbers, spaces, and hyphens only
    if (!/^[a-zA-Z0-9\s-]+$/.test(trimmedMake)) {
      throw new Error("Car make can only contain letters, numbers, spaces, and hyphens")
    }

    // Check for inappropriate content
    const inappropriateWords = ["test", "fake", "dummy"]
    const lowerMake = trimmedMake.toLowerCase()
    for (const word of inappropriateWords) {
      if (lowerMake.includes(word)) {
        throw new Error("Car make appears to contain placeholder text")
      }
    }
  }

  private validateCarModel(model: string): void {
    if (!model || model.trim().length === 0) {
      throw new Error("Car model is required")
    }

    const trimmedModel = model.trim()

    if (trimmedModel.length < 1) {
      throw new Error("Car model must be at least 1 character long")
    }

    if (trimmedModel.length > 50) {
      throw new Error("Car model cannot be longer than 50 characters")
    }

    // Allow letters, numbers, spaces, hyphens, and common car model characters
    if (!/^[a-zA-Z0-9\s\-./]+$/.test(trimmedModel)) {
      throw new Error("Car model can only contain letters, numbers, spaces, hyphens, periods, and forward slashes")
    }

    // Check for inappropriate content
    const inappropriateWords = ["test", "fake", "dummy"]
    const lowerModel = trimmedModel.toLowerCase()
    for (const word of inappropriateWords) {
      if (lowerModel.includes(word)) {
        throw new Error("Car model appears to contain placeholder text")
      }
    }
  }

  private validateCarColor(color: string): void {
    if (!color || color.trim().length === 0) {
      throw new Error("Car color is required")
    }

    const trimmedColor = color.trim()

    if (trimmedColor.length < 3) {
      throw new Error("Car color must be at least 3 characters long")
    }

    if (trimmedColor.length > 20) {
      throw new Error("Car color cannot be longer than 20 characters")
    }

    // Only allow letters and spaces for colors
    if (!/^[a-zA-Z\s]+$/.test(trimmedColor)) {
      throw new Error("Car color can only contain letters and spaces")
    }

    // Check for numbers
    if (/\d/.test(trimmedColor)) {
      throw new Error("Car color cannot contain numbers")
    }

    // Check for special characters
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(trimmedColor)) {
      throw new Error("Car color cannot contain special characters")
    }

    // Check for inappropriate content
    const inappropriateWords = ["test", "fake", "dummy"]
    const lowerColor = trimmedColor.toLowerCase()
    for (const word of inappropriateWords) {
      if (lowerColor.includes(word)) {
        throw new Error("Car color appears to contain placeholder text")
      }
    }
  }

  private validateRegistrationNumber(registration: string): void {
    if (!registration || registration.trim().length === 0) {
      throw new Error("Registration number is required")
    }

    const trimmedReg = registration.trim().toUpperCase()

    // South African registration format: ABC 123 GP or ABC123GP
    const saRegexOld = /^[A-Z]{2,3}\s?\d{3,4}\s?[A-Z]{2}$/
    const saRegexNew = /^[A-Z]{1,2}\s?\d{2,3}\s?[A-Z]{2,3}\s?GP$/

    if (!saRegexOld.test(trimmedReg) && !saRegexNew.test(trimmedReg)) {
      throw new Error("Registration number must be in valid South African format (e.g., ABC 123 GP)")
    }

    if (trimmedReg.length > 10) {
      throw new Error("Registration number cannot be longer than 10 characters")
    }

    // Check for inappropriate patterns
    if (/^(.)\1+$/.test(trimmedReg.replace(/\s/g, ""))) {
      throw new Error("Registration number cannot be all the same character")
    }

    // Check for inappropriate content
    const inappropriateWords = ["TEST", "FAKE", "DUMMY"]
    for (const word of inappropriateWords) {
      if (trimmedReg.includes(word)) {
        throw new Error("Registration number appears to contain placeholder text")
      }
    }
  }

  private validateVinNumber(vinNumber: string): void {
    if (!vinNumber || vinNumber.trim().length === 0) {
      throw new Error("VIN number is required")
    }

    const trimmedVin = vinNumber.trim().toUpperCase()

    // VIN must be exactly 17 characters
    if (trimmedVin.length !== 17) {
      throw new Error("VIN number must be exactly 17 characters long")
    }

    // VIN can only contain letters and numbers (no I, O, Q)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(trimmedVin)) {
      throw new Error("VIN number can only contain letters and numbers (cannot contain I, O, or Q)")
    }

    // Check for obviously fake VINs
    if (/^(.)\1{16}$/.test(trimmedVin)) {
      throw new Error("VIN number cannot be all the same character")
    }

    // Check for inappropriate patterns
    const inappropriatePatterns = ["12345", "ABCDE", "00000", "AAAAA"]
    for (const pattern of inappropriatePatterns) {
      if (trimmedVin.includes(pattern)) {
        throw new Error("VIN number appears to contain invalid sequential or repeated patterns")
      }
    }

    // Check 9th digit (check digit) - basic validation
    const ninthDigit = trimmedVin.charAt(8)
    if (!/[0-9X]/.test(ninthDigit)) {
      throw new Error("VIN number 9th digit must be a number (0-9) or X")
    }
  }
}

// Exception handling utilities with all registration exceptions
export class ProfileUpdateException extends Error {
  public field?: string
  public code?: string
  public details?: any

  constructor(message: string, field?: string, code?: string, details?: any) {
    super(message)
    this.name = "ProfileUpdateException"
    this.field = field
    this.code = code
    this.details = details
  }
}

// Enhanced error recovery utilities
export class ErrorRecovery {
  static sanitizeInput(input: string, type: "name" | "phone" | "address" | "general" = "general"): string {
    if (!input) return ""

    let sanitized = input.trim()

    switch (type) {
      case "name":
        // Remove numbers and special characters, keep only letters and spaces
        sanitized = sanitized.replace(/[^a-zA-Z\s]/g, "")
        // Remove multiple spaces
        sanitized = sanitized.replace(/\s+/g, " ")
        // Ensure minimum 3 characters
        if (sanitized.length < 3) {
          return ""
        }
        break

      case "phone":
        // Keep only digits
        sanitized = sanitized.replace(/\D/g, "")
        // Ensure it starts with 06, 07, or 08 if 10 digits
        if (sanitized.length === 10) {
          if (!sanitized.startsWith("06") && !sanitized.startsWith("07") && !sanitized.startsWith("08")) {
            return ""
          }
        }
        break

      case "address":
        // Keep letters, numbers, spaces, and common address characters
        sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-'.,()#/]/g, "")
        // Ensure minimum 10 characters
        if (sanitized.length < 10) {
          return ""
        }
        break

      default:
        // General sanitization - remove control characters
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "")
    }

    return sanitized
  }

  static recoverFromValidationError(error: any, field: string, value: string): string {
    console.warn(`Validation error for ${field}:`, error.message)

    // Attempt to auto-correct common issues based on registration validation rules
    switch (field) {
      case "phoneNumber":
        // Try to fix phone number format (must start with 06, 07, or 08)
        let cleaned = value.replace(/\D/g, "")
        if (cleaned.length === 9 && (cleaned.startsWith("6") || cleaned.startsWith("7") || cleaned.startsWith("8"))) {
          cleaned = "0" + cleaned
        }
        if (
          cleaned.length === 10 &&
          (cleaned.startsWith("06") || cleaned.startsWith("07") || cleaned.startsWith("08"))
        ) {
          return cleaned
        }
        return ""

      case "name":
      case "surname":
      case "childName":
      case "childSurname":
        // Remove invalid characters from names and ensure minimum 3 characters
        const cleanedName = this.sanitizeInput(value, "name")
        return cleanedName.length >= 3 ? cleanedName : ""

      case "email":
        // Ensure Gmail domain
        const cleanedEmail = value.trim().toLowerCase()
        if (!cleanedEmail.endsWith("@gmail.com") && cleanedEmail.includes("@")) {
          return cleanedEmail.split("@")[0] + "@gmail.com"
        }
        return cleanedEmail

      default:
        return this.sanitizeInput(value)
    }
  }
}

// Create singleton instance
export const enhancedProfileValidator = new EnhancedProfileValidator()
