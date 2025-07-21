// Enhanced validation functions for the school ride application

// Enhanced name validation with strict alphabetic rules
export function validateName(name: string, fieldName = "Name") {
  // Check if name exists and is not empty
  if (!name || name.trim().length === 0) {
    throw new Error(`${fieldName} is required`)
  }

  const trimmedName = name.trim()

  // Check minimum length - changed from 2 to 3 characters
  if (trimmedName.length < 3) {
    throw new Error(`${fieldName} must be at least 3 characters long`)
  }

  // Check maximum length
  if (trimmedName.length > 30) {
    throw new Error(`${fieldName} cannot be longer than 30 characters`)
  }

  // Check if name contains only alphabetic characters and spaces
  if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
    throw new Error(`${fieldName} can only contain alphabetic characters and spaces`)
  }

  // Check for numbers, symbols, or special characters
  if (/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(trimmedName)) {
    throw new Error(`${fieldName} cannot contain numbers, symbols, or special characters`)
  }

  // Check for three consecutive vowels
  const vowelPattern = /[aeiouAEIOU]{3,}/
  if (vowelPattern.test(trimmedName)) {
    throw new Error(`${fieldName} cannot contain three consecutive vowels`)
  }

  // Check for same character repeated three times in a row
  const repeatedCharPattern = /(.)\1{2,}/
  if (repeatedCharPattern.test(trimmedName)) {
    throw new Error(`${fieldName} cannot contain the same character repeated three times in a row`)
  }

  // Check for multiple consecutive spaces
  if (/\s{2,}/.test(trimmedName)) {
    throw new Error(`${fieldName} cannot contain multiple consecutive spaces`)
  }

  // Check if name starts or ends with space
  if (trimmedName !== name.trim()) {
    throw new Error(`${fieldName} cannot start or end with spaces`)
  }

  return true
}

// Enhanced password validation - no whitespace allowed
export function validatePassword(password: string) {
  // Check if password exists
  if (!password) {
    throw new Error("Password is required")
  }

  // Check minimum length
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long")
  }

  // Check maximum length
  if (password.length > 128) {
    throw new Error("Password cannot be longer than 128 characters")
  }

  // Check for any whitespace characters (spaces, tabs, line breaks, etc.)
  if (/\s/.test(password)) {
    throw new Error("Password cannot contain any whitespace characters (spaces, tabs, line breaks)")
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    throw new Error("Password must contain at least one uppercase letter")
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    throw new Error("Password must contain at least one lowercase letter")
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    throw new Error("Password must contain at least one number")
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
    throw new Error("Password must contain at least one special character")
  }

  return true
}

// Enhanced phone number validation - must start with 06, 07, or 08
export function validatePhoneNumber(phoneNumber: string) {
  // Check if phone number exists
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    throw new Error("Phone number is required")
  }

  const cleanedNumber = phoneNumber.trim()

  // Check if phone number is exactly 10 digits
  if (!/^\d{10}$/.test(cleanedNumber)) {
    throw new Error("Phone number must be exactly 10 digits")
  }

  // Check if phone number starts with 06, 07, or 08
  if (!cleanedNumber.startsWith("06") && !cleanedNumber.startsWith("07") && !cleanedNumber.startsWith("08")) {
    throw new Error("Phone number must start with 06, 07, or 08")
  }

  return true
}

// Enhanced South African ID validation with strict structure validation and age requirements
export function validateSouthAfricanID(idNumber: string, expectedGender?: string, userType?: string) {
  // Check if ID number exists
  if (!idNumber || idNumber.trim().length === 0) {
    throw new Error("ID number is required")
  }

  const cleanedId = idNumber.trim()

  // Check if ID number is exactly 13 digits
  if (!/^\d{13}$/.test(cleanedId)) {
    throw new Error("ID number must be exactly 13 digits")
  }

  // Extract components
  const year = Number.parseInt(cleanedId.substring(0, 2))
  const month = Number.parseInt(cleanedId.substring(2, 4))
  const day = Number.parseInt(cleanedId.substring(4, 6))
  const genderDigits = cleanedId.substring(6, 10)
  const lastThreeDigits = cleanedId.substring(10, 13)

  // Validate date of birth (first 6 digits - YYMMDD)
  if (month < 1 || month > 12) {
    throw new Error("Invalid month in ID number (must be 01-12)")
  }

  if (day < 1 || day > 31) {
    throw new Error("Invalid day in ID number (must be 01-31)")
  }

  // More specific date validation
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (day > daysInMonth[month - 1]) {
    throw new Error(`Invalid day for month ${month.toString().padStart(2, "0")}`)
  }

  // Validate gender digits (positions 7-10)
  const genderNumber = Number.parseInt(genderDigits)

  // Female: 0000-4999, Male: 5000-9999
  const detectedGender = genderNumber < 5000 ? "female" : "male"

  if (expectedGender && expectedGender !== detectedGender) {
    throw new Error(`ID number indicates ${detectedGender} but ${expectedGender} was expected`)
  }

  // Validate last 3 digits cannot be '000'
  if (lastThreeDigits === "000") {
    throw new Error("The last 3 digits of ID number cannot be '000'")
  }

  // Additional validation: Check if the date is reasonable
  const currentYear = new Date().getFullYear() % 100
  const century = year <= currentYear ? 2000 : 1900
  const fullYear = century + year
  const birthDate = new Date(fullYear, month - 1, day)

  if (birthDate > new Date()) {
    throw new Error("Birth date cannot be in the future")
  }

  const age = new Date().getFullYear() - fullYear
  if (age > 120) {
    throw new Error("Age cannot be more than 120 years")
  }

  // Age validation based on user type
  if (userType === "driver") {
    if (age < 18) {
      throw new Error("Driver must be at least 18 years old to register")
    }
    if (age > 70) {
      throw new Error("Driver must be 70 years old or younger to register")
    }
  } else if (userType === "parent") {
    if (age < 15) {
      throw new Error("Parent must be at least 15 years old to register")
    }
    if (age > 70) {
      throw new Error("Parent must be 70 years old or younger to register")
    }
  }

  return {
    isValid: true,
    dateOfBirth: `${fullYear}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
    gender: detectedGender,
    age: age,
  }
}

// Enhanced email validation
export function validateEmail(email: string) {
  // Check if email exists
  if (!email || email.trim().length === 0) {
    throw new Error("Email address is required")
  }

  const cleanedEmail = email.trim().toLowerCase()

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(cleanedEmail)) {
    throw new Error("Please enter a valid email address")
  }

  // Check if it's a Gmail address
  if (!cleanedEmail.endsWith("@gmail.com")) {
    throw new Error("Email must be a Gmail address (@gmail.com)")
  }

  // Check if it contains more than 3 numbers
  const numbers = cleanedEmail.match(/\d/g)
  if (numbers && numbers.length > 3) {
    throw new Error("Email cannot contain more than 3 numbers")
  }

  // Check for consecutive dots
  if (cleanedEmail.includes("..")) {
    throw new Error("Email cannot contain consecutive dots")
  }

  return true
}

// Enhanced child age validation with new requirements
export function validateChildAge(idNumber: string) {
  try {
    const validation = validateSouthAfricanID(idNumber)
    const age = validation.age

    if (age > 18) {
      throw new Error("Child must not be older than 18 years")
    }

    if (age < 5) {
      throw new Error("Child must not be younger than 5 years")
    }

    return true
  } catch (error: any) {
    throw new Error(`Invalid child ID: ${error.message}`)
  }
}

// Utility function to validate all name fields
export function validateAllNameFields(formData: any) {
  const nameFields = [
    { field: "name", label: "First Name" },
    { field: "surname", label: "Surname" },
    { field: "childName", label: "Child's First Name" },
    { field: "childSurname", label: "Child's Surname" },
  ]

  for (const { field, label } of nameFields) {
    if (formData[field] && formData[field].trim().length > 0) {
      validateName(formData[field], label)
    }
  }

  return true
}
