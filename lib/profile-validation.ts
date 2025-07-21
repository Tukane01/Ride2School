// Enhanced validation library for user profile editing
import { validateName, validatePhoneNumber, validateSouthAfricanID, validateEmail } from "./enhanced-validation"

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  field?: string
}

export interface ProfileValidationErrors {
  [key: string]: string[]
}

// Profile validation class with comprehensive error handling
export class ProfileValidator {
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

  // Validate personal information
  validatePersonalInfo(data: {
    name?: string
    surname?: string
    phoneNumber?: string
    address?: string
    gender?: string
    email?: string
    idNumber?: string
  }): ValidationResult {
    this.clearErrors()

    try {
      // Validate name
      if (data.name !== undefined) {
        try {
          validateName(data.name, "First Name")
        } catch (error: any) {
          this.addError("name", error.message)
        }
      }

      // Validate surname
      if (data.surname !== undefined) {
        try {
          validateName(data.surname, "Surname")
        } catch (error: any) {
          this.addError("surname", error.message)
        }
      }

      // Validate phone number
      if (data.phoneNumber !== undefined) {
        try {
          validatePhoneNumber(data.phoneNumber)
        } catch (error: any) {
          this.addError("phoneNumber", error.message)
        }
      }

      // Validate address
      if (data.address !== undefined) {
        try {
          this.validateAddress(data.address)
        } catch (error: any) {
          this.addError("address", error.message)
        }
      }

      // Validate gender
      if (data.gender !== undefined) {
        try {
          this.validateGender(data.gender)
        } catch (error: any) {
          this.addError("gender", error.message)
        }
      }

      // Validate email (read-only, but check format)
      if (data.email !== undefined) {
        try {
          validateEmail(data.email)
        } catch (error: any) {
          this.addWarning("email", "Email format may be invalid, but cannot be changed")
        }
      }

      // Validate ID number (read-only, but check format)
      if (data.idNumber !== undefined) {
        try {
          validateSouthAfricanID(data.idNumber, data.gender)
        } catch (error: any) {
          this.addWarning("idNumber", "ID number format may be invalid, but cannot be changed")
        }
      }
    } catch (error: any) {
      this.addError("general", `Validation failed: ${error.message}`)
    }

    return {
      isValid: !this.hasErrors(),
      errors: Object.values(this.errors).flat(),
      warnings: Object.values(this.warnings).flat(),
    }
  }

  // Validate child information
  validateChildInfo(data: {
    name?: string
    surname?: string
    idNumber?: string
    schoolName?: string
    schoolAddress?: string
  }): ValidationResult {
    this.clearErrors()

    try {
      // Validate child name
      if (data.name !== undefined) {
        try {
          validateName(data.name, "Child's First Name")
        } catch (error: any) {
          this.addError("childName", error.message)
        }
      }

      // Validate child surname
      if (data.surname !== undefined) {
        try {
          validateName(data.surname, "Child's Surname")
        } catch (error: any) {
          this.addError("childSurname", error.message)
        }
      }

      // Validate child ID number
      if (data.idNumber !== undefined) {
        try {
          const validation = validateSouthAfricanID(data.idNumber)

          // Check if child is of appropriate age (4-18 years)
          if (validation.age > 18) {
            this.addError("childIdNumber", "Child must not be older than 18 years")
          } else if (validation.age < 4) {
            this.addError("childIdNumber", "Child must not be younger than 4 years")
          }
        } catch (error: any) {
          this.addError("childIdNumber", error.message)
        }
      }

      // Validate school name
      if (data.schoolName !== undefined) {
        try {
          this.validateSchoolName(data.schoolName)
        } catch (error: any) {
          this.addError("schoolName", error.message)
        }
      }

      // Validate school address
      if (data.schoolAddress !== undefined) {
        try {
          this.validateAddress(data.schoolAddress, "School address")
        } catch (error: any) {
          this.addError("schoolAddress", error.message)
        }
      }
    } catch (error: any) {
      this.addError("general", `Child validation failed: ${error.message}`)
    }

    return {
      isValid: !this.hasErrors(),
      errors: Object.values(this.errors).flat(),
      warnings: Object.values(this.warnings).flat(),
    }
  }

  // Validate vehicle information
  validateVehicleInfo(data: {
    make?: string
    model?: string
    color?: string
    registration?: string
    vinNumber?: string
  }): ValidationResult {
    this.clearErrors()

    try {
      // Validate car make
      if (data.make !== undefined) {
        try {
          this.validateCarMake(data.make)
        } catch (error: any) {
          this.addError("carMake", error.message)
        }
      }

      // Validate car model
      if (data.model !== undefined) {
        try {
          this.validateCarModel(data.model)
        } catch (error: any) {
          this.addError("carModel", error.message)
        }
      }

      // Validate car color
      if (data.color !== undefined) {
        try {
          this.validateCarColor(data.color)
        } catch (error: any) {
          this.addError("carColor", error.message)
        }
      }

      // Validate registration number
      if (data.registration !== undefined) {
        try {
          this.validateRegistrationNumber(data.registration)
        } catch (error: any) {
          this.addError("carRegistration", error.message)
        }
      }

      // Validate VIN number
      if (data.vinNumber !== undefined) {
        try {
          this.validateVinNumber(data.vinNumber)
        } catch (error: any) {
          this.addError("carVinNumber", error.message)
        }
      }
    } catch (error: any) {
      this.addError("general", `Vehicle validation failed: ${error.message}`)
    }

    return {
      isValid: !this.hasErrors(),
      errors: Object.values(this.errors).flat(),
      warnings: Object.values(this.warnings).flat(),
    }
  }

  // Private validation methods
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

    // Allow letters, numbers, spaces, and hyphens
    if (!/^[a-zA-Z0-9\s-]+$/.test(trimmedMake)) {
      throw new Error("Car make contains invalid characters")
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
      throw new Error("Car model contains invalid characters")
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
      throw new Error("VIN number contains invalid characters (cannot contain I, O, or Q)")
    }

    // Check for obviously fake VINs
    if (/^(.)\1{16}$/.test(trimmedVin)) {
      throw new Error("VIN number cannot be all the same character")
    }
  }
}

// Exception handling utilities
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

// Error recovery utilities
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
        break

      case "phone":
        // Keep only digits
        sanitized = sanitized.replace(/\D/g, "")
        break

      case "address":
        // Keep letters, numbers, spaces, and common address characters
        sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-'.,()#]/g, "")
        break

      default:
        // General sanitization - remove control characters
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "")
    }

    return sanitized
  }

  static recoverFromValidationError(error: any, field: string, value: string): string {
    console.warn(`Validation error for ${field}:`, error.message)

    // Attempt to auto-correct common issues
    switch (field) {
      case "phoneNumber":
        // Try to fix phone number format
        let cleaned = value.replace(/\D/g, "")
        if (cleaned.length === 10 && !cleaned.startsWith("0")) {
          cleaned = "0" + cleaned
        }
        return cleaned

      case "name":
      case "surname":
      case "childName":
      case "childSurname":
        // Remove invalid characters from names
        return this.sanitizeInput(value, "name")

      default:
        return this.sanitizeInput(value)
    }
  }
}

// Create singleton instance
export const profileValidator = new ProfileValidator()
