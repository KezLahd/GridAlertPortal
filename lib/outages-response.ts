import { NextResponse } from "next/server"
import { fileName, outages, toCSV, toXLSX, type OutageQuery } from "@/lib/wattle-data"

const list = (u: URL, name: string) => (u.searchParams.get(name) ?? "").split(",").map((s) => s.trim()).filter(Boolean)

/**
 * The outage list for one company as JSON, CSV or Excel, from query parameters:
 *   when=now|upcoming|all (default all)   days=1…120 (default 14)   site=id,id   state=NSW
 *   min_hours=4   at_site=1   format=json|csv|xlsx (default json)
 */
export async function outagesResponse(companyId: string, companyName: string, u: URL) {
  const q: OutageQuery = {
    when: (["now", "upcoming", "all"] as const).find((w) => w === u.searchParams.get("when")) ?? "all",
    days: Number(u.searchParams.get("days")) || 14,
    siteIds: list(u, "site"),
    state: u.searchParams.get("state") || undefined,
    minHours: Number(u.searchParams.get("min_hours")) || undefined,
    atSiteOnly: u.searchParams.get("at_site") === "1",
  }
  const rows = await outages(companyId, q)
  const format = u.searchParams.get("format")
  const what = q.when === "now" ? "out-now" : q.when === "upcoming" ? `next-${q.days}-days` : `now-and-next-${q.days}-days`
  if (format === "csv") {
    return new NextResponse(toCSV(rows), { headers: {
      "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${fileName(what, "csv")}"`,
    } })
  }
  if (format === "xlsx") {
    const span = q.when === "now" ? "power off now" : q.when === "upcoming" ? `planned, next ${q.days} days` : `now and next ${q.days} days`
    return new NextResponse(new Uint8Array(toXLSX(rows, `${companyName || "Wattle"} · ${span}`)), { headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${fileName(what, "xlsx")}"`,
    } })
  }
  return NextResponse.json({ company: companyName, count: rows.length, outages: rows })
}
