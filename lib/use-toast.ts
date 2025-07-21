"use client"

import * as React from "react"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

type ToastActionElement = React.ReactElement

type Toast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  variant?: "default" | "destructive"
}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ToasterToast = Toast & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

const memoryState: { toasts: ToasterToast[] } = { toasts: [] }

const listeners: Array<(state: typeof memoryState) => void> = []

const dispatch = (action: {
  type: keyof typeof actionTypes
  toast?: ToasterToast
  toastId?: ToasterToast["id"]
}) => {
  switch (action.type) {
    case "ADD_TOAST":
      memoryState.toasts = [action.toast, ...memoryState.toasts].slice(0, TOAST_LIMIT)
      break
    case "UPDATE_TOAST":
      memoryState.toasts = memoryState.toasts.map((t) => (t.id === action.toast?.id ? { ...t, ...action.toast } : t))
      break
    case "DISMISS_TOAST": {
      const { toastId } = action
      if (toastId) {
        memoryState.toasts = memoryState.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t,
        )
      } else {
        memoryState.toasts.forEach((toast) => {
          toast.open = false
        })
      }
      break
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        memoryState.toasts = []
      } else {
        memoryState.toasts = memoryState.toasts.filter((t) => t.id !== action.toastId)
      }
      break
  }

  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function toast({ ...props }: ToastProps) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<typeof memoryState>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
