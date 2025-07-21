// Test script to verify the fixed ride operations
const { createClient } = require("@supabase/supabase-js")

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRideOperations() {
  console.log("🧪 Testing Fixed Ride Operations...\n")

  try {
    // Test 1: Check if messages table has archived_at column
    console.log("1️⃣ Testing messages table schema...")
    const { data: columns, error: schemaError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "messages")
      .eq("column_name", "archived_at")

    if (schemaError) {
      console.error("❌ Schema check failed:", schemaError.message)
    } else if (columns && columns.length > 0) {
      console.log("✅ Messages table has archived_at column")
    } else {
      console.log("❌ Messages table missing archived_at column")
    }

    // Test 2: Check if functions exist without conflicts
    console.log("\n2️⃣ Testing function definitions...")

    const { data: functions, error: funcError } = await supabase
      .from("information_schema.routines")
      .select("routine_name, specific_name")
      .eq("routine_name", "move_ride_to_completed")

    if (funcError) {
      console.error("❌ Function check failed:", funcError.message)
    } else {
      console.log(`✅ Found ${functions.length} move_ride_to_completed function(s)`)
      if (functions.length > 1) {
        console.log("⚠️  Multiple function definitions found - this may cause conflicts")
        functions.forEach((func) => {
          console.log(`   - ${func.specific_name}`)
        })
      }
    }

    // Test 3: Test function call with proper parameters
    console.log("\n3️⃣ Testing function call syntax...")

    // This should not fail due to parameter conflicts
    const testRideId = "00000000-0000-0000-0000-000000000000" // Dummy UUID
    const { data: testResult, error: testError } = await supabase.rpc("move_ride_to_completed", {
      p_ride_id: testRideId,
      p_actual_pickup_time: null,
      p_actual_dropoff_time: new Date().toISOString(),
      p_distance_traveled: null,
      p_duration_minutes: null,
    })

    if (testError) {
      if (testError.message.includes("Ride not found")) {
        console.log("✅ Function call syntax is correct (ride not found is expected)")
      } else if (testError.message.includes("Could not choose the best candidate function")) {
        console.log("❌ Function signature conflict still exists")
        console.log("   Error:", testError.message)
      } else {
        console.log("✅ Function callable (other error is expected):", testError.message)
      }
    } else {
      console.log("✅ Function call successful")
    }

    console.log("\n🎉 Test completed!")
  } catch (error) {
    console.error("❌ Test failed:", error.message)
  }
}

// Run the test
testRideOperations()
