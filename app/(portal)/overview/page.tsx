"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { SitesExportMenu } from "@/components/sites-export-menu"
import { Loading } from "@/components/wattle/shell"
import { GhostRows, Wait } from "@/components/wattle/waiting"
import { dayKey, fmt, plural, usePortal, type Outage } from "@/components/wattle/data"
import { BackOnGlance, DaysGlance, Fold, GlanceList } from "@/components/wattle/glance"
import { Opt, Sep } from "@/components/wattle/pick"
import { FoldBar, MenuHead, PoweredBy, RoundMenu, SearchBar } from "@/components/wattle/kit"

const RANK = { now: 0, long: 1, soon: 2, clear: 3 }

// Dashboard, like the app's: three figures, then sections that fold away, each with a glance that stays on show while
// it's shut and changes shape as it opens. Out now (how many are still out, stepping down as each is due back), the next
// 14 days (a dot per outage under each day, rising into columns), and where your sites are. Outages are rows that open
// into their day. Straight on the page with hairlines between, no cards.

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
  const titleRef = useRef<HTMLHeadingElement>(null)

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
    return !t || [o.site.name, o.site.suburb, o.site.postcode, o.site.code, o.site.number, o.provider].some((x) => x?.toLowerCase().includes(t))
  }
  const agendaDays = v.days.map((x) => x.key).filter((k) => (v.byDay.get(k) ?? []).some(match))
  const count = (k: string) => field.filter((x) => x === k).length
  const toggle = (k: "long" | "atSite") => setFilter((f) => ({ ...f, [k]: !f[k] }))
  const jump = (key: string) => {
    const i = agendaDays.indexOf(key)
    if (i < 0) return
    if (i >= showDays) setShowDays(i + 1)
    setTimeout(() => document.getElementById(`d-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
  }

  const off = v.off.filter(match).sort((a, b) => (a.ends ? new Date(a.ends).getTime() : Infinity) - (b.ends ? new Date(b.ends).getTime() : Infinity))
  const offSites = new Set(v.off.map((o) => o.site.id)).size
  const strip = v.days.map((x) => {
    const l = (v.byDay.get(x.key) ?? []).filter(match)
    return { key: x.key, d: x.d, n: v.sitesIn(l), long: v.sitesIn(l.filter((o) => (o.hours ?? 0) >= 4)) }
  })
  const plannedN = v.sitesIn(v.planned.filter(match))

  return (
    <main className="dash">
      <title>Dashboard · Wattle</title>
      <FoldBar title="Dashboard" watch={titleRef} />
      <div className="top">
        <div>
          <h1 ref={titleRef}>{ready ? <>{S.outNow.sites} {S.outNow.sites === 1 ? "site" : "sites"} off now, {S.next7Days.sites} losing power this week</> : `Checking ${data.sites.length} sites for outages`}</h1>
        </div>
      </div>

      {/* the app's controls: a glass search, the filters in a round glass button, and the export beside them */}
      <div className="ptools">
        <SearchBar value={q} onChange={setQ} placeholder="Search sites, suburbs, postcodes" />
        {ready && <RoundMenu label="Filter the planned outages" active={filter.long || filter.atSite || !!filter.state}>{(close) => <>
          <MenuHead>Show</MenuHead>
          <Opt check on={filter.long} hint="Long enough to put fridge stock at risk" onPick={() => toggle("long")}>4 hours or longer</Opt>
          <Opt check on={filter.atSite} hint="Not just nearby" onPick={() => toggle("atSite")}>At the site only</Opt>
          <Sep /><MenuHead>State</MenuHead>
          <Opt on={!filter.state} onPick={() => { setFilter((f) => ({ ...f, state: null })); close() }}>Every state</Opt>
          {v.states.map(([st, set]) => <Opt key={st} on={filter.state === st} n={set.size} onPick={() => { setFilter((f) => ({ ...f, state: st })); close() }}>{st}</Opt>)}
        </>}</RoundMenu>}
        <SitesExportMenu className="rb glassy" label="Export" iconOnly />
      </div>

      <div className="dfigs">
        <div className="now"><b>{ready ? S.outNow.sites : <Wait />}</b><span><i className="sw now" />Off now</span><small>{ready ? `${S.outNow.atSite} at the site itself` : ""}</small></div>
        <div><b>{ready ? S.next7Days.sites : <Wait />}</b><span><i className="sw long" />This week</span><small>{ready ? `${S.longOnes7Days} run 4 hours or longer` : ""}</small></div>
        <div><b>{ready ? count("clear") : <Wait />}</b><span><i className="sw clear" />All clear</span><small>no outage in the next 14 days</small></div>
      </div>

      <div className="folds">
        <Fold title="Out now" value={ready ? String(offSites) : <Wait />} hot={offSites > 0} open={!ready || offSites > 0}
          glance={(open) => ready ? <BackOnGlance out={off} at={data.at} open={open} /> : <GhostRows rows={1} ring={false} />}>
          {ready && off.length > 0 && <>
            <GlanceList list={off} at={data.at} limit={10} />
            <Link className="fold-more" href="/map">See them on the map</Link>
          </>}
        </Fold>

        <Fold title="Next 14 days" value={ready ? String(plannedN) : <Wait />} open
          glance={(open) => <DaysGlance days={strip} open={open && ready} onDay={jump} />}>
          {ready && <>
            {agendaDays.length === 0 && <div className="empty">Nothing planned that matches.</div>}
            {agendaDays.slice(0, showDays).map((k) => {
              const l = (v.byDay.get(k) ?? []).filter(match).sort((a, b) => new Date(a.starts!).getTime() - new Date(b.starts!).getTime())
              const first = l[0]
              const label = k === v.days[0].key ? "Today" : k === v.days[1].key ? "Tomorrow" : fmt(first.starts!, first.site.state, { weekday: "long", day: "numeric", month: "long" })
              return (
                <div key={k} id={`d-${k}`} className="dgrp">
                  <div className="dayhead">{label}<span>{plural(v.sitesIn(l), "site")}</span></div>
                  <GlanceList list={l} at={data.at} lead="time" limit={5} />
                </div>
              )
            })}
            {agendaDays.length > showDays && <button className="fold-more" onClick={() => setShowDays((n) => n + 4)}>Show more days</button>}
            <Link className="fold-more" href="/planned">Everything planned, by month</Link>
          </>}
        </Fold>

        <Fold title="Where" value={`${[...v.total.keys()].filter((k) => k && k !== "NULL").length} states`} glance={(open) => <StatesGlance total={v.total} out={v.off} planned={v.states} open={open} />} />
      </div>
      <PoweredBy />
    </main>
  )
}

/**
 * Each state as a share of your sites (the app's map glance, as bars): shut, one thin line split by state with the
 * ones losing power in gold; open, a row per state with its sites, those off now and those with something planned.
 */
function StatesGlance({ total, out, planned, open }: { total: Map<string, number>; out: Outage[]; planned: [string, Set<string>][]; open: boolean }) {
  const all = [...total].sort((a, b) => b[1] - a[1])
  const sum = all.reduce((n, [, c]) => n + c, 0) || 1
  const offIn = (st: string) => new Set(out.filter((o) => o.site.state === st).map((o) => o.site.id)).size
  const planIn = (st: string) => planned.find(([s]) => s === st)?.[1].size ?? 0
  return (
    <div className={`sg${open ? " open" : ""}`}>
      <div className="sgl">
        {all.map(([st, n]) => <span key={st} style={{ flexGrow: n }} title={`${st === "NULL" ? "No state" : st}: ${n} sites`}><i className="p" style={{ width: `${(planIn(st) / n) * 100}%` }} /><i className="o" style={{ width: `${(offIn(st) / n) * 100}%` }} /></span>)}
      </div>
      <div className="sgr"><div>
        {all.map(([st, n]) => (
          <div key={st} className="sgrow">
            <b>{st === "NULL" ? "No state" : st}</b>
            <span className="bar" style={{ width: `${Math.max(8, (n / all[0][1]) * 100)}%` }}><i className="p" style={{ width: `${(planIn(st) / n) * 100}%` }} /><i className="o" style={{ width: `${(offIn(st) / n) * 100}%` }} /></span>
            <span className="nums"><b>{n}</b> sites{offIn(st) > 0 && <em> · {offIn(st)} off now</em>}{planIn(st) > 0 && <> · {planIn(st)} planned</>}</span>
          </div>
        ))}
        <div className="sgk"><span><i className="o" />Off now</span><span><i className="p" />Planned, next 14 days</span><span>{Math.round(sum)} sites in all</span></div>
      </div></div>
    </div>
  )
}

/** Before the sites arrive: the page's own frame, with dots standing in for what's coming. */
function Waiting() {
  return (
    <main className="dash">
      <title>Dashboard · Wattle</title>
      <div className="top"><div><h1>Finding your sites</h1></div></div>
      <div className="dfigs">{["Off now", "This week", "All clear"].map((k, i) => <div key={k} className={i === 0 ? "now" : ""}><b><Wait /></b><span>{k}</span></div>)}</div>
      <div className="folds"><section className="fsec open"><div className="fh"><span className="ft">Out now</span></div><GhostRows rows={4} /></section></div>
    </main>
  )
}
