// Comprehensive profile validation with ALL registration form exceptions
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

// Comprehensive Profile Validator with ALL registration exceptions
export class ComprehensiveProfileValidator {
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

  // Validate personal information with ALL registration exceptions
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
      // Validate name with ALL registration exceptions (3+ chars, alphabetic only, etc.)
      if (data.name !== undefined && data.name.trim() !== "") {
        try {
          validateName(data.name, "First Name")
        } catch (error: any) {
          this.addError("name", error.message)
        }
      }

      // Validate surname with ALL registration exceptions
      if (data.surname !== undefined && data.surname.trim() !== "") {
        try {
          validateName(data.surname, "Surname")
        } catch (error: any) {
          this.addError("surname", error.message)
        }
      }

      // Validate phone number with ALL registration exceptions (must start with 06/07/08)
      if (data.phoneNumber !== undefined && data.phoneNumber.trim() !== "") {
        try {
          validatePhoneNumber(data.phoneNumber)
        } catch (error: any) {
          this.addError("phoneNumber", error.message)
        }
      }

      // Validate address with ALL registration exceptions
      if (data.address !== undefined && data.address.trim() !== "") {
        try {
          this.validateAddress(data.address)
        } catch (error: any) {
          this.addError("address", error.message)
        }
      }

      // Validate gender with ALL registration exceptions
      if (data.gender !== undefined && data.gender.trim() !== "") {
        try {
          this.validateGender(data.gender)
        } catch (error: any) {
          this.addError("gender", error.message)
        }
      }

      // Validate email with ALL registration exceptions (Gmail only, max 3 numbers, etc.)
      if (data.email !== undefined && data.email.trim() !== "") {
        try {
          validateEmail(data.email)
        } catch (error: any) {
          this.addError("email", error.message)
        }
      }

      // Validate ID number with ALL registration exceptions (13 digits, date validation, etc.)
      if (data.idNumber !== undefined && data.idNumber.trim() !== "") {
        try {
          validateSouthAfricanID(data.idNumber, data.gender)
        } catch (error: any) {
          this.addError("idNumber", error.message)
        }
      }

      // Validate password with ALL registration exceptions (no whitespace, special chars, etc.)
      if (data.password !== undefined && data.password.trim() !== "") {
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

  // Validate child information with ALL registration validations
  validateChildInfo(data: {
    name?: string
    surname?: string
    idNumber?: string
    schoolName?: string
    schoolAddress?: string
  }): ValidationResult {
    this.clearErrors()

    try {
      // Validate child name with ALL registration exceptions (3+ chars, alphabetic only, etc.)
      if (data.name !== undefined && data.name.trim() !== "") {
        try {
          validateName(data.name, "Child's First Name")
        } catch (error: any) {
          this.addError("childName", error.message)
        }
      }

      // Validate child surname with ALL registration exceptions
      if (data.surname !== undefined && data.surname.trim() !== "") {
        try {
          validateName(data.surname, "Child's Surname")
        } catch (error: any) {
          this.addError("childSurname", error.message)
        }
      }

      // Validate child ID number with ALL registration exceptions (age 4-18, 13 digits, etc.)
      if (data.idNumber !== undefined && data.idNumber.trim() !== "") {
        try {
          validateChildAge(data.idNumber)
        } catch (error: any) {
          this.addError("childIdNumber", error.message)
        }
      }

      // Validate school name with ALL registration exceptions
      if (data.schoolName !== undefined && data.schoolName.trim() !== "") {
        try {
          this.validateSchoolName(data.schoolName)
        } catch (error: any) {
          this.addError("schoolName", error.message)
        }
      }

      // Validate school address with ALL registration exceptions
      if (data.schoolAddress !== undefined && data.schoolAddress.trim() !== "") {
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

  // Validate vehicle information with ALL registration validations
  validateVehicleInfo(data: {
    make?: string
    model?: string
    color?: string
    registration?: string
    vinNumber?: string
  }): ValidationResult {
    this.clearErrors()

    try {
      // Validate car make with ALL registration exceptions
      if (data.make !== undefined && data.make.trim() !== "") {
        try {
          this.validateCarMake(data.make)
        } catch (error: any) {
          this.addError("carMake", error.message)
        }
      }

      // Validate car model with ALL registration exceptions
      if (data.model !== undefined && data.model.trim() !== "") {
        try {
          this.validateCarModel(data.model)
        } catch (error: any) {
          this.addError("carModel", error.message)
        }
      }

      // Validate car color with ALL registration exceptions
      if (data.color !== undefined && data.color.trim() !== "") {
        try {
          this.validateCarColor(data.color)
        } catch (error: any) {
          this.addError("carColor", error.message)
        }
      }

      // Validate registration number with ALL registration exceptions
      if (data.registration !== undefined && data.registration.trim() !== "") {
        try {
          this.validateRegistrationNumber(data.registration)
        } catch (error: any) {
          this.addError("carRegistration", error.message)
        }
      }

      // Validate VIN number with ALL registration exceptions
      if (data.vinNumber !== undefined && data.vinNumber.trim() !== "") {
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

  // Private validation methods with ALL registration exceptions
  private validateAddress(address: string, fieldName = "Address"): void {
    if (!address || address.trim().length === 0) {
      throw new Error(`${fieldName} is required`)
    }

    const trimmedAddress = address.trim()

    // Minimum length validation (from registration)
    if (trimmedAddress.length < 10) {
      throw new Error(`${fieldName} must be at least 10 characters long`)
    }

    // Maximum length validation
    if (trimmedAddress.length > 200) {
      throw new Error(`${fieldName} cannot be longer than 200 characters`)
    }

    // Check for valid address format (should contain some numbers and letters)
    if (!/\d/.test(trimmedAddress)) {
      this.addWarning("address", `${fieldName} should typically contain a street number`)
    }

    // Check for inappropriate content (from registration)
    const inappropriateWords = ["test", "fake", "dummy", "example", "placeholder"]
    const lowerAddress = trimmedAddress.toLowerCase()
    for (const word of inappropriateWords) {
      if (lowerAddress.includes(word)) {
        throw new Error(`${fieldName} appears to contain placeholder text`)
      }
    }

    // Check for special characters that aren't allowed in addresses (from registration)
    if (!/^[a-zA-Z0-9\s\-'.,()#/]+$/.test(trimmedAddress)) {
      throw new Error(
        `${fieldName} contains invalid characters. Only letters, numbers, spaces, and common punctuation allowed`,
      )
    }

    // Check for repeated characters (from registration)
    if (/(.)\1{4,}/.test(trimmedAddress.replace(/\s/g, ""))) {
      throw new Error(`${fieldName} cannot contain more than 4 consecutive identical characters`)
    }
  }

  private validateGender(gender: string): void {
    const validGenders = ["male", "female", "other"]
    if (!validGenders.includes(gender.toLowerCase())) {
      throw new Error("Please select a valid gender option (Male, Female, or Other)")
    }
  }

  private validateSchoolName(schoolName: string): void {
    if (!schoolName || schoolName.trim().length === 0) {
      throw new Error("School name is required")
    }

    const trimmedName = schoolName.trim()

    // Length validations (from registration)
    if (trimmedName.length < 3) {
      throw new Error("School name must be at least 3 characters long")
    }

    if (trimmedName.length > 100) {
      throw new Error("School name cannot be longer than 100 characters")
    }

    // Allow letters, numbers, spaces, and common school-related characters (from registration)
    if (!/^[a-zA-Z0-9\s\-'.,()&]+$/.test(trimmedName)) {
      throw new Error(
        "School name contains invalid characters. Only letters, numbers, spaces, and common punctuation allowed",
      )
    }

    // Check for inappropriate content (from registration)
    const inappropriateWords = ["test", "fake", "dummy", "placeholder", "example"]
    const lowerName = trimmedName.toLowerCase()
    for (const word of inappropriateWords) {
      if (lowerName.includes(word)) {
        throw new Error("School name appears to contain placeholder text")
      }
    }

    // Check for numbers at the start (schools shouldn't start with numbers) (from registration)
    if (/^\d/.test(trimmedName)) {
      throw new Error("School name cannot start with a number")
    }

    // Check for repeated characters (from registration)
    if (/(.)\1{3,}/.test(trimmedName.replace(/\s/g, ""))) {
      throw new Error("School name cannot contain more than 3 consecutive identical characters")
    }
  }

  private validateCarMake(make: string): void {
    if (!make || make.trim().length === 0) {
      throw new Error("Car make is required")
    }

    const trimmedMake = make.trim()

    // Length validations (from registration)
    if (trimmedMake.length < 2) {
      throw new Error("Car make must be at least 2 characters long")
    }

    if (trimmedMake.length > 30) {
      throw new Error("Car make cannot be longer than 30 characters")
    }

    // Allow letters, numbers, spaces, and hyphens only (from registration)
    if (!/^[a-zA-Z0-9\s-]+$/.test(trimmedMake)) {
      throw new Error("Car make can only contain letters, numbers, spaces, and hyphens")
    }

    // Check for inappropriate content (from registration)
    const inappropriateWords = ["test", "fake", "dummy", "placeholder", "example"]
    const lowerMake = trimmedMake.toLowerCase()
    for (const word of inappropriateWords) {
      if (lowerMake.includes(word)) {
        throw new Error("Car make appears to contain placeholder text")
      }
    }

    // Check for repeated characters (from registration)
    if (/(.)\1{3,}/.test(trimmedMake.replace(/\s/g, ""))) {
      throw new Error("Car make cannot contain more than 3 consecutive identical characters")
    }

    // Check for numbers only (from registration)
    if (/^\d+$/.test(trimmedMake)) {
      throw new Error("Car make cannot be only numbers")
    }
  }

  private validateCarModel(model: string): void {
    if (!model || model.trim().length === 0) {
      throw new Error("Car model is required")
    }

    const trimmedModel = model.trim()

    // Length validations (from registration)
    if (trimmedModel.length < 1) {
      throw new Error("Car model must be at least 1 character long")
    }

    if (trimmedModel.length > 50) {
      throw new Error("Car model cannot be longer than 50 characters")
    }

    // Allow letters, numbers, spaces, hyphens, and common car model characters (from registration)
    if (!/^[a-zA-Z0-9\s\-./]+$/.test(trimmedModel)) {
      throw new Error("Car model can only contain letters, numbers, spaces, hyphens, periods, and forward slashes")
    }

    // Check for inappropriate content (from registration)
    const inappropriateWords = ["test", "fake", "dummy", "placeholder", "example"]
    const lowerModel = trimmedModel.toLowerCase()
    for (const word of inappropriateWords) {
      if (lowerModel.includes(word)) {
        throw new Error("Car model appears to contain placeholder text")
      }
    }

    // Check for repeated characters (from registration)
    if (/(.)\1{4,}/.test(trimmedModel.replace(/\s/g, ""))) {
      throw new Error("Car model cannot contain more than 4 consecutive identical characters")
    }
  }

  private validateCarColor(color: string): void {
    if (!color || color.trim().length === 0) {
      throw new Error("Car color is required")
    }

    const trimmedColor = color.trim()

    // Length validations (from registration)
    if (trimmedColor.length < 3) {
      throw new Error("Car color must be at least 3 characters long")
    }

    if (trimmedColor.length > 20) {
      throw new Error("Car color cannot be longer than 20 characters")
    }

    // Only allow letters and spaces for colors (from registration)
    if (!/^[a-zA-Z\s]+$/.test(trimmedColor)) {
      throw new Error("Car color can only contain letters and spaces")
    }

    // Check for numbers (from registration)
    if (/\d/.test(trimmedColor)) {
      throw new Error("Car color cannot contain numbers")
    }

    // Check for special characters (from registration)
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(trimmedColor)) {
      throw new Error("Car color cannot contain special characters")
    }

    // Check for inappropriate content (from registration)
    const inappropriateWords = ["test", "fake", "dummy", "placeholder", "example"]
    const lowerColor = trimmedColor.toLowerCase()
    for (const word of inappropriateWords) {
      if (lowerColor.includes(word)) {
        throw new Error("Car color appears to contain placeholder text")
      }
    }

    // Check for repeated characters (from registration)
    if (/(.)\1{2,}/.test(trimmedColor.replace(/\s/g, ""))) {
      throw new Error("Car color cannot contain more than 2 consecutive identical characters")
    }

    // Check for single character colors (from registration)
    if (trimmedColor.replace(/\s/g, "").length < 3) {
      throw new Error("Car color must contain at least 3 letters")
    }
  }

  private validateRegistrationNumber(registration: string): void {
    if (!registration || registration.trim().length === 0) {
      throw new Error("Registration number is required")
    }

    const trimmedReg = registration.trim().toUpperCase()

    // South African registration format validation (from registration)
    const saRegexOld = /^[A-Z]{2,3}\s?\d{3,4}\s?[A-Z]{2}$/
    const saRegexNew = /^[A-Z]{1,2}\s?\d{2,3}\s?[A-Z]{2,3}\s?GP$/

    if (!saRegexOld.test(trimmedReg) && !saRegexNew.test(trimmedReg)) {
      throw new Error("Registration number must be in valid South African format (e.g., ABC 123 GP or AB 12 CD)")
    }

    // Length validation (from registration)
    if (trimmedReg.length > 10) {
      throw new Error("Registration number cannot be longer than 10 characters")
    }

    if (trimmedReg.length < 6) {
      throw new Error("Registration number cannot be shorter than 6 characters")
    }

    // Check for inappropriate patterns (from registration)
    if (/^(.)\1+$/.test(trimmedReg.replace(/\s/g, ""))) {
      throw new Error("Registration number cannot be all the same character")
    }

    // Check for inappropriate content (from registration)
    const inappropriateWords = ["TEST", "FAKE", "DUMMY", "PLACEHOLDER", "EXAMPLE"]
    for (const word of inappropriateWords) {
      if (trimmedReg.includes(word)) {
        throw new Error("Registration number appears to contain placeholder text")
      }
    }

    // Check for sequential patterns (from registration)
    const sequential = ["123", "ABC", "456", "DEF", "789", "GHI"]
    for (const pattern of sequential) {
      if (trimmedReg.includes(pattern)) {
        throw new Error("Registration number cannot contain obvious sequential patterns")
      }
    }
  }

  private validateVinNumber(vinNumber: string): void {
    if (!vinNumber || vinNumber.trim().length === 0) {
      throw new Error("VIN number is required")
    }

    const trimmedVin = vinNumber.trim().toUpperCase()

    // VIN must be exactly 17 characters (from registration)
    if (trimmedVin.length !== 17) {
      throw new Error("VIN number must be exactly 17 characters long")
    }

    // VIN can only contain letters and numbers (no I, O, Q) (from registration)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(trimmedVin)) {
      throw new Error("VIN number can only contain letters and numbers (cannot contain I, O, or Q)")
    }

    // Check for obviously fake VINs (from registration)
    if (/^(.)\1{16}$/.test(trimmedVin)) {
      throw new Error("VIN number cannot be all the same character")
    }

    // Check for inappropriate patterns (from registration)
    const inappropriatePatterns = ["12345", "ABCDE", "00000", "AAAAA", "11111", "ZZZZZ"]
    for (const pattern of inappropriatePatterns) {
      if (trimmedVin.includes(pattern)) {
        throw new Error("VIN number appears to contain invalid sequential or repeated patterns")
      }
    }

    // Check 9th digit (check digit) - basic validation (from registration)
    const ninthDigit = trimmedVin.charAt(8)
    if (!/[0-9X]/.test(ninthDigit)) {
      throw new Error("VIN number 9th digit must be a number (0-9) or X")
    }

    // Check for placeholder patterns (from registration)
    const placeholderPatterns = ["TEST", "FAKE", "DUMMY", "PLACEHOLDER", "EXAMPLE"]
    for (const pattern of placeholderPatterns) {
      if (trimmedVin.includes(pattern)) {
        throw new Error("VIN number appears to contain placeholder text")
      }
    }

    // Additional VIN format validation (from registration)
    // First character must be a letter or number indicating country
    if (!/[A-HJ-NPR-Z0-9]/.test(trimmedVin.charAt(0))) {
      throw new Error("VIN number first character is invalid")
    }

    // 10th character must be a year code
    const tenthChar = trimmedVin.charAt(9)
    if (!/[A-HJ-NPR-Z0-9]/.test(tenthChar)) {
      throw new Error("VIN number 10th character (year code) is invalid")
    }
  }
}

// Exception handling utilities with ALL registration exceptions
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

// Enhanced error recovery utilities with ALL registration exceptions
export class ErrorRecovery {
  static sanitizeInput(input: string, type: "name" | "phone" | "address" | "general" = "general"): string {
    if (!input) return ""

    let sanitized = input.trim()

    switch (type) {
      case "name":
        // Remove numbers and special characters, keep only letters and spaces (from registration)
        sanitized = sanitized.replace(/[^a-zA-Z\s]/g, "")
        // Remove multiple spaces
        sanitized = sanitized.replace(/\s+/g, " ")
        // Ensure minimum 3 characters
        if (sanitized.length < 3) {
          return ""
        }
        break

      case "phone":
        // Keep only digits (from registration)
        sanitized = sanitized.replace(/\D/g, "")
        // Ensure it starts with 06, 07, or 08 if 10 digits (from registration)
        if (sanitized.length === 10) {
          if (!sanitized.startsWith("06") && !sanitized.startsWith("07") && !sanitized.startsWith("08")) {
            return ""
          }
        }
        // Handle 9-digit numbers that should start with 0
        if (
          sanitized.length === 9 &&
          (sanitized.startsWith("6") || sanitized.startsWith("7") || sanitized.startsWith("8"))
        ) {
          sanitized = "0" + sanitized
        }
        break

      case "address":
        // Keep letters, numbers, spaces, and common address characters (from registration)
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
        // Try to fix phone number format (must start with 06, 07, or 08) (from registration)
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
        // Remove invalid characters from names and ensure minimum 3 characters (from registration)
        const cleanedName = this.sanitizeInput(value, "name")
        return cleanedName.length >= 3 ? cleanedName : ""

      case "email":
        // Ensure Gmail domain (from registration)
        const cleanedEmail = value.trim().toLowerCase()
        if (!cleanedEmail.endsWith("@gmail.com") && cleanedEmail.includes("@")) {
          return cleanedEmail.split("@")[0] + "@gmail.com"
        }
        return cleanedEmail

      case "carRegistration":
        // Try to format registration number (from registration)
        const cleanedReg = value
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
        if (cleanedReg.length >= 6 && cleanedReg.length <= 8) {
          // Try to format as ABC123GP
          const letters1 = cleanedReg.match(/^[A-Z]{2,3}/)?.[0] || ""
          const numbers = cleanedReg.match(/\d{2,4}/)?.[0] || ""
          const letters2 = cleanedReg.match(/[A-Z]{2}$/)?.[0] || ""
          if (letters1 && numbers && letters2) {
            return `${letters1} ${numbers} ${letters2}`
          }
        }
        return cleanedReg

      case "carVinNumber":
        // Clean VIN number (from registration)
        const cleanedVin = value
          .trim()
          .toUpperCase()
          .replace(/[IOQ]/g, "")
          .replace(/[^A-Z0-9]/g, "")
        return cleanedVin.length === 17 ? cleanedVin : ""

      default:
        return this.sanitizeInput(value)
    }
  }
}

// Create singleton instance
export const comprehensiveProfileValidator = new ComprehensiveProfileValidator()
