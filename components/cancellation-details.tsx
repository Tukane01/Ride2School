import type { Ride } from "@/lib/types"
import { format } from "date-fns"
import { AlertCircle } from "lucide-react"

interface CancellationDetailsProps {
  ride: Ride
}

export function CancellationDetails({ ride }: CancellationDetailsProps) {
  if (ride.status !== "cancelled") {
    return null
  }

  const cancelledByText = ride.cancelledByType === "parent" ? "Parent" : "Driver"
  const cancelledAt = ride.cancelledAt ? format(new Date(ride.cancelledAt), "PPp") : "Unknown time"

  return (
    <div className="bg-red-50 p-3 rounded-md mt-2 text-sm">
      <div className="flex items-start">
        <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5" />
        <div>
          <p className="font-medium text-red-700">Ride Cancelled</p>
          <p className="text-red-600">
            Cancelled by: <span className="font-medium">{cancelledByText}</span>
          </p>
          <p className="text-red-600">
            Cancelled at: <span className="font-medium">{cancelledAt}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
