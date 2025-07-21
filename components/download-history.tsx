"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Loader2, Download, FileText, FileSpreadsheet, FileCode, FileIcon } from "lucide-react"
import { downloadData } from "@/lib/download-utils"
import { formatDateTime, formatCurrency } from "@/lib/utils"

interface DownloadHistoryProps {
  type: "transactions" | "rides" | "messages"
  data: any[]
  isLoading?: boolean
}

export default function DownloadHistory({ type, data, isLoading = false }: DownloadHistoryProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async (format: "html" | "pdf" | "excel" | "word" | "csv") => {
    setDownloading(true)
    try {
      let columns: { key: string; header: string }[] = []
      let filename = ""

      // Define columns and filename based on history type
      if (type === "transactions") {
        columns = [
          { key: "date", header: "Date" },
          { key: "description", header: "Description" },
          { key: "amount", header: "Amount" },
          { key: "type", header: "Type" },
        ]
        filename = "Transaction_History"

        // Format data for download
        const formattedData = data.map((item) => ({
          ...item,
          date: formatDateTime(item.date),
          amount: formatCurrency(item.amount),
          type: item.type === "credit" ? "Credit" : "Debit",
        }))

        await downloadData(formattedData, columns, filename, format)
      } else if (type === "rides") {
        columns = [
          { key: "scheduledTime", header: "Scheduled Time" },
          { key: "origin", header: "Origin" },
          { key: "destination", header: "Destination" },
          { key: "status", header: "Status" },
          { key: "fare", header: "Fare" },
          { key: "completedAt", header: "Completed At" },
        ]
        filename = "Ride_History"

        // Format data for download
        const formattedData = data.map((item) => ({
          ...item,
          scheduledTime: formatDateTime(item.scheduledTime),
          origin: item.origin.address,
          destination: item.destination.address,
          status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
          fare: formatCurrency(item.fare || 0),
          completedAt: item.completedAt ? formatDateTime(item.completedAt) : "N/A",
        }))

        await downloadData(formattedData, columns, filename, format)
      } else if (type === "messages") {
        columns = [
          { key: "created_at", header: "Date & Time" },
          { key: "sender", header: "Sender" },
          { key: "content", header: "Message" },
        ]
        filename = "Message_History"

        // Format data for download
        const formattedData = data.map((item) => ({
          ...item,
          created_at: formatDateTime(item.created_at),
          sender: item.sender_name || (item.is_self ? "You" : "Other"),
        }))

        await downloadData(formattedData, columns, filename, format)
      }
    } catch (error) {
      console.error("Download error:", error)
      alert("Failed to download data. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isLoading || downloading || data.length === 0}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload("html")}>
          <FileCode className="mr-2 h-4 w-4" />
          <span>HTML</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("pdf")}>
          <FileIcon className="mr-2 h-4 w-4" />
          <span>PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("excel")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span>Excel</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("word")}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Word</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("csv")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span>CSV</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
