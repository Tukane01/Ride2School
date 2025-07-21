"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle, DollarSign, Clock } from "lucide-react"

interface CancellationWarningDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  fare: number
  isLoading?: boolean
  isInProgress?: boolean
  userType?: "parent" | "driver" // Add user type prop
}

export default function CancellationWarningDialog({
  isOpen,
  onClose,
  onConfirm,
  fare,
  isLoading = false,
  isInProgress = false,
  userType = "parent",
}: CancellationWarningDialogProps) {
  const [reason, setReason] = useState("")
  const penaltyFee = Math.round(fare * 0.1 * 100) / 100 // 10% penalty fee

  const handleConfirm = () => {
    onConfirm(reason)
    setReason("")
  }

  const handleClose = () => {
    onClose()
    setReason("")
  }

  const getDialogContent = () => {
    if (isInProgress) {
      return {
        title: "Cancel In-Progress Ride",
        description: "Are you sure you want to cancel this in-progress ride? This action cannot be undone.",
        warningType: "penalty",
        warningTitle: "In-Progress Ride Penalty",
        warningContent: (
          <>
            <p className="text-sm text-red-700 mb-2">
              Since this ride is currently in progress, a penalty fee of{" "}
              <span className="font-bold">R{penaltyFee.toFixed(2)}</span> (10% of the ride fare) will be deducted from
              your wallet and transferred to the other party as compensation.
            </p>
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <DollarSign className="h-4 w-4" />
              <span>Penalty: R{penaltyFee.toFixed(2)} → Other party</span>
            </div>
          </>
        ),
      }
    }

    if (userType === "driver") {
      return {
        title: "Cancel Ride",
        description: "Are you sure you want to cancel this ride? This action cannot be undone.",
        warningType: "reassignment",
        warningTitle: "Ride Re-assignment",
        warningContent: (
          <p className="text-sm text-blue-700">
            This ride will be cancelled and made available for other drivers to accept. The parent will be notified and
            can wait for another driver to accept the ride. No penalty fees will be applied.
          </p>
        ),
      }
    }

    // Parent cancelling scheduled ride
    return {
      title: "Cancel Ride",
      description: "Are you sure you want to cancel this ride? This action cannot be undone.",
      warningType: "cancellation",
      warningTitle: "Ride Cancellation",
      warningContent: (
        <p className="text-sm text-orange-700">
          This ride will be permanently cancelled and will not be made available to other drivers. You will need to
          create a new ride request if you still need transportation. No penalty fees will be applied.
        </p>
      ),
    }
  }

  const content = getDialogContent()
  const warningBgColor =
    content.warningType === "penalty"
      ? "bg-red-50 border-red-200"
      : content.warningType === "reassignment"
        ? "bg-blue-50 border-blue-200"
        : "bg-orange-50 border-orange-200"

  const warningTextColor =
    content.warningType === "penalty"
      ? "text-red-800"
      : content.warningType === "reassignment"
        ? "text-blue-800"
        : "text-orange-800"

  const warningIcon =
    content.warningType === "penalty" ? (
      <Clock className="h-4 w-4" />
    ) : content.warningType === "reassignment" ? (
      <DollarSign className="h-4 w-4" />
    ) : (
      <AlertTriangle className="h-4 w-4" />
    )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {content.title}
          </DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className={`${warningBgColor} rounded-lg p-4`}>
            <div className={`flex items-center gap-2 ${warningTextColor} mb-2`}>
              {warningIcon}
              <span className="font-medium">{content.warningTitle}</span>
            </div>
            {content.warningContent}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation-reason">
              Reason for cancellation {isInProgress ? "(required for in-progress rides)" : "(optional)"}
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Please provide a reason for cancelling this ride..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required={isInProgress}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Keep Ride
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || (isInProgress && !reason.trim())}
          >
            {isLoading ? "Cancelling..." : `Cancel Ride${isInProgress ? ` (Pay R${penaltyFee.toFixed(2)})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
