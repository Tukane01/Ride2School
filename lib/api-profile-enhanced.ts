import { getBrowserClient } from "./supabase"
import { profileValidator, ProfileUpdateException, ErrorRecovery } from "./profile-validation"

// Enhanced profile update with comprehensive error handling
export const updateUserProfileEnhanced = async (userData: any) => {
  const supabase = getBrowserClient()

  try {
    // Get current user
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
    if (!currentUser.id) {
      throw new ProfileUpdateException("User not authenticated", "auth", "AUTH_ERROR")
    }

    // Validate input data
    const validation = profileValidator.validatePersonalInfo(userData)
    if (!validation.isValid) {
      throw new ProfileUpdateException(
        `Validation failed: ${validation.errors.join(", ")}`,
        "validation",
        "VALIDATION_ERROR",
        { errors: validation.errors, warnings: validation.warnings },
      )
    }

    // Sanitize input data
    const sanitizedData = {
      name: ErrorRecovery.sanitizeInput(userData.name, "name"),
      surname: ErrorRecovery.sanitizeInput(userData.surname, "name"),
      phone_number: ErrorRecovery.sanitizeInput(userData.phoneNumber, "phone"),
      address: ErrorRecovery.sanitizeInput(userData.address, "address"),
      gender: userData.gender?.toLowerCase(),
      updated_at: new Date().toISOString(),
    }

    // Attempt database update with retry logic
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        const { data, error } = await supabase
          .from("users")
          .update(sanitizedData)
          .eq("id", currentUser.id)
          .select()
          .single()

        if (error) {
          throw new ProfileUpdateException(
            `Database update failed: ${error.message}`,
            "database",
            error.code || "DB_ERROR",
            error,
          )
        }

        // Update local storage
        const updatedUser = {
          ...currentUser,
          name: sanitizedData.name,
          surname: sanitizedData.surname,
          phoneNumber: sanitizedData.phone_number,
          address: sanitizedData.address,
          gender: sanitizedData.gender,
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))

        return {
          success: true,
          data: data,
          warnings: validation.warnings,
        }
      } catch (error: any) {
        retryCount++

        if (retryCount >= maxRetries) {
          throw new ProfileUpdateException(
            `Failed to update profile after ${maxRetries} attempts: ${error.message}`,
            "retry",
            "MAX_RETRY_EXCEEDED",
            { originalError: error, retryCount },
          )
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
      }
    }
  } catch (error: any) {
    // Enhanced error logging
    console.error("Profile update error:", {
      message: error.message,
      field: error.field,
      code: error.code,
      details: error.details,
      stack: error.stack,
    })

    // Re-throw with additional context
    if (error instanceof ProfileUpdateException) {
      throw error
    } else {
      throw new ProfileUpdateException(
        `Unexpected error during profile update: ${error.message}`,
        "unknown",
        "UNKNOWN_ERROR",
        error,
      )
    }
  }
}

// Enhanced child details update
export const updateChildDetailsEnhanced = async (childData: any) => {
  const supabase = getBrowserClient()

  try {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
    if (!currentUser.id) {
      throw new ProfileUpdateException("User not authenticated", "auth", "AUTH_ERROR")
    }

    // Validate child data
    const validation = profileValidator.validateChildInfo(childData)
    if (!validation.isValid) {
      throw new ProfileUpdateException(
        `Child validation failed: ${validation.errors.join(", ")}`,
        "validation",
        "CHILD_VALIDATION_ERROR",
        { errors: validation.errors, warnings: validation.warnings },
      )
    }

    // Get existing child record
    const { data: existingChild, error: childError } = await supabase
      .from("children")
      .select("id")
      .eq("parent_id", currentUser.id)
      .maybeSingle()

    if (childError && childError.code !== "PGRST116") {
      throw new ProfileUpdateException(
        `Failed to fetch child data: ${childError.message}`,
        "database",
        childError.code,
        childError,
      )
    }

    // Sanitize child data
    const sanitizedChildData = {
      name: ErrorRecovery.sanitizeInput(childData.name, "name"),
      surname: ErrorRecovery.sanitizeInput(childData.surname, "name"),
      id_number: ErrorRecovery.sanitizeInput(childData.idNumber, "phone"), // Remove non-digits
      school_name: ErrorRecovery.sanitizeInput(childData.schoolName),
      school_address: ErrorRecovery.sanitizeInput(childData.schoolAddress, "address"),
      updated_at: new Date().toISOString(),
    }

    let result
    if (existingChild) {
      // Update existing child
      const { data, error } = await supabase
        .from("children")
        .update(sanitizedChildData)
        .eq("id", existingChild.id)
        .select()
        .single()

      if (error) {
        throw new ProfileUpdateException(`Failed to update child: ${error.message}`, "database", error.code, error)
      }
      result = data
    } else {
      // Create new child
      const { data, error } = await supabase
        .from("children")
        .insert({
          ...sanitizedChildData,
          parent_id: currentUser.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw new ProfileUpdateException(
          `Failed to create child record: ${error.message}`,
          "database",
          error.code,
          error,
        )
      }
      result = data
    }

    return {
      success: true,
      data: result,
      warnings: validation.warnings,
    }
  } catch (error: any) {
    console.error("Child update error:", error)

    if (error instanceof ProfileUpdateException) {
      throw error
    } else {
      throw new ProfileUpdateException(
        `Unexpected error during child update: ${error.message}`,
        "unknown",
        "UNKNOWN_ERROR",
        error,
      )
    }
  }
}

// Enhanced vehicle details update
export const updateCarDetailsEnhanced = async (carData: any) => {
  const supabase = getBrowserClient()

  try {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
    if (!currentUser.id) {
      throw new ProfileUpdateException("User not authenticated", "auth", "AUTH_ERROR")
    }

    // Validate vehicle data
    const validation = profileValidator.validateVehicleInfo(carData)
    if (!validation.isValid) {
      throw new ProfileUpdateException(
        `Vehicle validation failed: ${validation.errors.join(", ")}`,
        "validation",
        "VEHICLE_VALIDATION_ERROR",
        { errors: validation.errors, warnings: validation.warnings },
      )
    }

    // Check if car exists
    const { data: existingCar, error: carCheckError } = await supabase
      .from("cars")
      .select("id")
      .eq("driver_id", currentUser.id)
      .maybeSingle()

    if (carCheckError && carCheckError.code !== "PGRST116") {
      throw new ProfileUpdateException(
        `Failed to check existing car: ${carCheckError.message}`,
        "database",
        carCheckError.code,
        carCheckError,
      )
    }

    // Sanitize car data
    const sanitizedCarData = {
      make: ErrorRecovery.sanitizeInput(carData.make),
      model: ErrorRecovery.sanitizeInput(carData.model),
      color: ErrorRecovery.sanitizeInput(carData.color, "name"),
      registration: ErrorRecovery.sanitizeInput(carData.registration).toUpperCase(),
      vin_number: ErrorRecovery.sanitizeInput(carData.vinNumber).toUpperCase(),
      updated_at: new Date().toISOString(),
    }

    let result
    if (existingCar) {
      // Update existing car
      const { data, error } = await supabase
        .from("cars")
        .update(sanitizedCarData)
        .eq("id", existingCar.id)
        .select()
        .single()

      if (error) {
        throw new ProfileUpdateException(`Failed to update vehicle: ${error.message}`, "database", error.code, error)
      }
      result = data
    } else {
      // Create new car
      const { data, error } = await supabase
        .from("cars")
        .insert({
          ...sanitizedCarData,
          driver_id: currentUser.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw new ProfileUpdateException(
          `Failed to create vehicle record: ${error.message}`,
          "database",
          error.code,
          error,
        )
      }
      result = data
    }

    return {
      success: true,
      data: result,
      warnings: validation.warnings,
    }
  } catch (error: any) {
    console.error("Vehicle update error:", error)

    if (error instanceof ProfileUpdateException) {
      throw error
    } else {
      throw new ProfileUpdateException(
        `Unexpected error during vehicle update: ${error.message}`,
        "unknown",
        "UNKNOWN_ERROR",
        error,
      )
    }
  }
}
