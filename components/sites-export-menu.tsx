"use client"

// "Your sites" export: a spreadsheet of your own sites that have the power off now or a planned outage coming,
// for audits and for planning fridge stock. Built on the server (/api/export) so it matches the app and the emails.

import { useState } from "react"
import { Download } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getSupabaseClient } from "@/lib/supabase"

const RANGES = [
  { label: "Off now", when: "now", days: 1 },
  { label: "Next 3 days", when: "all", days: 3 },
  { label: "Next 7 days", when: "all", days: 7 },
  { label: "Next 14 days", when: "all", days: 14 },
  { label: "Next 28 days", when: "all", days: 28 },
] as const

export function SitesExportMenu({ className, label = "Your sites", iconOnly }: { className?: string; label?: string; iconOnly?: boolean }) {
  const [range, setRange] = useState(2)
  const [longOnly, setLongOnly] = useState(false)
  const [atSite, setAtSite] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const download = async (format: "xlsx" | "csv") => {
    setBusy(format); setError(null)
    try {
      const r = RANGES[range]
      const p = new URLSearchParams({ when: r.when, days: String(r.days), format })
      if (longOnly) p.set("min_hours", "4")
      if (atSite) p.set("at_site", "1")
      const { data } = await getSupabaseClient().auth.getSession()
      const res = await fetch(`/api/export?${p}`, { headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` } })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Export failed")
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `wattle.${format}`
      const url = URL.createObjectURL(await res.blob())
      const a = Object.assign(document.createElement("a"), { href: url, download: name })
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (e: any) { setError(e.message) } finally { setBusy(null) }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={className ?? "inline-flex h-9 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-white px-3 text-sm font-medium text-[#24211C] hover:bg-[#F7F3EA]"}
          aria-label={iconOnly ? label : undefined} title={iconOnly ? label : undefined}>
          <Download className={iconOnly ? undefined : "h-4 w-4"} />
          {!iconOnly && label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 border-[#E6DFD1] bg-[#FBF8F2] p-4 text-[#24211C]">
        <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-rounded)" }}>Your sites affected</p>
        <p className="mt-0.5 text-xs text-[#6F685C]">Every site of yours with the power off or a planned outage in the window, in each site&apos;s local time.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRange(i)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${i === range ? "bg-[#24211C] text-[#F2B300]" : "border border-[#E6DFD1] text-[#6F685C] hover:border-[#24211C]"}`}>
              {r.label}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={longOnly} onChange={(e) => setLongOnly(e.target.checked)} className="accent-[#F2B300]" />
          Only 4 hours or longer (fridge stock)
        </label>
        <label className="mt-1.5 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={atSite} onChange={(e) => setAtSite(e.target.checked)} className="accent-[#F2B300]" />
          Only outages at the site, not just nearby
        </label>
        <div className="mt-4 flex gap-2">
          <button onClick={() => download("xlsx")} disabled={!!busy} className="flex-1 rounded-full bg-[#F2B300] py-2 text-sm font-semibold text-[#24211C] hover:bg-[#F5C023] disabled:opacity-60">
            {busy === "xlsx" ? "Building…" : "Excel"}
          </button>
          <button onClick={() => download("csv")} disabled={!!busy} className="flex-1 rounded-full border border-[#E6DFD1] py-2 text-sm font-semibold hover:border-[#24211C] disabled:opacity-60">
            {busy === "csv" ? "Building…" : "CSV"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-[#B4441B]">{error}</p>}
      </PopoverContent>
    </Popover>
  )
}
