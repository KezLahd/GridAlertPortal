"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

// The portal's data: one call to /api/portal (sites, outages, headline numbers) shared by Overview, Map and Sites,
// refreshed every five minutes and whenever the tab comes back into view.

export interface Site {
  id: string; name: string; code: string | null; number?: string | null; address: string; suburb: string | null; postcode: string | null
  state: string | null; provider: string | null; lat: number | null; lng: number | null
}
export interface Outage {
  id: number; site: Site; kind: "unplanned" | "planned" | "future"; status: "Out now" | "Planned work under way" | "Planned"
  starts: string | null; ends: string | null; hours: number | null; atSite: boolean; distanceKm: number | null
  provider: string; cause: string | null; area: string | null; streets?: string[]; customers?: number | null
}
export interface Summary {
  sites: number
  outNow: { outages: number; sites: number; atSite: number }
  next3Days: { outages: number; sites: number }
  next7Days: { outages: number; sites: number }
  next28Days: { outages: number; sites: number }
  longOnes7Days: number
}
export interface PortalData { partial?: boolean; company: string; companyId: string; userId: string; role: string; at: string; summary: Summary; sites: Site[]; outages: Outage[] }

/** Where a site stands: power off now, a planned outage in the next 14 days (4h+ or shorter), or all clear. */
export type SiteState = { k: "now" | "long" | "soon"; o: Outage } | { k: "clear"; o?: undefined }

interface Ctx {
  data: PortalData | null
  /** The sites alone, which arrive before the outages; null once `data` is in. Only the map uses it. */
  early: PortalData | null
  error: string | null
  me: { userId: string; firstName: string; lastName: string } | null
  reload: () => Promise<void>
  headers: () => Promise<Record<string, string>>
  stateOf: (siteId: string) => SiteState
  bySite: Map<string, Outage[]>
}

const PortalCtx = createContext<Ctx | null>(null)
export const usePortal = () => {
  const c = useContext(PortalCtx)
  if (!c) throw new Error("usePortal outside PortalProvider")
  return c
}

export const headers = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession()
  return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }
}

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [data, setData] = useState<PortalData | null>(null)
  const [early, setEarly] = useState<PortalData | null>(null)
  const loaded = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<Ctx["me"]>(null)

  const reload = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession()
    if (!s.session) { router.replace("/login"); return }
    const h = await headers()
    let full = false
    // the sites alone come back first, so the map can put its pins down; the full call follows alongside it
    if (!loaded.current) fetch("/api/portal?part=sites", { headers: h, cache: "no-store" }).then((r) => r.ok ? r.json() : null)
      .then((j) => { if (j && !full) setEarly(j) }).catch(() => {})
    const res = await fetch("/api/portal", { headers: h, cache: "no-store" })
    full = true
    if (res.status === 401) { router.replace("/login"); return }
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setError(j.error ?? "Couldn't load your sites."); return }
    setError(null)
    loaded.current = true
    setData(j)
    setEarly(null)
  }, [router])

  useEffect(() => {
    reload()
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u?.user) return
      const { data: p } = await supabase.from("user_profiles").select("first_name, last_name").eq("user_id", u.user.id).maybeSingle()
      setMe({ userId: u.user.id, firstName: p?.first_name ?? "", lastName: p?.last_name ?? "" })
    })()
    const t = setInterval(reload, 5 * 60_000)
    const vis = () => document.visibilityState === "visible" && reload()
    document.addEventListener("visibilitychange", vis)
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis) }
  }, [reload])

  const { bySite, stateOf } = useMemo(() => {
    const bySite = new Map<string, Outage[]>()
    for (const o of data?.outages ?? []) {
      const l = bySite.get(o.site.id) ?? []
      l.push(o)
      bySite.set(o.site.id, l)
    }
    const now = data ? new Date(data.at).getTime() : Date.now()
    const cache = new Map<string, SiteState>()
    const stateOf = (id: string): SiteState => {
      const hit = cache.get(id)
      if (hit) return hit
      const l = bySite.get(id) ?? []
      const off = l.find((o) => o.status !== "Planned")
      let st: SiteState = { k: "clear" }
      if (off) st = { k: "now", o: off }
      else {
        const next = l.filter((o) => o.starts && new Date(o.starts).getTime() - now < 14 * 86400_000)
          .sort((a, b) => new Date(a.starts!).getTime() - new Date(b.starts!).getTime())[0]
        if (next) st = { k: (next.hours ?? 0) >= 4 ? "long" : "soon", o: next }
      }
      cache.set(id, st)
      return st
    }
    return { bySite, stateOf }
  }, [data])

  return <PortalCtx.Provider value={{ data, early, error, me, reload, headers, stateOf, bySite }}>{children}</PortalCtx.Provider>
}

/** True when the device is in dark mode, like the app; follows changes live. */
export function useDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: dark)")
    const on = () => setDark(m.matches)
    on()
    m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [])
  return dark
}

// ---------- time, in each site's own state ----------

const TZ: Record<string, string> = {
  NSW: "Australia/Sydney", ACT: "Australia/Sydney", VIC: "Australia/Melbourne", TAS: "Australia/Hobart",
  QLD: "Australia/Brisbane", SA: "Australia/Adelaide", NT: "Australia/Darwin", WA: "Australia/Perth",
}
export const tz = (s?: string | null) => TZ[(s ?? "").toUpperCase()] ?? "Australia/Sydney"
export const fmt = (d: string | Date, s: string | null | undefined, o: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString("en-AU", { timeZone: tz(s), ...o })
export const time = (d: string | Date, s?: string | null) =>
  fmt(d, s, { hour: "numeric", minute: "2-digit" }).replace(/\s/g, "").toLowerCase()
export const dayKey = (d: string | Date, s?: string | null) => fmt(d, s, { year: "numeric", month: "2-digit", day: "2-digit" })
export const checked = (at: string) =>
  new Date(at).toLocaleTimeString("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", minute: "2-digit" }).replace(/\s/g, " ").toLowerCase()

/** "since 16 Oct" for long-running ones, "since 9:15am" for today's. */
export const since = (o: Outage, at: string) => {
  if (!o.starts) return ""
  const days = (new Date(at).getTime() - new Date(o.starts).getTime()) / 86400_000
  return days >= 1 ? `since ${fmt(o.starts, o.site.state, { day: "numeric", month: "short" })}` : `since ${time(o.starts, o.site.state)}`
}
/** Power off for a week or more with no end: the network's feed has probably stopped updating it. */
export const isStale = (o: Outage, at: string) =>
  !!o.starts && (new Date(at).getTime() - new Date(o.starts).getTime()) / 86400_000 >= 7

export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`
