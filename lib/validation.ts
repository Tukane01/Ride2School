// Validation functions for the application

// Validate South African ID number
export function validateSouthAfricanID(idNumber: string) {
  // Check if ID number is 13 digits
  if (!idNumber || idNumber.length !== 13 || !/^\d+$/.test(idNumber)) {
    throw new Error("ID number must be 13 digits")
  }

  // Extract date components
  const year = Number.parseInt(idNumber.substring(0, 2))
  const month = Number.parseInt(idNumber.substring(2, 4))
  const day = Number.parseInt(idNumber.substring(4, 6))

  // Validate date
  if (month < 1 || month > 12) {
    throw new Error("Invalid month in ID number")
  }

  if (day < 1 || day > 31) {
    throw new Error("Invalid day in ID number")
  }

  return true
}

// Enhanced ID validation function that returns more details
export function validateIdNumber(idNumber: string): { isValid: boolean; dateOfBirth?: string; gender?: string } {
  // Basic validation - must be 13 digits
  if (!/^\d{13}$/.test(idNumber)) {
    return { isValid: false }
  }

  // Extract date of birth
  const year = Number.parseInt(idNumber.substring(0, 2))
  const month = Number.parseInt(idNumber.substring(2, 4))
  const day = Number.parseInt(idNumber.substring(4, 6))

  // Determine century (1900s or 2000s)
  const currentYear = new Date().getFullYear() % 100
  const century = year <= currentYear ? 2000 : 1900
  const fullYear = century + year

  // Validate date
  const date = new Date(fullYear, month - 1, day)
  if (date.getFullYear() !== fullYear || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { isValid: false }
  }

  // Extract gender
  const genderDigit = Number.parseInt(idNumber.substring(6, 7))
  const gender = genderDigit < 5 ? "female" : "male"

  // Format date of birth
  const dateOfBirth = `${fullYear}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`

  return {
    isValid: true,
    dateOfBirth,
    gender,
  }
}

// Validate email
export function validateEmail(email: string) {
  // Basic email validation
  if (!email || !email.includes("@") || !email.includes(".")) {
    throw new Error("Invalid email format")
  }

  // Check if it's a Gmail address
  if (!email.endsWith("@gmail.com")) {
    throw new Error("Email must be a Gmail address")
  }

  // Check if it contains more than 3 numbers
  const numbers = email.match(/\d/g)
  if (numbers && numbers.length > 3) {
    throw new Error("Email cannot contain more than 3 numbers")
  }

  return true
}

// Validate South African phone number
export function validatePhoneNumber(phoneNumber: string) {
  // Check if phone number starts with 0 and is 10 digits
  if (!phoneNumber || !phoneNumber.startsWith("0") || phoneNumber.length !== 10 || !/^\d+$/.test(phoneNumber)) {
    throw new Error("Phone number must start with 0 and be 10 digits")
  }

  return true
}

// Validate name
export function validateName(name: string) {
  // Check if name is at least 3 characters
  if (!name || name.length < 3) {
    throw new Error("Name must be at least 3 characters")
  }

  // Check if name contains numbers
  if (/\d/.test(name)) {
    throw new Error("Name cannot contain numbers")
  }

  // Check if name is too long
  if (name.length > 30) {
    throw new Error("Name cannot be longer than 30 characters")
  }

  return true
}

// Validate child age
export function validateChildAge(idNumber: string) {
  // Extract date components
  const year = Number.parseInt(idNumber.substring(0, 2))
  const birthYear = year < 25 ? 2000 + year : 1900 + year

  const currentYear = new Date().getFullYear()
  const age = currentYear - birthYear

  if (age > 18) {
    throw new Error("Child must not be older than 18 years")
  }

  if (age < 4) {
    throw new Error("Child must not be younger than 4 years")
  }

  return true
}
