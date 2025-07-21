// Time synchronization utility for real-time operations
class TimeSync {
  private serverOffset = 0
  private lastSyncTime = 0
  private syncInterval: NodeJS.Timeout | null = null
  private readonly SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_OFFSET = 30 * 1000 // 30 seconds max offset

  constructor() {
    this.startAutoSync()
  }

  // Get current synchronized time
  now(): Date {
    return new Date(Date.now() + this.serverOffset)
  }

  // Get current timestamp
  timestamp(): number {
    return Date.now() + this.serverOffset
  }

  // Sync with server time
  async syncWithServer(): Promise<void> {
    try {
      const startTime = Date.now()
      const response = await fetch("/api/time")
      const endTime = Date.now()

      if (!response.ok) {
        throw new Error("Failed to fetch server time")
      }

      const data = await response.json()
      const serverTime = new Date(data.timestamp).getTime()
      const networkDelay = (endTime - startTime) / 2
      const adjustedServerTime = serverTime + networkDelay

      this.serverOffset = adjustedServerTime - endTime
      this.lastSyncTime = Date.now()

      // Limit extreme offsets
      if (Math.abs(this.serverOffset) > this.MAX_OFFSET) {
        console.warn(`Large time offset detected: ${this.serverOffset}ms`)
        this.serverOffset = Math.sign(this.serverOffset) * this.MAX_OFFSET
      }

      console.log(`Time synced. Offset: ${this.serverOffset}ms`)
    } catch (error) {
      console.error("Time sync failed:", error)
      // Fallback to local time
      this.serverOffset = 0
    }
  }

  // Start automatic synchronization
  private startAutoSync(): void {
    // Initial sync
    this.syncWithServer()

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.syncWithServer()
    }, this.SYNC_INTERVAL)
  }

  // Stop automatic synchronization
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // Check if time is recently synced
  isRecentlySynced(): boolean {
    return Date.now() - this.lastSyncTime < this.SYNC_INTERVAL * 2
  }

  // Get sync status
  getSyncStatus(): {
    offset: number
    lastSync: Date
    isRecentlySynced: boolean
  } {
    return {
      offset: this.serverOffset,
      lastSync: new Date(this.lastSyncTime),
      isRecentlySynced: this.isRecentlySynced(),
    }
  }
}

// Create singleton instance
const timeSync = new TimeSync()

// Utility functions for consistent time formatting
export const formatTime = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const formatDate = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString()
}

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString()
}

// Get current synchronized time
export const getCurrentTime = (): Date => timeSync.now()

// Get current synchronized timestamp
export const getCurrentTimestamp = (): number => timeSync.timestamp()

// Manual sync trigger
export const syncTime = (): Promise<void> => timeSync.syncWithServer()

// Get sync status
export const getTimeSyncStatus = () => timeSync.getSyncStatus()

export default timeSync
