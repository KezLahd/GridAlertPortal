"use client"

import { getSupabaseClient } from "@/lib/supabase"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "ok" | "warning" | "stale" | "blocked"

interface ProviderHealth {
  key: string
  name: string
  source: "railway" | "office"
  status: Status
  last_write_at: string | null
  stale_after: string
  last_run_at: string | null
  last_outcome: string | null
  last_http_status: number | null
  last_detail: string | null
  last_items: number | null
  last_ok_at: string | null
  failures_since_ok: number
  blocked_since: string | null
  restarts_24h: number
  last_restart_at: string | null
  last_restart_detail: string | null
}

interface Problem {
  id: number
  provider: string
  source: string
  host: string | null
  started_at: string
  outcome: "error" | "blocked" | "restart"
  http_status: number | null
  detail: string | null
}

interface HealthResponse {
  checkedAt: string
  providers: ProviderHealth[]
  problems: Problem[]
  office: { host: string; started_at: string } | null
}

const STATUS_LABEL: Record<Status, string> = {
  ok: "Fresh",
  warning: "Hiccup",
  stale: "Stale",
  blocked: "Blocked",
}

const OUTCOME_LABEL: Record<Problem["outcome"], string> = {
  error: "Failed",
  blocked: "Blocked",
  restart: "Restarted",
}

const OFFICE_QUIET_AFTER = 25 * 60 * 1000

function ago(iso: string | null, now: number) {
  if (!iso) return "never"
  const mins = Math.round((now - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

// What a row says after its status: the reason it isn't fresh, or how much it collected.
function note(p: ProviderHealth, now: number) {
  if (p.status === "blocked") {
    const code = p.last_http_status ? ` (${p.last_http_status})` : ""
    const since = p.blocked_since ? `since ${when(p.blocked_since)}` : ""
    return `Refused us${code} ${since}, ${p.failures_since_ok} attempt${p.failures_since_ok === 1 ? "" : "s"} in a row`
  }
  if (p.status === "stale") {
    return p.last_write_at ? `No new data for ${ago(p.last_write_at, now).replace(" ago", "")}` : "Never written"
  }
  if (p.status === "warning") {
    if (p.last_restart_at && now - new Date(p.last_restart_at).getTime() < 3600000) {
      return `Restarted ${ago(p.last_restart_at, now)}${p.last_restart_detail ? `: ${p.last_restart_detail}` : ""}`
    }
    return `Last attempt failed: ${p.last_detail ?? "unknown error"}`
  }
  if (p.source === "office" && p.last_items != null) return `${p.last_items} outages last run`
  if (p.restarts_24h > 0) return `${p.restarts_24h} restart${p.restarts_24h === 1 ? "" : "s"} today`
  return ""
}

function Dot({ status }: { status: Status }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        status === "ok" ? "bg-neutral-300" : "bg-primary",
        status === "blocked" && "ring-4 ring-primary/20",
      )}
    />
  )
}

function ProviderRow({ p, now }: { p: ProviderHealth; now: number }) {
  const trouble = p.status !== "ok"
  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3.5 sm:grid-cols-[12rem_7rem_8rem_1fr]">
      <span className="font-medium text-neutral-900">{p.name}</span>
      <span className={cn("flex items-center gap-2 text-sm", trouble ? "font-semibold text-primary" : "text-neutral-500")}>
        <Dot status={p.status} />
        {STATUS_LABEL[p.status]}
      </span>
      <span className="text-sm tabular-nums text-neutral-500">Data {ago(p.last_write_at, now)}</span>
      <span className={cn("col-span-2 sm:truncate text-sm sm:col-span-1", trouble ? "text-neutral-800" : "text-neutral-400")} title={note(p, now)}>
        {note(p, now)}
      </span>
    </li>
  )
}

function Group({ title, caption, providers, now }: { title: string; caption: string; providers: ProviderHealth[]; now: number }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
      <p className="mt-1 text-sm text-neutral-400">{caption}</p>
      <ul className="mt-2 divide-y divide-neutral-200 border-y border-neutral-200">
        {providers.map((p) => (
          <ProviderRow key={p.key} p={p} now={now} />
        ))}
      </ul>
    </section>
  )
}

export default function OpsPage() {
  const router = useRouter()
  const [data, setData] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: session } = await getSupabaseClient().auth.getSession()
      const token = session.session?.access_token
      if (!token) {
        router.replace("/login")
        return
      }
      const response = await fetch("/api/ops/health", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const body = await response.json()
      if (!response.ok) throw new Error(response.status === 403 ? "This page is for GridAlert operators." : body.error)
      setData(body)
      setError(null)
    } catch (e: any) {
      setError(e.message ?? "Couldn't load feed health")
    } finally {
      setNow(Date.now())
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [load])

  const providers = data?.providers ?? []
  const counts = providers.reduce<Record<Status, number>>(
    (n, p) => ({ ...n, [p.status]: n[p.status] + 1 }),
    { ok: 0, warning: 0, stale: 0, blocked: 0 },
  )
  const names = Object.fromEntries(providers.map((p) => [p.key, p.name]))
  const officeQuiet = data?.office ? now - new Date(data.office.started_at).getTime() > OFFICE_QUIET_AFTER : true

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Feed health</h1>
            <p className="mt-2 text-neutral-500">
              {data
                ? [
                    `${counts.ok} fresh`,
                    counts.blocked && `${counts.blocked} blocked`,
                    counts.stale && `${counts.stale} stale`,
                    counts.warning && `${counts.warning} with a hiccup`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Loading…"}
            </p>
          </div>
          <button
            onClick={load}
            className="mt-1 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {data ? `Checked ${new Date(data.checkedAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}` : "Refresh"}
          </button>
        </header>

        {error && <p className="mt-8 border-l-2 border-primary pl-4 text-neutral-800">{error}</p>}

        {data && (
          <>
            <p className={cn("mt-8 flex items-center gap-2 text-sm", officeQuiet ? "font-semibold text-primary" : "text-neutral-500")}>
              <Dot status={officeQuiet ? "stale" : "ok"} />
              {data.office
                ? `Office runner on ${data.office.host}, last seen ${ago(data.office.started_at, now)}${officeQuiet ? ". Check the machine is on and logged in." : ""}`
                : "Office runner hasn't reported yet."}
            </p>

            <Group
              title="Office runner"
              caption="Feeds that refuse cloud servers, collected every 10 minutes from the office machine."
              providers={providers.filter((p) => p.source === "office")}
              now={now}
            />
            <Group
              title="Railway"
              caption="Collected every 5 minutes in the cloud."
              providers={providers.filter((p) => p.source === "railway")}
              now={now}
            />

            <section className="mt-12">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Problems in the last 7 days</h2>
              {data.problems.length === 0 ? (
                <p className="mt-3 text-neutral-400">None.</p>
              ) : (
                <ul className="mt-2 divide-y divide-neutral-200 border-y border-neutral-200">
                  {data.problems.map((r) => (
                    <li key={r.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3 text-sm sm:grid-cols-[11rem_10rem_6rem_1fr]">
                      <span className="tabular-nums text-neutral-500">{when(r.started_at)}</span>
                      <span className="font-medium text-neutral-900">{names[r.provider] ?? r.provider}</span>
                      <span className={cn(r.outcome === "blocked" ? "font-semibold text-primary" : "text-neutral-500")}>
                        {OUTCOME_LABEL[r.outcome]}
                        {r.http_status ? ` ${r.http_status}` : ""}
                      </span>
                      <span className="col-span-2 sm:truncate text-neutral-500 sm:col-span-1" title={r.detail ?? ""}>
                        {r.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="mt-12 max-w-2xl text-sm leading-relaxed text-neutral-400">
              Blocked means the distributor's site refused the request (401, 403 or 429, or a &ldquo;checking your
              browser&rdquo; page) and nothing has arrived since. One blocked run can be a blip; if it holds for a few
              hours, email that distributor and say what the data is for. Stale means no new data inside the expected
              window, even though nothing refused us.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
