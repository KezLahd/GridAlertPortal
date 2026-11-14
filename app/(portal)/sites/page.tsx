"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { SitesExportMenu } from "@/components/sites-export-menu"
import { Loading } from "@/components/wattle/shell"
import { useSiteDialogs, useToast } from "@/components/wattle/site-dialogs"
import { fmt, plural, time, usePortal, type Site, type SiteState } from "@/components/wattle/data"

// Sites: every clinic and pharmacy, sorted so the ones with the power off come first, then by the soonest outage.
// Tabs by status, a "needs fixing" tab for sites with no map pin or no state (outages can't be matched to them), and a
// panel with the chosen site's outages and its edit button.

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
  const [sel, setSel] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
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
    && (!t || [x.s.name, x.s.code, x.s.suburb, x.s.postcode, x.s.address, x.s.provider].some((v) => v?.toLowerCase().includes(t))))
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
          <label className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, suburb or postcode" />
          </label>
          <div className="sp" />
          <div className="chips hide-s">
            <button className={`chip ${!state ? "on" : ""}`} onClick={() => setState(null)}>All states</button>
            {states.slice(0, 5).map(([s]) => <button key={s} className={`chip ${state === s ? "on" : ""}`} onClick={() => setState(state === s ? null : s)}>{s}</button>)}
          </div>
          <span className="hide-s"><SitesExportMenu className="btn" label="Export" /></span>
        </div>
        <table className="list">
          <thead><tr><th>Site</th><th className="h-s">Suburb</th><th className="h-s">Network</th><th>Status</th><th className="h-s">Next outage</th></tr></thead>
          <tbody>
            {list.slice(0, limit).map((x) => (
              <tr key={x.s.id} className={`r ${x.s.id === sel ? "sel" : ""}`} onClick={() => { setSel(x.s.id); setOpen(true) }}>
                <td className="n"><b>{x.s.name}</b><span>{x.s.code ? `#${x.s.code} · ` : ""}{x.s.address.split(",")[0]}</span>{x.fix && <span className="miss">{x.fix}</span>}</td>
                <td className="h-s">{x.s.suburb}<div className="sub">{x.s.state ?? "—"} {x.s.postcode}</div></td>
                <td className="h-s num">{x.s.provider ?? "—"}</td>
                <td><Status st={x.st} /></td>
                <td className="h-s num when"><Next st={x.st} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">No sites match.</div>}
        <div className="foot-more"><span>Showing {Math.min(limit, list.length)} of {list.length}</span>{list.length > limit && <button className="more" onClick={() => setLimit(list.length)}>Show all</button>}</div>
      </section>

      <aside className={`detail ${open ? "open" : ""}`}>
        <button className="btn x" onClick={() => setOpen(false)}>Back to sites</button>
        {cur && <Detail s={cur.s} fix={cur.fix} admin={admin} outages={bySite.get(cur.s.id) ?? []} onEdit={() => openEdit(cur.s.id)} />}
      </aside>
      {dialogs}
      {toast}
    </main>
  )
}

const needsFix = (s: Site) => s.lat === null ? "No map pin" : !s.state ? "No state" : null

function Status({ st }: { st: SiteState }) {
  if (st.k === "now") return <span className="stt now"><i className="pulse" />Off now</span>
  if (st.k === "long") return <span className="stt long"><i className="sw long" />{st.o.hours} h · check fridge</span>
  if (st.k === "soon") return <span className="stt soon"><i className="sw soon" />{st.o.hours ?? "?"} h planned</span>
  return <span className="stt clear">All clear</span>
}

function Next({ st }: { st: SiteState }) {
  const o = st.o
  if (!o) return null
  if (st.k === "now") return <>since {o.starts ? fmt(o.starts, o.site.state, { day: "numeric", month: "short" }) : "?"}<div className="sub">{o.ends ? `back ${time(o.ends, o.site.state)}` : "no restore time yet"}</div></>
  return <>{fmt(o.starts!, o.site.state, { weekday: "short", day: "numeric", month: "short" })}<div className="sub">{time(o.starts!, o.site.state)} · {o.atSite ? "at the site" : "nearby"}</div></>
}

function Detail({ s, fix, admin, outages, onEdit }: { s: Site; fix: string | null; admin: boolean; outages: import("@/components/wattle/data").Outage[]; onEdit: () => void }) {
  const l = [...outages].sort((a, b) => Number(b.status !== "Planned") - Number(a.status !== "Planned") || new Date(a.starts ?? 0).getTime() - new Date(b.starts ?? 0).getTime())
  return (
    <>
      <div className="code">{s.code ? `Site #${s.code}` : "Site"}</div>
      <h2>{s.name}</h2>
      <div className="addr">{s.address}</div>
      {fix && <div className="fix" style={{ borderTop: "1px solid var(--line)" }}><i>!</i><div><b>{fix}.</b> Add it so outages can be matched to this site.</div></div>}
      <div className="kv">
        <div><div className="k">Network</div><div className="v">{s.provider ?? "—"}</div></div>
        <div><div className="k">Next 28 days</div><div className="v">{plural(l.length, "outage")}</div></div>
      </div>
      <h3>Coming up</h3>
      {l.length === 0 && <div className="empty">Nothing planned in the next 28 days.</div>}
      {l.slice(0, 6).map((o) => {
        const live = o.status !== "Planned"
        return (
          <div className="ev" key={o.id}>
            <div className={`d ${live ? "now" : ""}`}><small>{live ? "NOW" : fmt(o.starts!, o.site.state, { weekday: "short" }).toUpperCase()}</small><b>{o.starts ? fmt(o.starts, o.site.state, { day: "numeric" }) : "–"}</b></div>
            <div className="t">
              <b>{live ? (o.kind === "unplanned" ? "Fault" : "Planned work under way") : `${time(o.starts!, o.site.state)} to ${o.ends ? time(o.ends, o.site.state) : "?"}`}</b><br />
              {o.hours ? `${o.hours} hours · ` : ""}{o.atSite ? "at the site" : `${(o.distanceKm ?? 0).toFixed(1)} km away`}{o.cause && o.cause.length < 32 ? ` · ${o.cause}` : ""}
              {!live && (o.hours ?? 0) >= 4 && <><br /><span className="fr">Check fridge stock</span></>}
            </div>
          </div>
        )
      })}
      <div className="acts">
        {s.lat !== null && <Link className="btn" href={`/map?site=${s.id}`}>Show on map</Link>}
        {admin && <button className="btn" onClick={onEdit}>Edit site</button>}
      </div>
    </>
  )
}
