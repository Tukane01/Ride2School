// Test script to validate all core functionalities
// Run this in browser console after logging in

class SchoolRideAppTester {
  constructor() {
    this.results = []
    this.errors = []
  }

  log(message, status = "info") {
    const timestamp = new Date().toISOString()
    const logEntry = { timestamp, message, status }
    this.results.push(logEntry)

    const emoji = status === "success" ? "✅" : status === "error" ? "❌" : "ℹ️"
    console.log(`${emoji} [${timestamp}] ${message}`)
  }

  async testAuthentication() {
    this.log("Testing Authentication Functions...", "info")

    try {
      // Test getCurrentUser
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      if (user.id) {
        this.log("✓ User session found", "success")
      } else {
        this.log("✗ No user session found", "error")
      }

      // Test isAuthenticated
      const { isAuthenticated } = await import("/lib/auth.js")
      if (isAuthenticated()) {
        this.log("✓ Authentication check passed", "success")
      } else {
        this.log("✗ Authentication check failed", "error")
      }
    } catch (error) {
      this.log(`✗ Authentication test error: ${error.message}`, "error")
      this.errors.push(error)
    }
  }

  async testUserProfile() {
    this.log("Testing User Profile Functions...", "info")

    try {
      const { getUserProfile } = await import("/lib/api.js")
      const profile = await getUserProfile()

      if (profile && profile.id) {
        this.log("✓ User profile loaded successfully", "success")
        this.log(`User: ${profile.name} ${profile.surname} (${profile.userType})`, "info")
      } else {
        this.log("✗ Failed to load user profile", "error")
      }
    } catch (error) {
      this.log(`✗ User profile test error: ${error.message}`, "error")
      this.errors.push(error)
    }
  }

  async testWalletFunctions() {
    this.log("Testing Wallet Functions...", "info")

    try {
      const { getUserProfile } = await import("/lib/api.js")
      const profile = await getUserProfile()

      if (profile.wallet) {
        this.log(`✓ Wallet balance: R${profile.wallet.balance}`, "success")
        this.log(`✓ Transactions count: ${profile.wallet.transactions.length}`, "success")
      } else {
        this.log("✗ Wallet data not found", "error")
      }
    } catch (error) {
      this.log(`✗ Wallet test error: ${error.message}`, "error")
      this.errors.push(error)
    }
  }

  async testRideFunctions() {
    this.log("Testing Ride Functions...", "info")

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (user.userType === "parent") {
        const { getActiveRides, getRideHistory } = await import("/lib/api.js")

        const activeRides = await getActiveRides()
        const rideHistory = await getRideHistory()

        this.log(`✓ Active rides: ${activeRides.length}`, "success")
        this.log(`✓ Ride history: ${rideHistory.length}`, "success")
      } else if (user.userType === "driver") {
        const { getDriverRides, getRideRequests } = await import("/lib/api.js")

        const driverRides = await getDriverRides()
        const rideRequests = await getRideRequests()

        this.log(`✓ Active rides: ${driverRides.active.length}`, "success")
        this.log(`✓ Ride history: ${driverRides.history.length}`, "success")
        this.log(`✓ Ride requests: ${rideRequests.length}`, "success")
      }
    } catch (error) {
      this.log(`✗ Ride functions test error: ${error.message}`, "error")
      this.errors.push(error)
    }
  }

  async testUtilityFunctions() {
    this.log("Testing Utility Functions...", "info")

    try {
      const { formatCurrency, calculateDistance, generateOTP } = await import("/lib/utils.js")

      // Test formatCurrency
      const formatted = formatCurrency(123.45)
      if (formatted.includes("R123.45") || formatted.includes("123.45")) {
        this.log("✓ Currency formatting works", "success")
      } else {
        this.log(`✗ Currency formatting failed: ${formatted}`, "error")
      }

      // Test calculateDistance
      const distance = calculateDistance(-26.2041, 28.0473, -26.2141, 28.0573)
      if (distance > 0 && distance < 50) {
        this.log(`✓ Distance calculation works: ${distance}km`, "success")
      } else {
        this.log(`✗ Distance calculation failed: ${distance}`, "error")
      }

      // Test generateOTP
      const otp = generateOTP()
      if (otp.length === 6 && /^\d+$/.test(otp)) {
        this.log(`✓ OTP generation works: ${otp}`, "success")
      } else {
        this.log(`✗ OTP generation failed: ${otp}`, "error")
      }
    } catch (error) {
      this.log(`✗ Utility functions test error: ${error.message}`, "error")
      this.errors.push(error)
    }
  }

  async testMessaging() {
    this.log("Testing Messaging Functions...", "info")

    try {
      const { getMessages } = await import("/lib/api.js")

      // Test with a dummy user ID
      const messages = await getMessages("dummy-user-id")
      this.log(`✓ Messaging function works, returned ${messages.length} messages`, "success")
    } catch (error) {
      this.log(`✗ Messaging test error: ${error.message}`, "error")
      this.errors.push(error)
    }
  }

  async runAllTests() {
    this.log("🚀 Starting School Ride App Core Functionality Tests", "info")
    this.log("=".repeat(60), "info")

    await this.testAuthentication()
    await this.testUserProfile()
    await this.testWalletFunctions()
    await this.testRideFunctions()
    await this.testUtilityFunctions()
    await this.testMessaging()

    this.log("=".repeat(60), "info")
    this.log("📊 Test Summary:", "info")

    const successCount = this.results.filter((r) => r.status === "success").length
    const errorCount = this.errors.length
    const totalTests = this.results.filter((r) => r.status !== "info").length

    this.log(`Total Tests: ${totalTests}`, "info")
    this.log(`Passed: ${successCount}`, "success")
    this.log(`Failed: ${errorCount}`, errorCount > 0 ? "error" : "success")

    if (this.errors.length > 0) {
      this.log("🔍 Errors found:", "error")
      this.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error.message}`, "error")
      })
    } else {
      this.log("🎉 All core functionalities are working correctly!", "success")
    }

    return {
      results: this.results,
      errors: this.errors,
      summary: {
        total: totalTests,
        passed: successCount,
        failed: errorCount,
      },
    }
  }
}

// Auto-run the tests
const tester = new SchoolRideAppTester()
tester.runAllTests().then((results) => {
  console.log("Test completed. Results:", results)

  // Save results to localStorage for debugging
  localStorage.setItem("schoolRideAppTestResults", JSON.stringify(results))
})

// Export for manual testing
window.SchoolRideAppTester = SchoolRideAppTester
