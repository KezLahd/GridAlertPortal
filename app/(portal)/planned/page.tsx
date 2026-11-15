"use client"

import { useMemo, useState } from "react"
import { Loading } from "@/components/wattle/shell"
import { dayKey, fmt, plural, time, usePortal, type Outage } from "@/components/wattle/data"
import { GlanceList } from "@/components/wattle/glance"
import { NET, netKey, type NetKey } from "@/components/wattle/networks"
import { Opt, Pick, Sep } from "@/components/wattle/pick"

// Planned, like the app's tab: the work networks have booked at or near your sites. A month calendar (Monday first,
// today ringed, a gold dot where work lands on one of your sites, grey where it's only nearby; pick a day to see just
// that day), then what's under way now and each day after, as glances that open into their day. Later days start folded.

const DAY = 86400_000

export default function Planned() {
  const { data, error } = usePortal()
  const [near, setNear] = useState(false)
  const [long, setLong] = useState(false)
  const [state, setState] = useState<string | null>(null)
  const [net, setNet] = useState<NetKey | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [folded, setFolded] = useState<Set<string>>(new Set())

  const all = useMemo(() => (data?.outages ?? []).filter((o) => o.status !== "Out now" && o.starts)
    .sort((a, b) => new Date(a.starts!).getTime() - new Date(b.starts!).getTime()), [data])

  if (!data) return <Loading error={error} />

  const underWay = (o: Outage) => o.status === "Planned work under way"
  const dayOf = (o: Outage) => underWay(o) ? dayKey(data.at, o.site.state) : dayKey(o.starts!, o.site.state)
  const inRange = all.filter((o) => near || o.atSite)
  const match = (o: Outage, skip?: "state" | "net") => (!long || (o.hours ?? 0) >= 4)
    && (skip === "state" || !state || o.site.state === state)
    && (skip === "net" || !net || netKey(o.provider || o.site.provider) === net)
  const list = inRange.filter((o) => match(o))
  const shown = day ? list.filter((o) => dayOf(o) === day) : list

  // grouped: Under way first, then a heading per day
  const groups: { key: string; label: string; items: Outage[] }[] = []
  const today = dayKey(data.at, "NSW"), tomorrow = dayKey(new Date(new Date(data.at).getTime() + DAY), "NSW")
  for (const o of shown) {
    const k = underWay(o) ? "now" : dayOf(o)
    let g = groups.find((x) => x.key === k)
    if (!g) {
      const label = k === "now" ? "Under way" : k === today ? "Today" : k === tomorrow ? "Tomorrow" : fmt(o.starts!, o.site.state, { weekday: "long", day: "numeric", month: "long" })
      groups.push(g = { key: k, label, items: [] })
    }
    g.items.push(o)
  }
  groups.sort((a, b) => (a.key === "now" ? -1 : b.key === "now" ? 1 : ymd(a.key).localeCompare(ymd(b.key))))

  // the lead: how many are booked, how many start this week, and how long to the first
  const ahead = list.filter((o) => !underWay(o))
  const week = ahead.filter((o) => new Date(o.starts!).getTime() - new Date(data.at).getTime() < 7 * DAY).length
  const first = ahead[0]
  const until = first ? untilText(new Date(first.starts!).getTime() - new Date(data.at).getTime()) : null
  const states = count(inRange.filter((o) => match(o, "state")), (o) => o.site.state && o.site.state !== "NULL" ? o.site.state : null)
  const nets = count(inRange.filter((o) => match(o, "net")), (o) => netKey(o.provider || o.site.provider))
  const fold = (k: string) => setFolded((f) => { const n = new Set(f); if (n.has(k)) n.delete(k); else n.add(k); return n })

  return (
    <main className="plan">
      <title>Planned · Wattle</title>
      <div className="top">
        <div><h1>{list.length ? <>{plural(list.length, "outage")} booked {near ? "at or near" : "at"} your sites</> : `Nothing planned ${near ? "near" : "at"} your sites`}</h1></div>
      </div>

      <div className="dfigs pl-figs">
        <div><b>{list.length}</b><span>Booked</span><small>{near ? "at or near your sites" : "at your sites"}, next 28 days</small></div>
        <div className={week ? "now" : ""}><b>{week}</b><span>This week</span><small>start in the next seven days</small></div>
        {first && <div><b>{until}</b><span>To the first</span><small>{first.site.name}, {fmt(first.starts!, first.site.state, { weekday: "short" })} {time(first.starts!, first.site.state)}</small></div>}
      </div>

      <div className="mp-filters pl-filters">
        <Pick label="How close" value={near ? "At or near your sites" : "At your sites"} active={near}>
          {(close) => <>
            <Opt on={!near} n={all.filter((o) => o.atSite).length} hint="Work on the site's own street or supply" onPick={() => { setNear(false); close() }}>At your sites</Opt>
            <Opt on={near} n={all.length} hint="Anything the network has booked close by" onPick={() => { setNear(true); close() }}>At or near your sites</Opt>
          </>}
        </Pick>
        <Pick label="How long" value={long ? "4 hours or longer" : "Any length"} active={long}>
          {(close) => <>
            <Opt on={!long} onPick={() => { setLong(false); close() }}>Any length</Opt>
            <Opt on={long} hint="Long enough to put fridge stock at risk" onPick={() => { setLong(true); close() }}>4 hours or longer</Opt>
          </>}
        </Pick>
        <Pick label="State" value={state ?? "Every state"} active={!!state}>
          {(close) => <>
            <Opt on={!state} onPick={() => { setState(null); close() }}>Every state</Opt>
            <Sep />
            {states.map(([st, n]) => <Opt key={st} on={state === st} n={n} onPick={() => { setState(st); close() }}>{st}</Opt>)}
          </>}
        </Pick>
        <Pick label="Network" value={net ? NET[net].name : "Every network"} active={!!net} wide>
          {(close) => <>
            <Opt on={!net} onPick={() => { setNet(null); close() }}>Every network</Opt>
            <Sep />
            {nets.map(([k, n]) => <Opt key={k} on={net === k} n={n} sw={<i className="netsw" style={{ background: NET[k].tint }} />} onPick={() => { setNet(k); close() }}>{NET[k].name}</Opt>)}
          </>}
        </Pick>
      </div>

      <div className="pl-body">
        <Calendar list={list} dayOf={dayOf} at={data.at} day={day} onDay={(k) => setDay(day === k ? null : k)} />
        <div className="pl-days">
          {day && <button className="pl-only" onClick={() => setDay(null)}>Showing {fmt(new Date(`${ymd(day).replace(/(\d{4})(\d\d)(\d\d)/, "$1-$2-$3")}T12:00:00`), "NSW", { weekday: "long", day: "numeric", month: "long" })}<i aria-hidden>×</i></button>}
          {groups.length === 0 && <div className="empty">{day ? "Nothing booked that day." : "Nothing booked that matches."}</div>}
          {groups.map((g) => {
            // like the app: under way, today and tomorrow (and a day picked on the calendar) start open, later days folded
            const startOpen = g.key === "now" || g.key === today || g.key === tomorrow || g.key === day
            const shut = startOpen !== folded.has(g.key)
            return (
              <section key={g.key} className={`pl-day${shut ? " shut" : ""}`}>
                <button className="pl-h" aria-expanded={!shut} onClick={() => fold(g.key)}>
                  {g.key === "now" && <i className="hot" />}
                  <span>{g.label}</span>
                  <em>{g.items.length}</em>
                  <svg viewBox="0 0 12 12" aria-hidden><path d="M3 4.5 6 7.5 9 4.5" /></svg>
                </button>
                {!shut && <GlanceList list={g.items} at={data.at} lead="time" limit={8} />}
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}

/** dayKey's "16/11/2026" as "20261116", so days sort. */
const ymd = (k: string) => k.split("/").reverse().join("")

function count<K extends string>(l: Outage[], key: (o: Outage) => K | null): [K, number][] {
  const m = new Map<K, number>()
  for (const o of l) { const k = key(o); if (k) m.set(k, (m.get(k) ?? 0) + 1) }
  return [...m].sort((a, b) => b[1] - a[1])
}

/** How long until a start, as a figure: 40 min, 9 h, 3 d. */
function untilText(ms: number) {
  const s = Math.max(0, ms / 1000)
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h`
  return `${Math.round(s / 86400)} d`
}

/** A month at a time, Monday first. A dot under each day with work booked: gold if it's at one of your sites. */
function Calendar({ list, dayOf, at, day, onDay }: { list: Outage[]; dayOf: (o: Outage) => string; at: string; day: string | null; onDay: (k: string) => void }) {
  const today = dayKey(at, "NSW")
  const [y0, m0] = today.split("/").reverse().slice(0, 2).map(Number) as [number, number]
  const last = list.reduce((m, o) => (ymd(dayOf(o)) > ymd(m) ? dayOf(o) : m), today)
  const months = (Number(last.split("/")[2]) - y0) * 12 + Number(last.split("/")[1]) - m0
  const [step, setStep] = useState(0)
  const y = y0 + Math.floor((m0 - 1 + step) / 12), m = ((m0 - 1 + step) % 12) + 1

  const by = new Map<string, { close: number; near: number }>()
  for (const o of list) {
    const k = dayOf(o), v = by.get(k) ?? { close: 0, near: 0 }
    if (o.atSite) v.close++; else v.near++
    by.set(k, v)
  }
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7   // Monday = 0
  const key = (d: number) => `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`
  const name = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" })
  return (
    <div className="cal">
      <div className="cal-h">
        <span><b>{name}</b> {y}</span>
        {months > 0 && <>
          <button aria-label="Previous month" disabled={step <= 0} onClick={() => setStep(step - 1)}><svg viewBox="0 0 12 12"><path d="M7.5 2.5 4 6l3.5 3.5" /></svg></button>
          <button aria-label="Next month" disabled={step >= months} onClick={() => setStep(step + 1)}><svg viewBox="0 0 12 12"><path d="M4.5 2.5 8 6 4.5 9.5" /></svg></button>
        </>}
      </div>
      <div className="cal-g">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="wd">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const k = key(i + 1), c = by.get(k), past = ymd(k) < ymd(today)
          return (
            <button key={k} className={`cd${k === today ? " today" : ""}${k === day ? " on" : ""}${past ? " past" : ""}`} disabled={!c} onClick={() => onDay(k)}
              title={c ? `${plural(c.close + c.near, "outage")}${c.close ? `, ${c.close} at your sites` : ""}` : undefined} style={{ ["--i" as string]: i }}>
              <b>{i + 1}</b>
              <span>{c && <i className={c.close ? "g" : ""} />}</span>
            </button>
          )
        })}
      </div>
      <div className="cal-k"><span><i className="g" />At your sites</span><span><i />Only nearby</span></div>
    </div>
  )
}
