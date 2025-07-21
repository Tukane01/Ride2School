// Utility functions for handling Johannesburg timezone

// Convert a date to Johannesburg timezone string
export function toJohannesburgTime(date: Date | string | number): string {
  const d = new Date(date)
  return d.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })
}

// Get current date and time in Johannesburg timezone
export function getCurrentJohannesburgTime(): Date {
  const now = new Date()
  const johannesburgOffset = 2 * 60 // UTC+2 in minutes
  const utcOffset = now.getTimezoneOffset() // Local offset in minutes

  // Calculate the difference between local time and Johannesburg time
  const offsetDiff = utcOffset + johannesburgOffset

  // Apply the offset to get Johannesburg time
  return new Date(now.getTime() + offsetDiff * 60 * 1000)
}

// Format a date string to Johannesburg timezone ISO string
export function toJohannesburgISOString(date: Date | string | number): string {
  const d = new Date(date)

  // Create a date string in ISO format but with Johannesburg timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }

  const parts = new Intl.DateTimeFormat("en-ZA", options).formatToParts(d)
  const dateValues: Record<string, string> = {}

  parts.forEach((part) => {
    if (part.type !== "literal") {
      dateValues[part.type] = part.value
    }
  })

  return `${dateValues.year}-${dateValues.month}-${dateValues.day}T${dateValues.hour}:${dateValues.minute}:${dateValues.second}+02:00`
}
