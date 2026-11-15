"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { SitesExportMenu } from "@/components/sites-export-menu"
import { Loading } from "@/components/wattle/shell"
import { GhostRows, Wait } from "@/components/wattle/waiting"
import { checked, dayKey, fmt, isStale, plural, since, time, usePortal, type Outage } from "@/components/wattle/data"

const RANK = { now: 0, long: 1, soon: 2, clear: 3 }

// Dashboard: what's off now and what's coming in the next two weeks, drawn in gold dots like the app. Every site as one
// dot (solid = power off now, ring = planned in the next 14 days, grey = clear), the next 14 days as columns of dots
// (solid = 4 hours or longer, so fridge stock needs checking), the agenda by day, and what's off right now.

const DAY = 86400_000

export default function Dashboard() {
  // Shows at once: the page's frame straight away, every site as a grey dot when the sites arrive, then the outages
  // light it up. Until then numbers are breathing dots and lists are rows of dots (components/wattle/waiting.tsx).
  const { data: full, early, error, stateOf } = usePortal()
  const data = full ?? early
  const ready = !!full
  const [filter, setFilter] = useState<{ long: boolean; atSite: boolean; state: string | null }>({ long: false, atSite: false, state: null })
  const [q, setQ] = useState("")
  const [showDays, setShowDays] = useState(4)

  const v = useMemo(() => {
    if (!data) return null
    const now = new Date(data.at).getTime()
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now + i * DAY)
      return { key: dayKey(d, "NSW"), d }
    })
    const planned = data.outages.filter((o) => o.status === "Planned" && o.starts && new Date(o.starts).getTime() - now < 14 * DAY)
    const byDay = new Map<string, Outage[]>()
    for (const o of planned) {
      const k = dayKey(o.starts!, o.site.state)
      byDay.set(k, [...(byDay.get(k) ?? []), o])
    }
    const sitesIn = (l: Outage[]) => new Set(l.map((o) => o.site.id)).size
    const max = Math.max(1, ...days.map((x) => sitesIn(byDay.get(x.key) ?? [])))
    const off = data.outages.filter((o) => o.status !== "Planned")
    const states = new Map<string, Set<string>>()
    for (const o of planned) if (o.site.state) states.set(o.site.state, (states.get(o.site.state) ?? new Set()).add(o.site.id))
    const total = new Map<string, number>()
    for (const s of data.sites) if (s.state) total.set(s.state, (total.get(s.state) ?? 0) + 1)
    return { now, days, planned, byDay, sitesIn, max, off, total, states: [...states].sort((a, b) => b[1].size - a[1].size) }
  }, [data])
  const field = useMemo(() => (data?.sites ?? []).map((s) => stateOf(s.id).k).sort((a, b) => RANK[a] - RANK[b]), [data, stateOf])

  if (error && !data) return <Loading error={error} />
  if (!data || !v) return <Waiting />
  const S = data.summary

  const match = (o: Outage) => {
    if (filter.long && (o.hours ?? 0) < 4) return false
    if (filter.atSite && !o.atSite) return false
    if (filter.state && o.site.state !== filter.state) return false
    const t = q.trim().toLowerCase()
    return !t || [o.site.name, o.site.suburb, o.site.postcode, o.site.code, o.provider].some((x) => x?.toLowerCase().includes(t))
  }
  const agendaDays = v.days.map((x) => x.key).filter((k) => (v.byDay.get(k) ?? []).some(match))
  const unit = Math.max(1, Math.ceil(v.max / 40))
  const count = (k: string) => field.filter((x) => x === k).length
  const toggle = (k: "long" | "atSite") => setFilter((f) => ({ ...f, [k]: !f[k] }))
  const jump = (key: string) => {
    const i = agendaDays.indexOf(key)
    if (i < 0) return
    if (i >= showDays) setShowDays(i + 1)
    setTimeout(() => document.getElementById(`d-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
  }

  return (
    <main>
      <title>Dashboard · Wattle</title>
      <div className="top">
        <div>
          <div className="eyebrow"><i className="dot" />{ready ? `Live · checked ${checked(data.at)}` : "Checking now"}</div>
          <h1>{ready ? <>{S.outNow.sites} {S.outNow.sites === 1 ? "site" : "sites"} off now, {S.next7Days.sites} losing power this week</> : `Checking ${data.sites.length} sites for outages`}</h1>
        </div>
        <div className="actions">
          <label className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sites, suburbs, postcodes" />
          </label>
          <SitesExportMenu className="btn" label="Export" />
        </div>
      </div>

      <section className="glance">
        <div>
          <div className={`field ${ready ? "" : "waiting"}`} aria-label={`${count("now")} off now, ${count("long") + count("soon")} planned, ${count("clear")} clear`}>
            {field.map((k, i) => <i key={i} className={`fd ${k}`} style={{ animationDelay: `${Math.min(i * 2, 700)}ms` }} />)}
          </div>
          <div className="key">
            <span><i className="sw now" /><b>{ready ? count("now") : <Wait />}</b> off now</span>
            <span><i className="sw long" /><b>{ready ? count("long") + count("soon") : <Wait />}</b> planned, next 14 days</span>
            <span><i className="sw clear" /><b>{ready ? count("clear") : <Wait />}</b> clear</span>
          </div>
        </div>
        <div className="figs">
          <Fig hot k="Off now" v={ready ? S.outNow.sites : null} s={`${S.outNow.atSite} with the outage at the site`} />
          <Fig k="Next 3 days" v={ready ? S.next3Days.sites : null} s={`${plural(S.next3Days.outages, "planned outage")}`} />
          <Fig k="Next 7 days" v={ready ? S.next7Days.sites : null} s={`${S.longOnes7Days} run 4 hours or longer`} />
        </div>
      </section>

      <section className="strip">
        <div className="head"><h2>Next 14 days</h2><span className="hint">Sites losing power each day. Tap a day to jump to it.</span></div>
        <div className="days">
          {v.days.map((x, i) => {
            const l = v.byDay.get(x.key) ?? []
            const all = v.sitesIn(l), long = v.sitesIn(l.filter((o) => (o.hours ?? 0) >= 4))
            const wd = fmt(x.d, "NSW", { weekday: "short" })
            const nl = Math.ceil(long / unit), ns = Math.ceil(all / unit) - nl
            return (
              <button key={x.key} className={`day ${i === 0 ? "sel" : ""} ${wd === "Sat" || wd === "Sun" ? "we" : ""}`} title={plural(all, "site")} onClick={() => jump(x.key)}>
                <div className="n">{all || ""}</div>
                <div className={`stack ${ready ? "" : "waiting"}`}>
                  {Array.from({ length: nl }, (_, j) => <i key={`l${j}`} className="fd long" style={{ animationDelay: `${i * 30 + j * 8}ms` }} />)}
                  {Array.from({ length: ns }, (_, j) => <i key={`s${j}`} className="fd soon" style={{ animationDelay: `${i * 30 + (nl + j) * 8}ms` }} />)}
                  {all === 0 && (ready ? <i className="fd clear" /> : [0, 1, 2].map((j) => <i key={j} className="fd clear" style={{ animationDelay: `${i * 90 + j * 60}ms` }} />))}
                </div>
                <div className="lbl">{i === 0 ? "Today" : wd}<b>{fmt(x.d, "NSW", { day: "numeric" })}</b></div>
              </button>
            )
          })}
        </div>
        <div className="legend">
          <span><i className="sw solid" />4 hours or longer, check fridge stock</span>
          <span><i className="sw soon" />shorter</span>
          {unit > 1 && <span>each dot is {unit} sites</span>}
        </div>
      </section>

      <div className="cols">
        <section className="sec">
          <div className="head"><h2>Coming up</h2><span className="hint">{ready ? plural(v.planned.filter(match).length, "planned outage") : <Wait />}</span></div>
          {ready && <div className="chips" style={{ margin: "10px 0 4px" }}>
            <button className={`chip ${!filter.long && !filter.atSite && !filter.state ? "on" : ""}`} onClick={() => setFilter({ long: false, atSite: false, state: null })}>All sites</button>
            <button className={`chip ${filter.long ? "on" : ""}`} onClick={() => toggle("long")}>4 hours+</button>
            <button className={`chip ${filter.atSite ? "on" : ""}`} onClick={() => toggle("atSite")}>At the site only</button>
            {v.states.map(([st]) => (
              <button key={st} className={`chip ${filter.state === st ? "on" : ""}`} onClick={() => setFilter((f) => ({ ...f, state: f.state === st ? null : st }))}>{st}</button>
            ))}
          </div>}
          {!ready && <GhostRows rows={6} />}
          {ready && agendaDays.length === 0 && <div className="empty">Nothing planned that matches.</div>}
          {agendaDays.slice(0, showDays).map((k) => {
            const l = (v.byDay.get(k) ?? []).filter(match).sort((a, b) => new Date(a.starts!).getTime() - new Date(b.starts!).getTime())
            const first = l[0]
            const label = k === v.days[0].key ? "Today" : k === v.days[1].key ? "Tomorrow" : fmt(first.starts!, first.site.state, { weekday: "long", day: "numeric", month: "long" })
            return <DayGroup key={k} id={`d-${k}`} label={label} list={l} sites={v.sitesIn(l)} />
          })}
          {agendaDays.length > showDays && <button className="more" onClick={() => setShowDays((n) => n + 4)}>Show more days</button>}
        </section>

        <aside className="side">
          <section className="sec now">
            <div className="head"><h2>Off now</h2><span className="hint">{ready ? plural(new Set(v.off.map((o) => o.site.id)).size, "site") : <Wait />}</span></div>
            {!ready && <GhostRows rows={3} label="Checking which sites have power" />}
            {ready && v.off.length === 0 && <div className="empty">Every site has power.</div>}
            {v.off.map((o) => (
              <div className="item" key={o.id}>
                <i className={`pulse ${o.kind === "unplanned" ? "" : "planned"}`} />
                <div style={{ minWidth: 0 }}>
                  <b>{o.site.name}{isStale(o, data.at) && <span className="stale">feed may be stale</span>}</b>
                  <div className="m">{o.kind === "unplanned" ? <em>Fault</em> : "Planned work"} · {since(o, data.at)} · {o.ends ? `back ${time(o.ends, o.site.state)}` : "no restore time yet"}</div>
                  <div className="m">{o.site.suburb} {o.site.state} · {o.atSite ? "at the site" : `${(o.distanceKm ?? 0).toFixed(1)} km away`} · {o.provider}</div>
                </div>
              </div>
            ))}
            <Link className="more" href="/map">See them on the map</Link>
          </section>
          <section className="sec states">
            <div className="head"><h2>By state, next 14 days</h2></div>
            {!ready && <GhostRows rows={4} ring={false} />}
            {v.states.map(([st, s]) => {
              const n = v.total.get(st) ?? s.size
              return (
                <div className="st" key={st}><b>{st}</b>
                  <div className="ticks" title={`${s.size} of ${n} sites`}>{Array.from({ length: n }, (_, j) => <i key={j} className={j < s.size ? "on" : ""} />)}</div>
                  <span><b>{s.size}</b> of {n}</span></div>
              )
            })}
          </section>
        </aside>
      </div>
    </main>
  )
}

function Fig({ k, v, s, hot }: { k: string; v: number | null; s: string; hot?: boolean }) {
  return <div className={`fig ${hot ? "hot" : ""}`}><div className="k">{k}</div><div className="v">{v === null ? <Wait /> : <>{v}<small>{v === 1 ? "site" : "sites"}</small></>}</div><div className="s">{v === null ? "" : s}</div></div>
}

/** Before the sites arrive: the page's own frame, with dots standing in for what's coming. */
function Waiting() {
  return (
    <main>
      <title>Dashboard · Wattle</title>
      <div className="top"><div><div className="eyebrow"><i className="dot" />Checking now</div><h1>Finding your sites</h1></div></div>
      <section className="glance">
        <div><div className="field waiting">{Array.from({ length: 120 }, (_, i) => <i key={i} className="fd clear" style={{ animationDelay: `${(i % 40) * 30}ms` }} />)}</div></div>
        <div className="figs">{["Off now", "Next 3 days", "Next 7 days"].map((k, i) => <Fig key={k} hot={i === 0} k={k} v={null} s="" />)}</div>
      </section>
      <div className="cols">
        <section className="sec"><div className="head"><h2>Coming up</h2></div><GhostRows rows={6} /></section>
        <aside className="side"><section className="sec now"><div className="head"><h2>Off now</h2></div><GhostRows rows={3} /></section></aside>
      </div>
    </main>
  )
}

function DayGroup({ id, label, list, sites }: { id: string; label: string; list: Outage[]; sites: number }) {
  const [all, setAll] = useState(false)
  const shown = all ? list : list.slice(0, 5)
  return (
    <>
      <div className="dayhead" id={id}>{label}<span>{plural(sites, "site")}</span></div>
      {shown.map((o) => {
        const h = o.hours ?? 0
        return (
          <div className="row" key={o.id}>
            <div className="t"><b>{time(o.starts!, o.site.state)}</b><br />to {o.ends ? time(o.ends, o.site.state) : "?"}</div>
            <div className="site"><b>{o.site.name}</b><span>{o.site.suburb} {o.site.state} · {o.provider}</span></div>
            <div className={`dur ${h >= 4 ? "" : "short"}`}>
              <div className="track"><i style={{ width: `${Math.min(h / 12, 1) * 100}%` }} /></div>
              <small>{h >= 4 ? <><b>{h} h</b> · check fridge</> : `${o.hours ?? "?"} h`}</small>
            </div>
            <div className={`reach ${o.atSite ? "at" : ""}`}>{o.atSite ? "At the site" : "Nearby"}</div>
          </div>
        )
      })}
      {list.length > 5 && <button className="more" onClick={() => setAll(!all)}>{all ? "Show fewer" : `${list.length - 5} more on this day`}</button>}
    </>
  )
}
