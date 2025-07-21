import { jsPDF } from "jspdf"
import { Document, Packer, Paragraph, Table, TableCell, TableRow, HeadingLevel, TextRun, BorderStyle } from "docx"
import { saveAs } from "file-saver"
import FileSaver from "file-saver"
import "jspdf-autotable"

// Helper function to format date
export const formatDate = (date: string | Date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Helper function to format currency
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(amount)
}

// Helper function to get date range description
export const getDateRangeDescription = (timeRange: string): string => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (timeRange) {
    case "today":
      return `${today.toLocaleDateString()}`
    case "week": {
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay()) // Start from Sunday
      return `${startOfWeek.toLocaleDateString()} - ${today.toLocaleDateString()}`
    }
    case "month": {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      return `${startOfMonth.toLocaleDateString()} - ${today.toLocaleDateString()}`
    }
    case "quarter": {
      const startOfQuarter = new Date(today)
      startOfQuarter.setMonth(today.getMonth() - 3)
      return `${startOfQuarter.toLocaleDateString()} - ${today.toLocaleDateString()}`
    }
    case "year": {
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      return `${startOfYear.toLocaleDateString()} - ${today.toLocaleDateString()}`
    }
    default:
      return "Custom Range"
  }
}

// Enhanced download function for transaction history with multiple formats
export const downloadTransactionHistory = async (data: any[], format: string, timeRange: string) => {
  const fileName = `transaction-history-${timeRange}-${new Date().toISOString().split("T")[0]}`

  switch (format.toLowerCase()) {
    case "pdf":
      return downloadTransactionsPDF(data, fileName)
    case "docx":
      return downloadTransactionsDOCX(data, fileName)
    case "csv":
      return downloadTransactionsCSV(data, fileName)
    case "xml":
      return downloadTransactionsXML(data, fileName)
    case "xls":
      return downloadTransactionsXLS(data, fileName)
    default:
      throw new Error("Unsupported format")
  }
}

// Enhanced download function for ride history with multiple formats
export const downloadRideHistory = async (data: any[], format: string, timeRange: string) => {
  const fileName = `ride-history-${timeRange}-${new Date().toISOString().split("T")[0]}`

  switch (format.toLowerCase()) {
    case "pdf":
      return downloadRidesPDF(data, fileName)
    case "docx":
      return downloadRidesDOCX(data, fileName)
    case "csv":
      return downloadRidesCSV(data, fileName)
    case "xml":
      return downloadRidesXML(data, fileName)
    case "xls":
      return downloadRidesXLS(data, fileName)
    default:
      throw new Error("Unsupported format")
  }
}

// PDF Downloads
const downloadTransactionsPDF = (data: any[], fileName: string) => {
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(18)
  doc.text("Transaction History Report", 20, 20)

  // Add generation date
  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30)

  // Add summary
  const totalCredit = data.filter((t) => t.type === "credit").reduce((sum, t) => sum + Number(t.amount), 0)
  const totalDebit = data.filter((t) => t.type === "debit").reduce((sum, t) => sum + Number(t.amount), 0)

  doc.setFontSize(12)
  doc.text(`Total Transactions: ${data.length}`, 20, 45)
  doc.text(`Total Credits: R${totalCredit.toFixed(2)}`, 20, 55)
  doc.text(`Total Debits: R${totalDebit.toFixed(2)}`, 20, 65)
  doc.text(`Net Amount: R${(totalCredit - totalDebit).toFixed(2)}`, 20, 75)

  // Add table headers
  let yPosition = 95
  doc.setFontSize(10)
  doc.text("Date", 20, yPosition)
  doc.text("Description", 60, yPosition)
  doc.text("Type", 130, yPosition)
  doc.text("Amount", 160, yPosition)

  // Add line under headers
  doc.line(20, yPosition + 2, 190, yPosition + 2)
  yPosition += 10

  // Add transaction data
  data.forEach((transaction, index) => {
    if (yPosition > 270) {
      doc.addPage()
      yPosition = 20
    }

    const date = new Date(transaction.created_at).toLocaleDateString()
    const description = transaction.description?.substring(0, 35) || "N/A"
    const type = transaction.type || "N/A"
    const amount = `R${Number(transaction.amount).toFixed(2)}`

    doc.text(date, 20, yPosition)
    doc.text(description, 60, yPosition)
    doc.text(type, 130, yPosition)
    doc.text(amount, 160, yPosition)

    yPosition += 10
  })

  doc.save(`${fileName}.pdf`)
}

const downloadRidesPDF = (data: any[], fileName: string) => {
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(18)
  doc.text("Ride History Report", 20, 20)

  // Add generation date
  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30)

  // Add summary
  const completedRides = data.filter((r) => r.status === "completed").length
  const cancelledRides = data.filter((r) => r.status === "cancelled").length
  const totalEarnings = data.filter((r) => r.status === "completed").reduce((sum, r) => sum + Number(r.fare || 0), 0)

  doc.setFontSize(12)
  doc.text(`Total Rides: ${data.length}`, 20, 45)
  doc.text(`Completed: ${completedRides}`, 20, 55)
  doc.text(`Cancelled: ${cancelledRides}`, 20, 65)
  doc.text(`Total Earnings: R${totalEarnings.toFixed(2)}`, 20, 75)

  // Add table headers
  let yPosition = 95
  doc.setFontSize(10)
  doc.text("Date", 20, yPosition)
  doc.text("Route", 50, yPosition)
  doc.text("Status", 120, yPosition)
  doc.text("Fare", 150, yPosition)

  // Add line under headers
  doc.line(20, yPosition + 2, 190, yPosition + 2)
  yPosition += 10

  // Add ride data
  data.forEach((ride, index) => {
    if (yPosition > 270) {
      doc.addPage()
      yPosition = 20
    }

    const date = new Date(ride.scheduled_time).toLocaleDateString()
    const route = `${ride.origin_address?.substring(0, 20)}... → ${ride.destination_address?.substring(0, 20)}...`
    const status = ride.status || "N/A"
    const fare = ride.fare ? `R${Number(ride.fare).toFixed(2)}` : "N/A"

    doc.text(date, 20, yPosition)
    doc.text(route, 50, yPosition)
    doc.text(status, 120, yPosition)
    doc.text(fare, 150, yPosition)

    yPosition += 10
  })

  doc.save(`${fileName}.pdf`)
}

// DOCX Downloads
const downloadTransactionsDOCX = async (data: any[], fileName: string) => {
  const totalCredit = data.filter((t) => t.type === "credit").reduce((sum, t) => sum + Number(t.amount), 0)
  const totalDebit = data.filter((t) => t.type === "debit").reduce((sum, t) => sum + Number(t.amount), 0)

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "Transaction History Report",
            heading: "Title",
          }),
          new Paragraph({
            text: `Generated on: ${new Date().toLocaleDateString()}`,
          }),
          new Paragraph({
            text: `Total Transactions: ${data.length}`,
          }),
          new Paragraph({
            text: `Total Credits: R${totalCredit.toFixed(2)}`,
          }),
          new Paragraph({
            text: `Total Debits: R${totalDebit.toFixed(2)}`,
          }),
          new Paragraph({
            text: `Net Amount: R${(totalCredit - totalDebit).toFixed(2)}`,
          }),
          new Paragraph({
            text: "",
          }),
          new Table({
            columnWidths: [2000, 4000, 2000, 2000],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph("Date")],
                  }),
                  new TableCell({
                    children: [new Paragraph("Description")],
                  }),
                  new TableCell({
                    children: [new Paragraph("Type")],
                  }),
                  new TableCell({
                    children: [new Paragraph("Amount")],
                  }),
                ],
              }),
              ...data.map(
                (transaction) =>
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph(new Date(transaction.created_at).toLocaleDateString())],
                      }),
                      new TableCell({
                        children: [new Paragraph(transaction.description || "N/A")],
                      }),
                      new TableCell({
                        children: [new Paragraph(transaction.type || "N/A")],
                      }),
                      new TableCell({
                        children: [new Paragraph(`R${Number(transaction.amount).toFixed(2)}`)],
                      }),
                    ],
                  }),
              ),
            ],
          }),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const blob = new Blob([buffer])
  saveAs(blob, `${fileName}.docx`)
}

const downloadRidesDOCX = async (data: any[], fileName: string) => {
  const completedRides = data.filter((r) => r.status === "completed").length
  const cancelledRides = data.filter((r) => r.status === "cancelled").length
  const totalEarnings = data.filter((r) => r.status === "completed").reduce((sum, r) => sum + Number(r.fare || 0), 0)

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "Ride History Report",
            heading: "Title",
          }),
          new Paragraph({
            text: `Generated on: ${new Date().toLocaleDateString()}`,
          }),
          new Paragraph({
            text: `Total Rides: ${data.length}`,
          }),
          new Paragraph({
            text: `Completed: ${completedRides}`,
          }),
          new Paragraph({
            text: `Cancelled: ${cancelledRides}`,
          }),
          new Paragraph({
            text: `Total Earnings: R${totalEarnings.toFixed(2)}`,
          }),
          new Paragraph({
            text: "",
          }),
          new Table({
            columnWidths: [2000, 4000, 2000, 2000],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph("Date")],
                  }),
                  new TableCell({
                    children: [new Paragraph("Route")],
                  }),
                  new TableCell({
                    children: [new Paragraph("Status")],
                  }),
                  new TableCell({
                    children: [new Paragraph("Fare")],
                  }),
                ],
              }),
              ...data.map(
                (ride) =>
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph(new Date(ride.scheduled_time).toLocaleDateString())],
                      }),
                      new TableCell({
                        children: [new Paragraph(`${ride.origin_address} → ${ride.destination_address}`)],
                      }),
                      new TableCell({
                        children: [new Paragraph(ride.status || "N/A")],
                      }),
                      new TableCell({
                        children: [new Paragraph(ride.fare ? `R${Number(ride.fare).toFixed(2)}` : "N/A")],
                      }),
                    ],
                  }),
              ),
            ],
          }),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const blob = new Blob([buffer])
  saveAs(blob, `${fileName}.docx`)
}

// CSV Downloads
const downloadTransactionsCSV = (data: any[], fileName: string) => {
  const headers = ["Date", "Description", "Type", "Amount", "ID"]
  const csvData = data.map((transaction) => [
    new Date(transaction.created_at).toLocaleDateString(),
    `"${transaction.description || "N/A"}"`,
    transaction.type || "N/A",
    Number(transaction.amount).toFixed(2),
    transaction.id || "N/A",
  ])

  const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  saveAs(blob, `${fileName}.csv`)
}

const downloadRidesCSV = (data: any[], fileName: string) => {
  const headers = [
    "Date",
    "Origin Address",
    "Destination Address",
    "Status",
    "Fare",
    "Child Name",
    "Driver Name",
    "Cancellation Reason",
  ]
  const csvData = data.map((ride) => [
    new Date(ride.scheduled_time).toLocaleDateString(),
    `"${ride.origin_address || "N/A"}"`,
    `"${ride.destination_address || "N/A"}"`,
    ride.status || "N/A",
    ride.fare ? Number(ride.fare).toFixed(2) : "N/A",
    `"${ride.child_name || "N/A"}"`,
    `"${ride.driver_name || "N/A"}"`,
    `"${ride.cancellation_reason || "N/A"}"`,
  ])

  const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  saveAs(blob, `${fileName}.csv`)
}

// XML Downloads
const downloadTransactionsXML = (data: any[], fileName: string) => {
  const totalCredit = data.filter((t) => t.type === "credit").reduce((sum, t) => sum + Number(t.amount), 0)
  const totalDebit = data.filter((t) => t.type === "debit").reduce((sum, t) => sum + Number(t.amount), 0)

  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xmlContent += "<TransactionHistory>\n"
  xmlContent += `  <Summary>\n`
  xmlContent += `    <GeneratedDate>${new Date().toISOString()}</GeneratedDate>\n`
  xmlContent += `    <TotalTransactions>${data.length}</TotalTransactions>\n`
  xmlContent += `    <TotalCredits>${totalCredit.toFixed(2)}</TotalCredits>\n`
  xmlContent += `    <TotalDebits>${totalDebit.toFixed(2)}</TotalDebits>\n`
  xmlContent += `    <NetAmount>${(totalCredit - totalDebit).toFixed(2)}</NetAmount>\n`
  xmlContent += `  </Summary>\n`
  xmlContent += "  <Transactions>\n"

  data.forEach((transaction) => {
    xmlContent += "    <Transaction>\n"
    xmlContent += `      <ID>${transaction.id || "N/A"}</ID>\n`
    xmlContent += `      <Date>${new Date(transaction.created_at).toISOString()}</Date>\n`
    xmlContent += `      <Description><![CDATA[${transaction.description || "N/A"}]]></Description>\n`
    xmlContent += `      <Type>${transaction.type || "N/A"}</Type>\n`
    xmlContent += `      <Amount>${Number(transaction.amount).toFixed(2)}</Amount>\n`
    xmlContent += "    </Transaction>\n"
  })

  xmlContent += "  </Transactions>\n"
  xmlContent += "</TransactionHistory>"

  const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8;" })
  saveAs(blob, `${fileName}.xml`)
}

const downloadRidesXML = (data: any[], fileName: string) => {
  const completedRides = data.filter((r) => r.status === "completed").length
  const cancelledRides = data.filter((r) => r.status === "cancelled").length
  const totalEarnings = data.filter((r) => r.status === "completed").reduce((sum, r) => sum + Number(r.fare || 0), 0)

  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xmlContent += "<RideHistory>\n"
  xmlContent += `  <Summary>\n`
  xmlContent += `    <GeneratedDate>${new Date().toISOString()}</GeneratedDate>\n`
  xmlContent += `    <TotalRides>${data.length}</TotalRides>\n`
  xmlContent += `    <CompletedRides>${completedRides}</CompletedRides>\n`
  xmlContent += `    <CancelledRides>${cancelledRides}</CancelledRides>\n`
  xmlContent += `    <TotalEarnings>${totalEarnings.toFixed(2)}</TotalEarnings>\n`
  xmlContent += `  </Summary>\n`
  xmlContent += "  <Rides>\n"

  data.forEach((ride) => {
    xmlContent += "    <Ride>\n"
    xmlContent += `      <ID>${ride.id || "N/A"}</ID>\n`
    xmlContent += `      <ScheduledTime>${new Date(ride.scheduled_time).toISOString()}</ScheduledTime>\n`
    xmlContent += `      <OriginAddress><![CDATA[${ride.origin_address || "N/A"}]]></OriginAddress>\n`
    xmlContent += `      <DestinationAddress><![CDATA[${ride.destination_address || "N/A"}]]></DestinationAddress>\n`
    xmlContent += `      <Status>${ride.status || "N/A"}</Status>\n`
    xmlContent += `      <Fare>${ride.fare ? Number(ride.fare).toFixed(2) : "0.00"}</Fare>\n`
    xmlContent += `      <ChildName><![CDATA[${ride.child_name || "N/A"}]]></ChildName>\n`
    xmlContent += `      <DriverName><![CDATA[${ride.driver_name || "N/A"}]]></DriverName>\n`
    if (ride.cancellation_reason) {
      xmlContent += `      <CancellationReason><![CDATA[${ride.cancellation_reason}]]></CancellationReason>\n`
    }
    xmlContent += "    </Ride>\n"
  })

  xmlContent += "  </Rides>\n"
  xmlContent += "</RideHistory>"

  const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8;" })
  saveAs(blob, `${fileName}.xml`)
}

// XLS Downloads (Excel format)
const downloadTransactionsXLS = (data: any[], fileName: string) => {
  const totalCredit = data.filter((t) => t.type === "credit").reduce((sum, t) => sum + Number(t.amount), 0)
  const totalDebit = data.filter((t) => t.type === "debit").reduce((sum, t) => sum + Number(t.amount), 0)

  // Create Excel-compatible HTML
  let htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv=Content-Type content="text/html; charset=utf-8">
      <meta name=ProgId content=Excel.Sheet>
      <meta name=Generator content="Microsoft Excel 11">
    </head>
    <body>
      <table>
        <tr>
          <td colspan="4" style="font-size: 18px; font-weight: bold;">Transaction History Report</td>
        </tr>
        <tr>
          <td colspan="4">Generated on: ${new Date().toLocaleDateString()}</td>
        </tr>
        <tr><td></td></tr>
        <tr>
          <td><strong>Total Transactions:</strong></td>
          <td>${data.length}</td>
        </tr>
        <tr>
          <td><strong>Total Credits:</strong></td>
          <td>R${totalCredit.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Total Debits:</strong></td>
          <td>R${totalDebit.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Net Amount:</strong></td>
          <td>R${(totalCredit - totalDebit).toFixed(2)}</td>
        </tr>
        <tr><td></td></tr>
        <tr style="font-weight: bold;">
          <td>Date</td>
          <td>Description</td>
          <td>Type</td>
          <td>Amount</td>
        </tr>
  `

  data.forEach((transaction) => {
    htmlContent += `
      <tr>
        <td>${new Date(transaction.created_at).toLocaleDateString()}</td>
        <td>${transaction.description || "N/A"}</td>
        <td>${transaction.type || "N/A"}</td>
        <td>R${Number(transaction.amount).toFixed(2)}</td>
      </tr>
    `
  })

  htmlContent += `
      </table>
    </body>
    </html>
  `

  const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" })
  saveAs(blob, `${fileName}.xls`)
}

const downloadRidesXLS = (data: any[], fileName: string) => {
  const completedRides = data.filter((r) => r.status === "completed").length
  const cancelledRides = data.filter((r) => r.status === "cancelled").length
  const totalEarnings = data.filter((r) => r.status === "completed").reduce((sum, r) => sum + Number(r.fare || 0), 0)

  // Create Excel-compatible HTML
  let htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv=Content-Type content="text/html; charset=utf-8">
      <meta name=ProgId content=Excel.Sheet>
      <meta name=Generator content="Microsoft Excel 11">
    </head>
    <body>
      <table>
        <tr>
          <td colspan="6" style="font-size: 18px; font-weight: bold;">Ride History Report</td>
        </tr>
        <tr>
          <td colspan="6">Generated on: ${new Date().toLocaleDateString()}</td>
        </tr>
        <tr><td></td></tr>
        <tr>
          <td><strong>Total Rides:</strong></td>
          <td>${data.length}</td>
        </tr>
        <tr>
          <td><strong>Completed:</strong></td>
          <td>${completedRides}</td>
        </tr>
        <tr>
          <td><strong>Cancelled:</strong></td>
          <td>${cancelledRides}</td>
        </tr>
        <tr>
          <td><strong>Total Earnings:</strong></td>
          <td>R${totalEarnings.toFixed(2)}</td>
        </tr>
        <tr><td></td></tr>
        <tr style="font-weight: bold;">
          <td>Date</td>
          <td>Origin</td>
          <td>Destination</td>
          <td>Status</td>
          <td>Fare</td>
          <td>Child/Driver</td>
        </tr>
  `

  data.forEach((ride) => {
    htmlContent += `
      <tr>
        <td>${new Date(ride.scheduled_time).toLocaleDateString()}</td>
        <td>${ride.origin_address || "N/A"}</td>
        <td>${ride.destination_address || "N/A"}</td>
        <td>${ride.status || "N/A"}</td>
        <td>${ride.fare ? `R${Number(ride.fare).toFixed(2)}` : "N/A"}</td>
        <td>${ride.child_name || ride.driver_name || "N/A"}</td>
      </tr>
    `
  })

  htmlContent += `
      </table>
    </body>
    </html>
  `

  const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" })
  saveAs(blob, `${fileName}.xls`)
}

// CSV download functions
const downloadTransactionCSV = async (transactions: any[], filename: string, dateRange: string) => {
  const headers = ["Transaction ID", "Date", "Amount", "Type", "Status", "Description"]

  const rows = transactions.map((transaction) => [
    transaction.id,
    new Date(transaction.created_at).toLocaleString(),
    formatCurrency(transaction.amount),
    transaction.type,
    transaction.status || "Completed",
    transaction.description || "",
  ])

  const csvContent = [
    `# Transaction History (${dateRange})`,
    `# Generated on: ${new Date().toLocaleString()}`,
    `# Total Records: ${transactions.length}`,
    "",
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n")

  downloadTextFile(`${filename}.csv`, csvContent)
}

const downloadRideCSV = async (rides: any[], filename: string, dateRange: string) => {
  const headers = ["Ride ID", "Date", "Origin", "Destination", "Status", "Fare", "Completed At"]

  const rows = rides.map((ride) => [
    ride.id,
    new Date(ride.scheduled_time).toLocaleString(),
    ride.origin_address || "N/A",
    ride.destination_address || "N/A",
    ride.status,
    formatCurrency(ride.fare || 0),
    ride.completed_at ? new Date(ride.completed_at).toLocaleString() : "N/A",
  ])

  const csvContent = [
    `# Ride History (${dateRange})`,
    `# Generated on: ${new Date().toLocaleString()}`,
    `# Total Records: ${rides.length}`,
    "",
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n")

  downloadTextFile(`${filename}.csv`, csvContent)
}

// Helper functions
const generateTransactionTextContent = (transactions: any[], dateRange: string) => {
  let content = `TRANSACTION HISTORY (${dateRange})\n`
  content += `Generated on: ${new Date().toLocaleString()}\n`
  content += `Total Records: ${transactions.length}\n\n`

  transactions.forEach((transaction, index) => {
    content += `Transaction #${index + 1}\n`
    content += `ID: ${transaction.id}\n`
    content += `Date: ${new Date(transaction.created_at).toLocaleString()}\n`
    content += `Amount: ${formatCurrency(transaction.amount)}\n`
    content += `Type: ${transaction.type}\n`
    content += `Status: ${transaction.status || "Completed"}\n`
    if (transaction.description) {
      content += `Description: ${transaction.description}\n`
    }
    content += `\n`
  })

  return content
}

const generateRideTextContent = (rides: any[], dateRange: string) => {
  let content = `RIDE HISTORY (${dateRange})\n`
  content += `Generated on: ${new Date().toLocaleString()}\n`
  content += `Total Records: ${rides.length}\n\n`

  rides.forEach((ride, index) => {
    content += `Ride #${index + 1}\n`
    content += `ID: ${ride.id}\n`
    content += `Date: ${new Date(ride.scheduled_time).toLocaleString()}\n`
    content += `Origin: ${ride.origin_address || "N/A"}\n`
    content += `Destination: ${ride.destination_address || "N/A"}\n`
    content += `Status: ${ride.status}\n`
    content += `Fare: ${formatCurrency(ride.fare || 0)}\n`
    if (ride.completed_at) {
      content += `Completed At: ${new Date(ride.completed_at).toLocaleString()}\n`
    }
    content += `\n`
  })

  return content
}

const downloadTextFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const downloadData = async (
  data: any[],
  columns: { key: string; header: string }[],
  filename: string,
  format: "html" | "pdf" | "excel" | "word" | "csv",
) => {
  switch (format) {
    case "html":
      downloadAsHTML(data, columns, filename)
      break
    case "pdf":
      downloadAsPDF(data, columns, filename)
      break
    case "excel":
      downloadAsExcel(data, columns, filename)
      break
    case "word":
      downloadAsWord(data, columns, filename)
      break
    case "csv":
      downloadAsCSV(data, columns, filename)
      break
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

// Placeholder functions for other formats
const downloadAsHTML = async (data: any[], columns: { key: string; header: string }[], filename: string) => {
  const headers = columns.map((col) => col.header)
  const rows = data.map((item) => columns.map((col) => item[col.key]))

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <h1>${filename}</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${headers.map((header) => `<th>${header}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr>
              ${row.map((cell) => `<td>${cell}</td>`).join("")}
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `

  const blob = new Blob([htmlContent], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const downloadAsPDF = async (data: any[], columns: { key: string; header: string }[], filename: string) => {
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(18)
  doc.text(filename, 14, 20)
  doc.setFontSize(12)
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30)

  // Create table
  const tableColumn = columns.map((col) => col.header)
  const tableRows = data.map((item) => columns.map((col) => item[col.key]))

  // @ts-ignore - jspdf-autotable adds this method
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [66, 66, 66] },
  })

  doc.save(`${filename}.pdf`)
}

const downloadAsExcel = async (data: any[], columns: { key: string; header: string }[], filename: string) => {
  // For simplicity, we'll use CSV as a fallback
  downloadAsCSV(data, columns, filename)
}

const downloadAsWord = async (data: any[], columns: { key: string; header: string }[], filename: string) => {
  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: filename,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `Generated on: ${new Date().toLocaleString()}`,
            spacing: {
              after: 200,
            },
          }),
          new Table({
            width: {
              size: 100,
              type: "pct",
            },
            rows: [
              new TableRow({
                children: columns.map(
                  (col) =>
                    new TableCell({
                      children: [new Paragraph(col.header)],
                      shading: {
                        fill: "CCCCCC",
                      },
                    }),
                ),
              }),
              ...data.map(
                (item) =>
                  new TableRow({
                    children: columns.map(
                      (col) =>
                        new TableCell({
                          children: [new Paragraph(String(item[col.key] || ""))],
                        }),
                    ),
                  }),
              ),
            ],
          }),
        ],
      },
    ],
  })

  // Generate and save document
  const buffer = await Packer.toBuffer(doc)
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.docx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const downloadAsCSV = async (data: any[], columns: { key: string; header: string }[], filename: string) => {
  const headers = columns.map((col) => col.header).join(",")
  const rows = data.map((item) => columns.map((col) => item[col.key] || "").join(",")).join("\n")
  const csvContent = `${headers}\n${rows}`
  downloadTextFile(`${filename}.csv`, csvContent)
}

// Generate CSV file
export const generateCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export")
  }

  // Get headers from the first object
  const headers = Object.keys(data[0])

  // Create CSV content
  let csvContent = headers.join(",") + "\n"

  // Add data rows
  data.forEach((item) => {
    const row = headers
      .map((header) => {
        // Handle special cases like dates and nested objects
        const value = item[header]
        if (value === null || value === undefined) return ""
        if (typeof value === "object" && value instanceof Date) return formatDate(value)
        if (typeof value === "object") return JSON.stringify(value).replace(/"/g, '""')
        if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`
        return value
      })
      .join(",")
    csvContent += row + "\n"
  })

  // Create and download the file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  FileSaver.saveAs(blob, `${filename}.csv`)
}

// Generate PDF file
export const generatePDF = (data: any[], filename: string, title: string) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export")
  }

  // Create new PDF document
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(18)
  doc.text(title, 14, 22)

  // Add date
  doc.setFontSize(11)
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)

  // Get headers and format them
  const headers = Object.keys(data[0]).map((header) =>
    header.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
  )

  // Prepare data for table
  const tableData = data.map((item) => {
    return Object.keys(item).map((key) => {
      const value = item[key]
      if (value === null || value === undefined) return ""
      if (typeof value === "object" && value instanceof Date) return formatDate(value)
      if (typeof value === "object") return JSON.stringify(value)
      return value.toString()
    })
  })

  // Add table to PDF
  // @ts-ignore - jspdf-autotable adds this method
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: 40,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 139, 202] },
  })

  // Save PDF
  doc.save(`${filename}.pdf`)
}

// Generate Word document
export const generateDOCX = async (data: any[], filename: string, title: string) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export")
  }

  // Create new document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on: ${new Date().toLocaleDateString()}`,
                italics: true,
              }),
            ],
          }),
          new Paragraph({ text: "" }), // Empty paragraph for spacing
          createTable(data),
        ],
      },
    ],
  })

  // Generate and save document
  const buffer = await Packer.toBuffer(doc)
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
  FileSaver.saveAs(blob, `${filename}.docx`)
}

// Helper function to create a table for Word document
const createTable = (data: any[]) => {
  if (!data || data.length === 0) return new Table({ rows: [] })

  // Get headers
  const headers = Object.keys(data[0]).map((header) =>
    header.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
  )

  // Create header row
  const headerRow = new TableRow({
    children: headers.map(
      (header) =>
        new TableCell({
          children: [new Paragraph({ text: header })],
          shading: { fill: "CCCCCC" },
        }),
    ),
  })

  // Create data rows
  const rows = data.map((item) => {
    return new TableRow({
      children: Object.keys(item).map((key) => {
        const value = item[key]
        let cellText = ""

        if (value === null || value === undefined) {
          cellText = ""
        } else if (typeof value === "object" && value instanceof Date) {
          cellText = formatDate(value)
        } else if (typeof value === "object") {
          cellText = JSON.stringify(value)
        } else {
          cellText = value.toString()
        }

        return new TableCell({
          children: [new Paragraph({ text: cellText })],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
        })
      }),
    })
  })

  // Create and return table
  return new Table({
    rows: [headerRow, ...rows],
    width: {
      size: 100,
      type: "pct",
    },
  })
}

// Format transactions data for export
export const formatTransactionsForExport = (transactions: any[]) => {
  return transactions.map((transaction) => ({
    ID: transaction.id,
    Date: formatDate(transaction.created_at || transaction.date),
    Amount: formatCurrency(transaction.amount),
    Type: transaction.type === "credit" ? "Credit" : "Debit",
    Description: transaction.description || "",
  }))
}

// Format rides data for export
export const formatRidesForExport = (rides: any[]) => {
  return rides.map((ride) => ({
    ID: ride.id,
    Date: formatDate(ride.scheduled_time),
    Status: ride.status.charAt(0).toUpperCase() + ride.status.slice(1).replace("_", " "),
    Origin: ride.origin_address || (ride.origin ? ride.origin.address : ""),
    Destination: ride.destination_address || (ride.destination ? ride.destination.address : ""),
    Fare: formatCurrency(ride.fare || 0),
    Child: ride.child_name || (ride.child ? `${ride.child.name} ${ride.child.surname}` : ""),
    Driver: ride.driver_name || (ride.driver ? ride.driver.name : ""),
  }))
}

// Export transactions to various formats
export const exportTransactions = async (transactions: any[], format: string, filename: string) => {
  const formattedData = formatTransactionsForExport(transactions)

  switch (format.toLowerCase()) {
    case "csv":
      generateCSV(formattedData, filename)
      break
    case "pdf":
      generatePDF(formattedData, filename, "Transaction History")
      break
    case "docx":
      await generateDOCX(formattedData, filename, "Transaction History")
      break
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

// Export rides to various formats
export const exportRides = async (rides: any[], format: string, filename: string) => {
  const formattedData = formatRidesForExport(rides)

  switch (format.toLowerCase()) {
    case "csv":
      generateCSV(formattedData, filename)
      break
    case "pdf":
      generatePDF(formattedData, filename, "Ride History")
      break
    case "docx":
      await generateDOCX(formattedData, filename, "Ride History")
      break
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}
