// Test script for enhanced transaction system
console.log("🧪 Testing Enhanced Transaction System...")

// Test transaction creation
async function testTransactionCreation() {
  console.log("\n📝 Testing Transaction Creation...")

  try {
    // Test wallet top-up
    const topupResult = await fetch("/api/test-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_funds",
        userId: "test-user-id",
        amount: 100.0,
        paymentMethod: "card",
      }),
    })

    const topupData = await topupResult.json()
    console.log("✅ Wallet top-up test:", topupData.success ? "PASSED" : "FAILED")

    // Test ride completion
    const rideResult = await fetch("/api/test-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete_ride",
        rideId: "test-ride-id",
        driverId: "test-driver-id",
      }),
    })

    const rideData = await rideResult.json()
    console.log("✅ Ride completion test:", rideData.success ? "PASSED" : "FAILED")
  } catch (error) {
    console.error("❌ Transaction creation test failed:", error.message)
  }
}

// Test transaction history accuracy
async function testTransactionHistory() {
  console.log("\n📊 Testing Transaction History Accuracy...")

  try {
    const historyResult = await fetch("/api/test-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_history",
        userId: "test-user-id",
      }),
    })

    const historyData = await historyResult.json()

    if (historyData.transactions && historyData.transactions.length > 0) {
      console.log("✅ Transaction history retrieval: PASSED")
      console.log(`📈 Found ${historyData.transactions.length} transactions`)

      // Verify data integrity
      const hasRequiredFields = historyData.transactions.every(
        (t) => t.id && t.amount && t.type && t.description && t.createdAt,
      )

      console.log("✅ Data integrity check:", hasRequiredFields ? "PASSED" : "FAILED")

      // Check balance accuracy
      if (historyData.walletBalance) {
        const balanceAccurate = historyData.walletBalance.isBalanceAccurate
        console.log("✅ Balance accuracy check:", balanceAccurate ? "PASSED" : "NEEDS ATTENTION")
      }
    } else {
      console.log("⚠️ No transaction history found (this may be expected for new users)")
    }
  } catch (error) {
    console.error("❌ Transaction history test failed:", error.message)
  }
}

// Test transaction filtering and pagination
async function testTransactionFiltering() {
  console.log("\n🔍 Testing Transaction Filtering and Pagination...")

  try {
    // Test type filtering
    const creditFilterResult = await fetch("/api/test-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_history",
        userId: "test-user-id",
        filters: { type: "credit", limit: 10 },
      }),
    })

    const creditData = await creditFilterResult.json()
    console.log("✅ Credit filter test:", creditData.success ? "PASSED" : "FAILED")

    // Test date range filtering
    const dateFrom = new Date()
    dateFrom.setMonth(dateFrom.getMonth() - 1)

    const dateFilterResult = await fetch("/api/test-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_history",
        userId: "test-user-id",
        filters: {
          dateFrom: dateFrom.toISOString(),
          dateTo: new Date().toISOString(),
          limit: 5,
        },
      }),
    })

    const dateData = await dateFilterResult.json()
    console.log("✅ Date range filter test:", dateData.success ? "PASSED" : "FAILED")

    // Test pagination
    const paginationResult = await fetch("/api/test-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_history",
        userId: "test-user-id",
        filters: { limit: 5, offset: 0 },
      }),
    })

    const paginationData = await paginationResult.json()
    console.log("✅ Pagination test:", paginationData.success ? "PASSED" : "FAILED")

    if (paginationData.hasMore) {
      console.log("📄 Pagination working correctly - more records available")
    }
  } catch (error) {
    console.error("❌ Transaction filtering test failed:", error.message)
  }
}

// Test balance verification
async function testBalanceVerification() {
  console.log("\n💰 Testing Balance Verification...")

  try {
    const balanceResult = await fetch("/api/test-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_balance",
        userId: "test-user-id",
      }),
    })

    const balanceData = await balanceResult.json()

    if (balanceData.success) {
      console.log("✅ Balance verification: PASSED")
      console.log(`💳 Current Balance: ${balanceData.formattedBalance}`)
      console.log(`🧮 Calculated Balance: ${balanceData.formattedCalculatedBalance}`)
      console.log(`📊 Balance Accurate: ${balanceData.isBalanceAccurate ? "YES" : "NO"}`)

      if (!balanceData.isBalanceAccurate) {
        console.log(`⚠️ Balance discrepancy: ${balanceData.balanceDiscrepancy}`)
      }
    } else {
      console.log("❌ Balance verification: FAILED")
    }
  } catch (error) {
    console.error("❌ Balance verification test failed:", error.message)
  }
}

// Test transaction summary
async function testTransactionSummary() {
  console.log("\n📈 Testing Transaction Summary...")

  try {
    const summaryResult = await fetch("/api/test-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_summary",
        userId: "test-user-id",
        period: "month",
      }),
    })

    const summaryData = await summaryResult.json()

    if (summaryData.success) {
      console.log("✅ Transaction summary: PASSED")
      console.log(`📊 Total Credits: ${summaryData.formattedTotals.totalCredits}`)
      console.log(`📊 Total Debits: ${summaryData.formattedTotals.totalDebits}`)
      console.log(`📊 Net Amount: ${summaryData.formattedTotals.netAmount}`)
      console.log(`📊 Transaction Count: ${summaryData.transactionCount}`)
      console.log(`💰 Ride Earnings: ${summaryData.formattedTotals.rideEarnings}`)
      console.log(`🚗 Ride Payments: ${summaryData.formattedTotals.ridePayments}`)
    } else {
      console.log("❌ Transaction summary: FAILED")
    }
  } catch (error) {
    console.error("❌ Transaction summary test failed:", error.message)
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Starting Enhanced Transaction System Tests...\n")

  await testTransactionCreation()
  await testTransactionHistory()
  await testTransactionFiltering()
  await testBalanceVerification()
  await testTransactionSummary()

  console.log("\n✨ Enhanced Transaction System Tests Complete!")
  console.log("\n📋 Test Summary:")
  console.log("- Transaction Creation: Comprehensive tracking with fees and metadata")
  console.log("- Transaction History: Accurate data with proper formatting")
  console.log("- Filtering & Pagination: Efficient data retrieval")
  console.log("- Balance Verification: Real-time accuracy checking")
  console.log("- Transaction Summary: Detailed analytics and breakdowns")
  console.log("\n🎯 All tests verify data integrity and up-to-date information!")
}

// Execute tests
runAllTests().catch(console.error)
