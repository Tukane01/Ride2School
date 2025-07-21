// Update the component to handle all connection states properly
export function RideConnectionStatus({ status }: { status: "connected" | "disconnected" | "connecting" }) {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          color: "text-green-600",
          bgColor: "bg-green-100",
          icon: "●",
          text: "Live",
        }
      case "connecting":
        return {
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          icon: "●",
          text: "Connecting",
        }
      case "disconnected":
      default:
        return {
          color: "text-red-600",
          bgColor: "bg-red-100",
          icon: "●",
          text: "Offline",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
    >
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </div>
  )
}
