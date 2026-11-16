import { createHash, randomBytes } from "crypto"
import { createServiceClient } from "@/lib/supabase"
import { xlsx, type Cell } from "@/lib/xlsx"

// Read-only company data for the Claude connection (/api/mcp/<key>), the data API (/api/v1/*), exports and the
// audit emails. Everything here is scoped to one company id that the caller has already checked.

// ---------- access keys ----------

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex")

/** A new key: `wtl_` and 32 random bytes. Only its hash is stored. */
export function newKey() {
  const key = "wtl_" + randomBytes(32).toString("base64url")
  return { key, hash: hashKey(key), prefix: key.slice(0, 10) }
}

export interface KeyOwner { keyId: string; companyId: string; companyName: string }

/** Finds the company a key belongs to, or null for a wrong or revoked key. */
export async function companyForKey(key: string | null | undefined): Promise<KeyOwner | null> {
  if (!key || !key.startsWith("wtl_") || key.length < 40) return null
  const db = createServiceClient()
  const { data } = await db.from("api_keys").select("id, company_id, last_used_at, companies(name)")
    .eq("key_hash", hashKey(key)).is("revoked_at", null).maybeSingle()
  if (!data) return null
  // note the use, at most every five minutes
  if (!data.last_used_at || Date.now() - new Date(data.last_used_at).getTime() > 5 * 60_000) {
    await db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id)
  }
  return { keyId: data.id, companyId: data.company_id, companyName: (data as any).companies?.name ?? "" }
}

/** The key from `Authorization: Bearer …`, `x-api-key`, or (for links in emails and Claude) `?key=`. */
export function keyFrom(req: Request, fromPath?: string) {
  const auth = req.headers.get("authorization")
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim()
  return req.headers.get("x-api-key") ?? fromPath ?? new URL(req.url).searchParams.get("key")
}

// ---------- sites and outages ----------

export interface Site {
  id: string
  name: string
  code: string | null
  /** the site number as the company shows it: its prefix and the code ("C434"), or "#434" when it has no prefix */
  number: string | null
  address: string
  suburb: string | null
  postcode: string | null
  state: string | null
  provider: string | null
  /** Map pin, or null when the address hasn't been placed (some imports carry 1,1 as a placeholder). */
  lat: number | null
  lng: number | null
}

export type Kind = "unplanned" | "planned" | "future"

export interface Outage {
  id: number
  site: Site
  kind: Kind
  /** "Power off now" (unplanned or a planned one under way) or "Planned". */
  status: "Out now" | "Planned work under way" | "Planned"
  starts: Date | null
  ends: Date | null
  hours: number | null
  /** At the site's address (score ≥ 80) or only near it. */
  atSite: boolean
  distanceKm: number | null
  provider: string
  cause: string | null
  area: string | null
  /** the streets the network lists for it, tidied ("Ann St", "Bray St"); empty when it gives none */
  streets: string[]
  /** how many customers the network says it cuts off */
  customers: number | null
}

const TZ: Record<string, string> = {
  NSW: "Australia/Sydney", ACT: "Australia/Sydney", VIC: "Australia/Melbourne", TAS: "Australia/Hobart",
  QLD: "Australia/Brisbane", SA: "Australia/Adelaide", NT: "Australia/Darwin", WA: "Australia/Perth",
}
export const tzFor = (state?: string | null) => TZ[(state ?? "").toUpperCase()] ?? "Australia/Sydney"

// Australia only: anything else is a placeholder or a typo
const pin = (lat: unknown, lng: unknown) => {
  const a = Number(lat), b = Number(lng)
  return a < -9 && a > -45 && b > 112 && b < 155 ? { lat: a, lng: b } : { lat: null, lng: null }
}

export async function sites(companyId: string): Promise<Site[]> {
  const db = createServiceClient()
  const out: Site[] = []
  // the company's site-number prefix, asked alongside the first page of sites rather than before it
  const prefixP = db.from("companies").select("site_number_prefix").eq("id", companyId).maybeSingle()
    .then(({ data }) => (data?.site_number_prefix ?? "").trim(), () => "")
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("locations")
      .select("id, institutionname, institutionnickname, institutioncode, addressline1, addressline2, addresssuburb, addresspostcode, addressstate, addresslatitude, addresslongitude, provider")
      .eq("company_id", companyId).or("institutionstatus.is.null,institutionstatus.eq.ACTIVE") // retired, reserved and inactive sites are left out
      .order("institutionname").range(from, from + 999)
    if (error) throw error
    const prefix = await prefixP
    for (const l of data ?? []) {
      out.push({
        id: l.id,
        name: l.institutionnickname || l.institutionname || "Unnamed site",
        code: l.institutioncode ?? null,
        number: l.institutioncode ? `${prefix || "#"}${l.institutioncode}` : null,
        address: [l.addressline1, l.addressline2, l.addresssuburb, l.addressstate, l.addresspostcode].filter(Boolean).join(", "),
        suburb: l.addresssuburb ?? null,
        postcode: l.addresspostcode ?? null,
        state: l.addressstate ?? null,
        provider: l.provider ?? null,
        ...pin(l.addresslatitude, l.addresslongitude),
      })
    }
    if (!data || data.length < 1000) break
  }
  return out
}

export interface OutageQuery {
  /** "now": power off now. "upcoming": starting within `days`. "all": both. */
  when?: "now" | "upcoming" | "all"
  days?: number
  siteIds?: string[]
  state?: string
  /** Only outages lasting at least this many hours (e.g. 4 for fridge stock). */
  minHours?: number
  /** Only outages at the site's address, not just nearby. */
  atSiteOnly?: boolean
}

export async function outages(companyId: string, q: OutageQuery = {}, known?: Site[] | Promise<Site[]>): Promise<Outage[]> {
  const when = q.when ?? "all"
  const days = Math.min(Math.max(q.days ?? 14, 1), 120)
  const now = Date.now()
  const horizon = now + days * 86400_000
  const db = createServiceClient()
  const [all, rows] = await Promise.all([
    known ?? sites(companyId),
    (async () => {
      const out: any[] = []
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from("clinic_outage_impacts")
          .select("id, clinic_id, incident_id, provider, kind, score, at_site, distance_km, area, cause, starts_at, ends_at")
          .eq("company_id", companyId).is("ended_at", null).order("starts_at", { ascending: true, nullsFirst: true })
          .range(from, from + 999)
        if (error) throw error
        out.push(...(data ?? []))
        if (!data || data.length < 1000) break
      }
      return out
    })(),
  ])
  const byId = new Map(all.map((s) => [s.id, s]))
  const more = await extras(db, rows)
  const wanted = q.siteIds?.length ? new Set(q.siteIds) : null

  const list: Outage[] = []
  for (const r of rows) {
    const site = byId.get(r.clinic_id)
    if (!site || (wanted && !wanted.has(site.id))) continue
    if (q.state && (site.state ?? "").toUpperCase() !== q.state.toUpperCase()) continue
    const starts = r.starts_at ? new Date(r.starts_at) : null
    const ends = r.ends_at ? new Date(r.ends_at) : null
    const live = r.kind === "unplanned" || (r.kind === "planned" && (!starts || starts.getTime() <= now))
    if (when === "now" && !live) continue
    if (when === "upcoming" && (live || !starts || starts.getTime() > horizon)) continue
    if (when === "all" && !live && starts && starts.getTime() > horizon) continue
    const hours = starts && ends ? Math.round(((ends.getTime() - starts.getTime()) / 3600_000) * 10) / 10 : null
    if (q.minHours && (hours === null || hours < q.minHours)) continue
    // Wattle's at-site rule, worked out in the database on every refresh (inside the outage area, the same street in the
    // same suburb, or right by the outage point), shared with the app and the weekly email. Older rows fall back to the score.
    const atSite = typeof r.at_site === "boolean" ? r.at_site : (r.score ?? 0) >= 80
    if (q.atSiteOnly && !atSite) continue
    list.push({
      id: r.id, site, kind: r.kind, starts, ends, hours, atSite,
      status: r.kind === "unplanned" ? "Out now" : live ? "Planned work under way" : "Planned",
      distanceKm: r.distance_km == null ? null : Number(r.distance_km),
      provider: r.provider, cause: r.cause ?? null, area: r.area ?? null,
      ...(more.get(`${r.provider}|${r.incident_id}`) ?? { streets: [], customers: null }),
    })
  }
  // out now first, then by start time, then by site
  return list.sort((a, b) =>
    Number(b.status !== "Planned") - Number(a.status !== "Planned") ||
    (a.starts?.getTime() ?? 0) - (b.starts?.getTime() ?? 0) || a.site.name.localeCompare(b.site.name))
}

// ---------- what the network says each outage cuts off: its streets and customer count (as the app shows them) ----------

const FEEDS: Record<Kind, string[]> = {
  unplanned: ["unplanned_outages_consolidated"],
  // a planned outage moves from the future table to the current one when it starts, so look in both
  planned: ["current_planned_outages_consolidated", "future_planned_outages_consolidated"],
  future: ["future_planned_outages_consolidated", "current_planned_outages_consolidated"],
}

async function extras(db: ReturnType<typeof createServiceClient>, rows: any[]) {
  const out = new Map<string, { streets: string[]; customers: number | null }>()
  const byTable = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!r.incident_id) continue
    for (const t of FEEDS[r.kind as Kind] ?? []) byTable.set(t, (byTable.get(t) ?? new Set()).add(String(r.incident_id)))
  }
  const areaOf = new Map(rows.map((r) => [`${r.provider}|${r.incident_id}`, r.area as string | null]))
  await Promise.all([...byTable].flatMap(([table, ids]) => {
    const l = [...ids]
    return Array.from({ length: Math.ceil(l.length / 150) }, (_, i) => l.slice(i * 150, i * 150 + 150)).map(async (chunk) => {
      const { data } = await db.from(table).select("incident_id, provider, streets_affected, customers_affected").in("incident_id", chunk)
      for (const x of data ?? []) {
        const k = `${x.provider}|${x.incident_id}`
        if (out.has(k)) continue
        const n = Number(String(x.customers_affected ?? "").replace(/[^0-9]/g, ""))
        out.set(k, { streets: streetList(x.streets_affected, areaOf.get(k) ?? null, x.provider), customers: n > 0 ? n : null })
      }
    })
  }))
  return out
}

/** "ANN ST, BRAY ST" as ["Ann St", "Bray St"]. Nothing when it only repeats the area, or for SA Power (whose list is suburbs). */
function streetList(s: string | null, area: string | null, provider: string): string[] {
  if (!s || /^sa ?power/i.test(provider ?? "")) return []
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (area && norm(area) === norm(s)) return []
  const seen = new Set<string>()
  return s.split(",").map((t) => t.trim())
    .filter((t) => t && !/^(unknown|n\/?a|tbc|-)( area)?$/i.test(t))
    .map((t) => (t === t.toUpperCase() ? t.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()) : t))
    .filter((t) => !seen.has(t.toLowerCase()) && !!seen.add(t.toLowerCase()))
}

export async function summary(companyId: string) {
  const [all, list] = await Promise.all([sites(companyId), outages(companyId, { when: "all", days: 28 })])
  return summaryOf(all, list)
}

/** The headline numbers from a site list and the outages for the next 28 days. */
export function summaryOf(all: Site[], list: Outage[]) {
  const out = list.filter((o) => o.status !== "Planned")
  const soon = (d: number) => list.filter((o) => o.status === "Planned" && o.starts && o.starts.getTime() <= Date.now() + d * 86400_000)
  const sitesIn = (l: Outage[]) => new Set(l.map((o) => o.site.id)).size
  return {
    sites: all.length,
    outNow: { outages: out.length, sites: sitesIn(out), atSite: sitesIn(out.filter((o) => o.atSite)) },
    next3Days: { outages: soon(3).length, sites: sitesIn(soon(3)) },
    next7Days: { outages: soon(7).length, sites: sitesIn(soon(7)) },
    next28Days: { outages: soon(28).length, sites: sitesIn(soon(28)) },
    longOnes7Days: soon(7).filter((o) => (o.hours ?? 0) >= 4).length,
  }
}

// ---------- formatting and exports ----------

/** "Thu 20 Nov, 8:00 am" in the site's own time zone. */
export function when(d: Date | null, state?: string | null) {
  if (!d) return ""
  return d.toLocaleString("en-AU", { timeZone: tzFor(state), weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
}

/** The site's wall-clock time as a Date whose UTC fields hold it, for spreadsheet cells. */
function wall(d: Date | null, state?: string | null): Date | null {
  if (!d) return null
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-AU", {
    timeZone: tzFor(state), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d).map((x) => [x.type, x.value]))
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute))
}

export const EXPORT_HEADERS = [
  "Site", "Site number", "Address", "State", "Status", "Starts", "Ends", "Hours", "4h+ (check fridge stock)",
  "Where", "Distance (km)", "Network", "Cause", "Area",
]

export function exportRows(list: Outage[], forSheet: boolean): Cell[][] {
  return list.map((o) => [
    o.site.name, o.site.number, o.site.address, o.site.state, o.status,
    forSheet ? wall(o.starts, o.site.state) : when(o.starts, o.site.state),
    forSheet ? wall(o.ends, o.site.state) : when(o.ends, o.site.state),
    o.hours, (o.hours ?? 0) >= 4 ? "Yes" : "",
    o.atSite ? "At the site" : "Nearby", o.distanceKm == null ? null : Math.round(o.distanceKm * 100) / 100,
    o.provider, o.cause, o.area,
  ])
}

export function toCSV(list: Outage[]): string {
  const cell = (v: Cell) => {
    const s = v instanceof Date ? v.toISOString() : String(v ?? "")
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return "﻿" + [EXPORT_HEADERS, ...exportRows(list, false)].map((r) => r.map(cell).join(",")).join("\r\n")
}

export function toXLSX(list: Outage[], title: string): Buffer {
  return xlsx([{ name: "Outages", title, headers: EXPORT_HEADERS, rows: exportRows(list, true) }])
}

/** A file name like `wattle-upcoming-2026-11-15.xlsx`. */
export const fileName = (what: string, ext: string) =>
  `wattle-${what}-${new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })}.${ext}`
