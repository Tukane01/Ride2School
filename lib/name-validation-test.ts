// Test suite for name validation with 3+ character requirement
import { validateName } from "./enhanced-validation"

export function testNameValidation() {
  const testCases = [
    // Valid names (should pass)
    { name: "John", field: "First Name", shouldPass: true },
    { name: "Jane", field: "First Name", shouldPass: true },
    { name: "Alexander", field: "First Name", shouldPass: true },
    { name: "Mary Jane", field: "First Name", shouldPass: true },
    { name: "Van Der Merwe", field: "Surname", shouldPass: true },

    // Invalid names - too short (should fail)
    { name: "Jo", field: "First Name", shouldPass: false, expectedError: "must be at least 3 characters" },
    { name: "Li", field: "Surname", shouldPass: false, expectedError: "must be at least 3 characters" },
    { name: "A", field: "Child's First Name", shouldPass: false, expectedError: "must be at least 3 characters" },
    { name: "Bo", field: "Child's Surname", shouldPass: false, expectedError: "must be at least 3 characters" },

    // Invalid names - empty (should fail)
    { name: "", field: "First Name", shouldPass: false, expectedError: "is required" },
    { name: "   ", field: "Surname", shouldPass: false, expectedError: "is required" },

    // Invalid names - numbers and symbols (should fail)
    { name: "John123", field: "First Name", shouldPass: false, expectedError: "cannot contain numbers" },
    { name: "Jane@", field: "Surname", shouldPass: false, expectedError: "cannot contain" },
    { name: "Mary#Jane", field: "Child's First Name", shouldPass: false, expectedError: "cannot contain" },

    // Invalid names - three consecutive vowels (should fail)
    { name: "Jaeio", field: "First Name", shouldPass: false, expectedError: "consecutive vowels" },
    { name: "Beauu", field: "Surname", shouldPass: false, expectedError: "consecutive vowels" },

    // Invalid names - repeated characters (should fail)
    { name: "Jaaane", field: "First Name", shouldPass: false, expectedError: "repeated three times" },
    { name: "Smmith", field: "Surname", shouldPass: false, expectedError: "repeated three times" },

    // Edge cases
    { name: "Ann", field: "First Name", shouldPass: true }, // Exactly 3 characters
    { name: "Lee", field: "Surname", shouldPass: true }, // Exactly 3 characters
    { name: "O'Connor", field: "Surname", shouldPass: false }, // Contains apostrophe
    { name: "Van Wyk", field: "Surname", shouldPass: true }, // Valid compound name
  ]

  const results = {
    passed: 0,
    failed: 0,
    errors: [] as string[],
  }

  console.log("🧪 Testing Name Validation with 3+ Character Requirement")
  console.log("=".repeat(60))

  testCases.forEach((testCase, index) => {
    try {
      validateName(testCase.name, testCase.field)

      if (testCase.shouldPass) {
        console.log(`✅ Test ${index + 1}: PASS - "${testCase.name}" (${testCase.field})`)
        results.passed++
      } else {
        console.log(`❌ Test ${index + 1}: FAIL - "${testCase.name}" should have failed but passed`)
        results.failed++
        results.errors.push(`Test ${index + 1}: Expected failure but validation passed`)
      }
    } catch (error: any) {
      if (!testCase.shouldPass) {
        const errorMatches = testCase.expectedError
          ? error.message.toLowerCase().includes(testCase.expectedError.toLowerCase())
          : true

        if (errorMatches) {
          console.log(`✅ Test ${index + 1}: PASS - "${testCase.name}" correctly failed: ${error.message}`)
          results.passed++
        } else {
          console.log(
            `❌ Test ${index + 1}: FAIL - Wrong error message. Expected: "${testCase.expectedError}", Got: "${error.message}"`,
          )
          results.failed++
          results.errors.push(`Test ${index + 1}: Wrong error message`)
        }
      } else {
        console.log(`❌ Test ${index + 1}: FAIL - "${testCase.name}" should have passed but failed: ${error.message}`)
        results.failed++
        results.errors.push(`Test ${index + 1}: Unexpected validation failure`)
      }
    }
  })

  console.log("=".repeat(60))
  console.log(`📊 Test Results: ${results.passed} passed, ${results.failed} failed`)

  if (results.errors.length > 0) {
    console.log("\n🚨 Errors:")
    results.errors.forEach((error) => console.log(`   - ${error}`))
  }

  return results
}

// Helper function to validate all name fields in a form
export function validateAllNameFieldsWithMinLength(formData: any) {
  const nameFields = [
    { field: "name", label: "First Name", value: formData.name },
    { field: "surname", label: "Surname", value: formData.surname },
    { field: "childName", label: "Child's First Name", value: formData.childName },
    { field: "childSurname", label: "Child's Surname", value: formData.childSurname },
  ]

  const errors: { [key: string]: string } = {}

  for (const { field, label, value } of nameFields) {
    if (value && value.trim().length > 0) {
      try {
        validateName(value, label)
      } catch (error: any) {
        errors[field] = error.message
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new Error(`Name validation failed: ${JSON.stringify(errors)}`)
  }

  return true
}
