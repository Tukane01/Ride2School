"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle } from "lucide-react"
import { deleteUserAccount } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface DeleteAccountDialogProps {
  isOpen?: boolean
  onClose?: () => void
  userType: "parent" | "driver"
}

export function DeleteAccountDialog({ isOpen, onClose, userType }: DeleteAccountDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      setError("Please type 'DELETE' to confirm")
      return
    }

    setLoading(true)
    setError("")

    try {
      await deleteUserAccount()

      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      })

      // Redirect to home page
      router.push("/")
    } catch (error: any) {
      console.error("Error deleting account:", error)
      setError(error.message || "Failed to delete account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setConfirmText("")
      setError("")
      if (onClose) onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription className="text-left">
            This action cannot be undone. This will permanently delete your account and remove all your data from our
            servers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>The following data will be permanently deleted:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>User Information (profile, contact details, ID)</li>
                {userType === "parent" && <li>Child Information (names, school details, ID)</li>}
                {userType === "driver" && <li>Car Information (vehicle details, registration)</li>}
                <li>Ride History and Transaction Records</li>
                <li>Wallet Balance and Payment Information</li>
                <li>Messages and Notifications</li>
                <li>Account Settings and Preferences</li>
              </ul>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <strong>DELETE</strong> to confirm:
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || confirmText !== "DELETE"}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Account Permanently"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
