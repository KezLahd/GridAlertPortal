"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { SitesExportMenu } from "@/components/sites-export-menu"
import { Loading } from "@/components/wattle/shell"
import { useSiteDialogs, useToast } from "@/components/wattle/site-dialogs"
import { fmt, plural, since, time, usePortal, type Outage, type Site, type SiteState } from "@/components/wattle/data"
import { backAt, DayBar, GlanceList } from "@/components/wattle/glance"
import { NetLink, netName, netTint } from "@/components/wattle/networks"
import { Opt, Pick, Sep } from "@/components/wattle/pick"

// Sites: every clinic and pharmacy, sorted so the ones with the power off come first, then by the soonest outage.
// Tabs by status, a "needs fixing" tab for sites with no map pin or no state (outages can't be matched to them), and a
// glass panel with the chosen site's outages (as glances that open into their day) and its edit button. Rows are the
// app's: a status dot, the name with one line under it, the time on the right and the outage drawn thin on its day.

type Tab = "all" | "now" | "next" | "clear" | "fix"
const RANK = { now: 0, long: 1, soon: 2, clear: 3 }
const PAGE = 60

export default function SitesPage() {
  return <Suspense fallback={<Loading />}><Sites /></Suspense>
}

function Sites() {
  const { data, error, stateOf, bySite } = usePortal()
  const params = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "all")
  const [state, setState] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [limit, setLimit] = useState(PAGE)
  // ?site=… (from Organisation's list) opens that site's panel
  const [sel, setSel] = useState<string | null>(params.get("site"))
  const [open, setOpen] = useState(!!params.get("site"))
  const { show, toast } = useToast()
  const { openAdd, openImport, openEdit, dialogs } = useSiteDialogs(show)
  const admin = data?.role === "admin"

  const all = useMemo(() => (data?.sites ?? []).map((s) => ({ s, st: stateOf(s.id), fix: needsFix(s) }))
    .sort((a, b) => RANK[a.st.k] - RANK[b.st.k]
      || (a.st.o?.starts && b.st.o?.starts ? new Date(a.st.o.starts).getTime() - new Date(b.st.o.starts).getTime() : 0)
      || a.s.name.localeCompare(b.s.name)), [data, stateOf])
  useEffect(() => { if (!sel && all.length) setSel((all.find((x) => x.st.k !== "clear") ?? all[0]).s.id) }, [all, sel])
  useEffect(() => setLimit(PAGE), [tab, state, q])

  if (!data) return <Loading error={error} />

  const inTab = (x: (typeof all)[number], t: Tab) =>
    t === "all" || (t === "next" ? x.st.k === "long" || x.st.k === "soon" : t === "fix" ? !!x.fix : x.st.k === t)
  const t = q.trim().toLowerCase()
  const list = all.filter((x) => inTab(x, tab) && (!state || x.s.state === state)
    && (!t || [x.s.name, x.s.code, x.s.number, x.s.suburb, x.s.postcode, x.s.address, x.s.provider].some((v) => v?.toLowerCase().includes(t))))
  const noPin = all.filter((x) => x.s.lat === null).length, noState = all.filter((x) => !x.s.state).length
  const states = [...all.reduce((m, x) => x.s.state ? m.set(x.s.state, (m.get(x.s.state) ?? 0) + 1) : m, new Map<string, number>())].sort((a, b) => b[1] - a[1])
  const cur = all.find((x) => x.s.id === sel)

  return (
    <main className="sts">
      <title>Sites · Wattle</title>
      <section className="st-main">
        <div className="top">
          <div><div className="eyebrow">{data.company} · every clinic and pharmacy you watch</div><h1>Sites</h1></div>
          {admin && <div className="actions"><button className="btn hide-s" onClick={openImport}>Import CSV</button><button className="btn gold" onClick={openAdd}>+ Add site</button></div>}
        </div>
        <div className="tabs">
          {([["all", "All"], ["now", "Off now"], ["next", "Next 14 days"], ["clear", "All clear"], ["fix", "Needs fixing"]] as const).map(([k, l]) => (
            <button key={k} className={`tab ${k === tab ? "on" : ""} ${k === "fix" ? "warn" : ""}`} onClick={() => setTab(k)}>{l}<b>{all.filter((x) => inTab(x, k)).length}</b></button>
          ))}
        </div>
        {(noPin > 0 || noState > 0) && tab !== "fix" && (
          <div className="fix"><i>!</i><div><b>{[noPin && plural(noPin, "site") + " with no map pin", noState && `${noState} with no state`].filter(Boolean).join(" and ")}</b>, so outages can&apos;t be matched to them yet.</div><button onClick={() => setTab("fix")}>Fix them</button></div>
        )}
        <div className="tools">
          <label className="mp-find st-find">
            <svg viewBox="0 0 16 16" aria-hidden><circle cx="7" cy="7" r="4.6" /><path d="m10.4 10.4 3.4 3.4" /></svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, suburb or postcode" aria-label="Search sites" />
            {q && <button onClick={() => setQ("")} aria-label="Clear search">×</button>}
          </label>
          <div className="mp-filters st-filters hide-s">
            <Pick label="State" value={state ? (state === "NULL" ? "No state" : state) : "Every state"} active={!!state}>
              {(close) => <>
                <Opt on={!state} n={all.length} onPick={() => { setState(null); close() }}>Every state</Opt>
                <Sep />
                {states.map(([st, n]) => <Opt key={st} on={state === st} n={n} onPick={() => { setState(st); close() }}>{st === "NULL" ? "No state" : st}</Opt>)}
              </>}
            </Pick>
          </div>
          <div className="sp" />
          <span className="hide-s"><SitesExportMenu className="btn" label="Export" /></span>
        </div>
        <div className="srs" role="list">
          {list.slice(0, limit).map((x) => (
            <button key={x.s.id} role="listitem" className={`sr ${x.s.id === sel ? "sel" : ""}`} onClick={() => { setSel(x.s.id); setOpen(true) }}>
              <i className={`sw ${x.st.k}`} />
              <span className="nm">
                <b>{x.s.name}</b>
                <span>{detail(x.s, x.st, x.fix)}</span>
              </span>
              <span className="net h-s"><i style={{ background: netTint(x.s.provider) }} />{netName(x.s.provider)}</span>
              <span className={`when ${x.st.k}`}>{trailing(x.st, data.at)}</span>
              {x.st.o && <DayBar o={x.st.o} at={data.at} />}
            </button>
          ))}
        </div>
        {list.length === 0 && <div className="empty">No sites match.</div>}
        <div className="foot-more"><span>Showing {Math.min(limit, list.length)} of {list.length}</span>{list.length > limit && <button className="more" onClick={() => setLimit(list.length)}>Show all</button>}</div>
      </section>

      <aside className={`detail ${open ? "open" : ""}`}>
        <button className="btn x" onClick={() => setOpen(false)}>Back to sites</button>
        {cur && <Detail s={cur.s} fix={cur.fix} admin={admin} outages={bySite.get(cur.s.id) ?? []} at={data.at} onEdit={() => openEdit(cur.s.id)} />}
      </aside>
      {dialogs}
      {toast}
    </main>
  )
}

const needsFix = (s: Site) => s.lat === null ? "No map pin" : !s.state ? "No state" : null

/** The line under a site's name: what's happening, or where it is when all is clear. */
function detail(s: Site, st: SiteState, fix: string | null) {
  if (fix) return <em className="miss">{fix}</em>
  const o = st.o
  if (st.k === "now") return <>{o!.kind === "unplanned" ? "Fault" : "Planned work"}{o!.atSite ? " at the site" : " nearby"} · {s.suburb ?? ""} {s.state ?? ""}</>
  if (st.k === "long" || st.k === "soon") return <>Planned, {o!.hours ?? "?"} h{st.k === "long" ? " · check fridge" : ""} · {o!.atSite ? "at the site" : "nearby"}</>
  return <>{s.code ? `${s.number ?? `#${s.code}`} · ` : ""}{[s.suburb, s.state && s.state !== "NULL" ? s.state : null, s.postcode].filter(Boolean).join(" ")}</>
}

/** The time on the right: when it's back, or when it starts. */
function trailing(st: SiteState, at: string) {
  const o = st.o
  if (!o) return null
  if (st.k === "now") return o.ends ? `Back ${backAt(o.ends, o.site.state, at)}` : since(o, at)
  return `${fmt(o.starts!, o.site.state, { weekday: "short", day: "numeric" })} · ${time(o.starts!, o.site.state)}`
}

/** In a site's own panel the site goes without saying: name the outage instead. */
const what = (o: Outage) => o.status !== "Planned"
  ? `${o.kind === "unplanned" ? "Fault" : "Planned work"}, ${o.atSite ? "at the site" : "nearby"}`
  : `${time(o.starts!, o.site.state)} to ${o.ends ? time(o.ends, o.site.state) : "?"}${o.atSite ? ", at the site" : ""}`

function Detail({ s, fix, admin, outages, at, onEdit }: { s: Site; fix: string | null; admin: boolean; outages: Outage[]; at: string; onEdit: () => void }) {
  const l = [...outages].sort((a, b) => Number(b.status !== "Planned") - Number(a.status !== "Planned") || new Date(a.starts ?? 0).getTime() - new Date(b.starts ?? 0).getTime())
  return (
    <>
      <div className="code">{s.code ? `Site ${s.number ?? `#${s.code}`}` : "Site"}</div>
      <h2>{s.name}</h2>
      <div className="addr">{s.address}</div>
      {fix && <div className="fix"><i>!</i><div><b>{fix}.</b> Add it so outages can be matched to this site.</div></div>}
      <dl className="facts">
        <dt>Network</dt><dd><NetLink p={s.provider} /></dd>
        <dt>Next 28 days</dt><dd>{plural(l.length, "outage")}</dd>
      </dl>
      <h3>Coming up</h3>
      {l.length === 0 ? <div className="empty">Nothing planned in the next 28 days.</div> : <GlanceList key={s.id} list={l} at={at} limit={8} name={what} lead="date" />}
      <div className="acts">
        {s.lat !== null && <Link className="btn" href={`/map?site=${s.id}`}>Show on map</Link>}
        {admin && <button className="btn" onClick={onEdit}>Edit site</button>}
      </div>
    </>
  )
}
