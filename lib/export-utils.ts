"use client"

// Export utilities for GridAlert PDF and CSV generation

export interface ExportData {
  headers: string[]
  rows: (string | number)[][]
  title: string
  subtitle?: string
  generatedAt?: Date
}

const GRIDALERT_PRIMARY = "#FF8E32"
const GRIDALERT_TEXT = "#1f1f22"

// Simple inline zap icon in GridAlert orange
const gridAlertLogoSvg = `
<svg width="32" height="32" viewBox="0 0 24 24" fill="${GRIDALERT_PRIMARY}" xmlns="http://www.w3.org/2000/svg">
  <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
</svg>
`

export function exportToCSV(data: ExportData, filename: string) {
  const safe = (val: string | number) => {
    const text = String(val ?? "")
    return text.includes(",") ? `"${text.replace(/"/g, '""')}"` : text
  }

  const csvContent = [
    `"${data.title}"`,
    data.subtitle ? `"${data.subtitle}"` : "",
    "",
    data.headers.map(safe).join(","),
    ...data.rows.map((row) => row.map(safe).join(",")),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToPDF(data: ExportData, filename: string) {
  const win = window.open("", "_blank")
  if (!win) {
    alert("Please allow popups to export PDF")
    return
  }

  const generated = data.generatedAt ?? new Date()
  const dateStr = generated.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const timeStr = generated.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })

  const tableRows = data.rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="border:1px solid #e5e7eb; padding:10px 8px; text-align:left; color:${GRIDALERT_TEXT}; font-size:13px;">${cell}</td>`
          )
          .join("")}</tr>`
    )
    .join("")

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${data.title}</title>
        <style>
          body {
            font-family: "Inter", "Plus Jakarta Sans", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            padding: 36px;
            max-width: 1200px;
            margin: 0 auto;
            color: ${GRIDALERT_TEXT};
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid ${GRIDALERT_PRIMARY};
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .brand-name {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          h1 {
            margin: 10px 0 4px 0;
            font-size: 24px;
            color: ${GRIDALERT_TEXT};
          }
          .subtitle {
            color: #6b7280;
            font-size: 13px;
            margin: 0 0 4px 0;
          }
          .meta {
            text-align: right;
            font-size: 12px;
            color: #6b7280;
            line-height: 1.4;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th {
            background: ${GRIDALERT_PRIMARY};
            color: #fff;
            padding: 12px 10px;
            text-align: left;
            border: 1px solid #e5e7eb;
            font-size: 13px;
          }
          tr:nth-child(even) { background-color: #f9fafb; }
          tr:hover { background-color: #fff3e6; }
          .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
          @media print {
            body { padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">
              ${gridAlertLogoSvg}
              <span class="brand-name" style="color:${GRIDALERT_PRIMARY}">GridAlert</span>
            </div>
            <h1>${data.title}</h1>
            ${data.subtitle ? `<p class="subtitle">${data.subtitle}</p>` : ""}
          </div>
          <div class="meta">
            <div>Generated: ${dateStr}</div>
            <div>${timeStr}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>${data.headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          <p>GridAlert — Outage reporting</p>
          <p>© ${new Date().getFullYear()} GridAlert</p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `

  win.document.write(html)
  win.document.close()
}

