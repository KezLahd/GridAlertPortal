"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { SitesExportMenu } from "@/components/sites-export-menu"
import { Loading } from "@/components/wattle/shell"
import { checked, dayKey, fmt, isStale, plural, since, time, usePortal, type Outage } from "@/components/wattle/data"

// Overview: what's off now and what's coming in the next two weeks, at a glance. Figures on hairlines, a 14-day
// strip (gold = 4 hours or longer, so fridge stock needs checking), the agenda by day, and what's off right now.

const DAY = 86400_000

export default function Overview() {
  const { data, error } = usePortal()
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
    return { now, days, planned, byDay, sitesIn, max, off, states: [...states].sort((a, b) => b[1].size - a[1].size) }
  }, [data])

  if (!data || !v) return <Loading error={error} />
  const S = data.summary

  const match = (o: Outage) => {
    if (filter.long && (o.hours ?? 0) < 4) return false
    if (filter.atSite && !o.atSite) return false
    if (filter.state && o.site.state !== filter.state) return false
    const t = q.trim().toLowerCase()
    return !t || [o.site.name, o.site.suburb, o.site.postcode, o.site.code, o.provider].some((x) => x?.toLowerCase().includes(t))
  }
  const agendaDays = v.days.map((x) => x.key).filter((k) => (v.byDay.get(k) ?? []).some(match))
  const sm = Math.max(1, ...v.states.map(([, s]) => s.size))
  const toggle = (k: "long" | "atSite") => setFilter((f) => ({ ...f, [k]: !f[k] }))
  const jump = (key: string) => {
    const i = agendaDays.indexOf(key)
    if (i < 0) return
    if (i >= showDays) setShowDays(i + 1)
    setTimeout(() => document.getElementById(`d-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
  }

  return (
    <main>
      <title>Overview · Wattle</title>
      <div className="top">
        <div>
          <div className="eyebrow"><i className="dot" />Live · checked {checked(data.at)}</div>
          <h1>{S.outNow.sites} {S.outNow.sites === 1 ? "site" : "sites"} off now, {S.next7Days.sites} losing power this week</h1>
        </div>
        <div className="actions">
          <label className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sites, suburbs, postcodes" />
          </label>
          <SitesExportMenu className="btn" label="Export" />
        </div>
      </div>

      <section className="figs">
        <Fig hot k="Off now" v={S.outNow.sites} s={`${S.outNow.atSite} with the outage at the site`} />
        <Fig k="Next 3 days" v={S.next3Days.sites} s={`${plural(S.next3Days.outages, "planned outage")}`} />
        <Fig k="Next 7 days" v={S.next7Days.sites} s={`${S.longOnes7Days} run 4 hours or longer`} />
        <Fig k="All clear" v={S.sites - new Set([...v.off, ...data.outages].map((o) => o.site.id)).size} s={`of ${S.sites}, nothing in the next 28 days`} />
      </section>

      <section className="strip">
        <div className="head"><h2>Next 14 days</h2><span className="hint">Sites losing power each day. Tap a day to jump to it.</span></div>
        <div className="days">
          {v.days.map((x, i) => {
            const l = v.byDay.get(x.key) ?? []
            const all = v.sitesIn(l), long = v.sitesIn(l.filter((o) => (o.hours ?? 0) >= 4))
            const wd = fmt(x.d, "NSW", { weekday: "short" })
            return (
              <button key={x.key} className={`day ${i === 0 ? "sel" : ""} ${wd === "Sat" || wd === "Sun" ? "we" : ""}`} title={plural(all, "site")} onClick={() => jump(x.key)}>
                <div className="bar" style={{ height: `${Math.max((all / v.max) * 100, 3)}%` }}><i style={{ height: `${all ? (long / all) * 100 : 0}%` }} /></div>
                <div className="lbl">{i === 0 ? "Today" : wd}<b>{fmt(x.d, "NSW", { day: "numeric" })}</b></div>
              </button>
            )
          })}
        </div>
        <div className="legend">
          <span><i style={{ background: "var(--gold)" }} />4 hours or longer, check fridge stock</span>
          <span><i style={{ background: "var(--gold-soft)" }} />shorter</span>
        </div>
      </section>

      <div className="cols">
        <section className="sec">
          <div className="head"><h2>Coming up</h2><span className="hint">{plural(v.planned.filter(match).length, "planned outage")}</span></div>
          <div className="chips" style={{ margin: "10px 0 4px" }}>
            <button className={`chip ${!filter.long && !filter.atSite && !filter.state ? "on" : ""}`} onClick={() => setFilter({ long: false, atSite: false, state: null })}>All sites</button>
            <button className={`chip ${filter.long ? "on" : ""}`} onClick={() => toggle("long")}>4 hours+</button>
            <button className={`chip ${filter.atSite ? "on" : ""}`} onClick={() => toggle("atSite")}>At the site only</button>
            {v.states.map(([st]) => (
              <button key={st} className={`chip ${filter.state === st ? "on" : ""}`} onClick={() => setFilter((f) => ({ ...f, state: f.state === st ? null : st }))}>{st}</button>
            ))}
          </div>
          {agendaDays.length === 0 && <div className="empty">Nothing planned that matches.</div>}
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
            <div className="head"><h2>Off now</h2><span className="hint">{plural(new Set(v.off.map((o) => o.site.id)).size, "site")}</span></div>
            {v.off.length === 0 && <div className="empty">Every site has power.</div>}
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
            {v.states.map(([st, s]) => (
              <div className="st" key={st}><b>{st}</b><div className="track"><i style={{ width: `${(s.size / sm) * 100}%` }} /></div><span>{s.size}</span></div>
            ))}
          </section>
        </aside>
      </div>
    </main>
  )
}

function Fig({ k, v, s, hot }: { k: string; v: number; s: string; hot?: boolean }) {
  return <div className={`fig ${hot ? "hot" : ""}`}><div className="k">{k}</div><div className="v">{v}<small>{v === 1 ? "site" : "sites"}</small></div><div className="s">{s}</div></div>
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
