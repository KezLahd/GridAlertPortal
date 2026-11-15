"use client"

import { useState } from "react"
import { dayKey, fmt, isStale, since, time, type Outage } from "./data"

// Glances, as in the app: things that stay on show while a section or row is shut and change shape as it opens.
// No cards: straight on the page with hairlines between.

const NET_NAME: Record<string, string> = {
  WPower: "Western Power", SAPower: "SA Power Networks", CitiPowerCor: "CitiPower and Powercor", AusNet: "AusNet Services",
  Endeavour: "Endeavour Energy", Ergon: "Ergon Energy", EvoEnergy: "Evoenergy", UnitedEnergy: "United Energy", Horizon: "Horizon Power",
}
export const netName = (p: string | null | undefined) => p ? NET_NAME[p] ?? p : "Network not set"

/** Hours since midnight (0–24) in the site's own state. */
export function hourOf(d: string, state: string | null) {
  const [h, m] = fmt(d, state, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).split(":").map(Number)
  return h + m / 60
}

/** "4:00pm" today, "Tue 4:00pm" this week, "10 Dec" further out. */
export function backAt(ends: string, state: string | null, at: string) {
  const days = (new Date(ends).getTime() - new Date(at).getTime()) / 86400_000
  if (days < 0.75 && fmt(ends, state, { day: "numeric" }) === fmt(at, state, { day: "numeric" })) return time(ends, state)
  if (days < 6) return `${fmt(ends, state, { weekday: "short" })} ${time(ends, state)}`
  return fmt(ends, state, { day: "numeric", month: "short" })
}

export const awayText = (o: Outage) =>
  o.atSite ? "At the site" : o.distanceKm !== null ? `${o.distanceKm < 1 ? "Under 1" : Math.round(o.distanceKm * 10) / 10} km away` : "Nearby"

/**
 * One outage as a glance (the app's PlanRowGlance): shut, the time, the site and a thin bar where it falls in the day;
 * opened, the bar grows into the day with its hours marked and the details come out from under it.
 * `lead` "day" puts the date in the left column (a mixed list); "time" just the clock (a list already grouped by day).
 */
export function OutageGlance({ o, at, open, sel, onToggle, lead = "day", name, children }: {
  o: Outage; at: string; open: boolean; sel?: boolean; onToggle: () => void; lead?: "day" | "time" | "date"; name?: string; children?: React.ReactNode
}) {
  const st = o.site.state, now = o.status !== "Planned", long = !now && (o.hours ?? 0) >= 4
  const big = now ? (o.ends ? backAt(o.ends, st, at) : "No ETA") : lead === "time" ? time(o.starts!, st) : fmt(o.starts!, st, { weekday: "short", day: "numeric" })
  const small = now ? (o.ends ? "back" : "") : lead === "time" ? (o.ends ? `to ${time(o.ends, st)}` : "") : lead === "date" ? fmt(o.starts!, st, { month: "short" }) : time(o.starts!, st)
  const stale = now && !o.ends && isStale(o, at)
  return (
    <div className={`og${open ? " open" : ""}${sel ? " sel" : ""}`}>
      <button className="ogh" aria-expanded={open} onClick={onToggle}>
        <span className="lead"><b>{big}</b><small>{small}</small></span>
        <span className="nm">{o.atSite && <i className="hot" title="At the site" />}<b>{name ?? o.site.name}</b></span>
        <span className={`dur${long ? " lg" : ""}`}>{now ? since(o, at) : `${o.hours ?? "?"} h`}</span>
        <DayBar o={o} at={at} />
      </button>
      <div className="ogx"><div>
        <dl>
          <dt>When</dt><dd>{o.starts ? `${fmt(o.starts, st, { weekday: "short", day: "numeric", month: "short" })} ${time(o.starts, st)}` : "Unknown"}{o.ends ? ` – ${time(o.ends, st)}` : now ? " – no restore time yet" : ""}</dd>
          <dt>Where</dt><dd className={o.atSite ? "g" : ""}>{awayText(o)}{o.site.suburb ? ` · ${o.site.suburb} ${o.site.state ?? ""}` : ""}</dd>
          {o.cause && <><dt>Cause</dt><dd>{o.cause}</dd></>}
          <dt>Network</dt><dd>{netName(o.site.provider ?? o.provider)}</dd>
          {long && <><dt>Fridge</dt><dd className="g">4 hours or more: check fridge stock</dd></>}
          {stale && <><dt>Note</dt><dd>Off for a week with no update; the network&apos;s feed may be stale</dd></>}
        </dl>
        {children && <div className="oga">{children}</div>}
      </div></div>
    </div>
  )
}

/** Where an outage falls in its day, as a thin bar: today for one that's off now (from midnight if it began earlier),
 *  its own day if planned. Inside an open glance it grows and shows the hours. */
export function DayBar({ o, at }: { o: Outage; at: string }) {
  const st = o.site.state, now = o.status !== "Planned", long = !now && (o.hours ?? 0) >= 4
  const day = now ? at : o.starts!
  const hr = (d: string) => dayKey(d, st) === dayKey(day, st) ? hourOf(d, st) : new Date(d) < new Date(day) ? 0 : 24
  const a = o.starts ? hr(o.starts) : 0
  const b = o.ends ? hr(o.ends) : now ? hourOf(at, st) : Math.min(24, a + (o.hours ?? 1))
  const nowAt = now ? hourOf(at, st) : null
  return (
    <span className="gb" aria-hidden>
      <i className="tk" />
      <i className={`sp${now ? " now" : ""}${o.atSite || long ? " hot" : ""}${now && !o.ends ? " open-end" : ""}`} style={{ left: `${(a / 24) * 100}%`, width: `max(var(--gbh), ${((Math.max(b, a) - a) / 24) * 100}%)` }} />
      {nowAt !== null && <i className="nw" style={{ left: `${(nowAt / 24) * 100}%` }} />}
      <span className="hrs">{["12a", "6a", "12p", "6p", "12a"].map((h, k) => <em key={k} style={{ left: `${k * 25}%` }}>{h}</em>)}</span>
    </span>
  )
}

/** A list of outage glances where one opens at a time. */
export function GlanceList({ list, at, lead, limit = 8, action, name }: {
  list: Outage[]; at: string; lead?: "day" | "time" | "date"; limit?: number; action?: (o: Outage) => React.ReactNode; name?: (o: Outage) => string
}) {
  const [open, setOpen] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  const shown = all ? list : list.slice(0, limit)
  return (
    <>
      {shown.map((o) => <OutageGlance key={o.id} o={o} at={at} lead={lead} name={name?.(o)} open={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)}>{action?.(o)}</OutageGlance>)}
      {list.length > limit && <button className="fold-more" onClick={() => setAll(!all)}>{all ? "Show fewer" : `${list.length - limit} more`}</button>}
    </>
  )
}

/**
 * A section that folds away (the app's Fold): a header with the name, a figure and a chevron, its glance under it
 * (given whether it's open, so it can change shape), and content that unrolls from under it.
 */
export function Fold({ title, value, hot, open: start = false, glance, children }: {
  title: string; value?: React.ReactNode; hot?: boolean; open?: boolean; glance: (open: boolean) => React.ReactNode; children?: React.ReactNode
}) {
  const [open, setOpen] = useState(start)
  return (
    <section className={`fsec${open ? " open" : ""}`}>
      <button className="fh" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ft">{hot && <i className="hot" />}{title}</span>
        {value !== undefined && <span className={`fv${typeof value === "string" && /[a-z]/i.test(value) ? " w" : ""}`}>{value}</span>}
        <svg className="fc" viewBox="0 0 12 12" aria-hidden><path d="M3 4.5 6 7.5 9 4.5" /></svg>
      </button>
      <div className="fg" onClick={() => setOpen(!open)}>{glance(open)}</div>
      {children && <div className="fx"><div><div className="fxi">{children}</div></div></div>}
    </section>
  )
}

/**
 * Out now: how many are still out stepping down as each is due back (the app's BackOnGlance). Shut, a thin stair;
 * open, the full chart with the hours, then first back, half back and all back.
 */
export function BackOnGlance({ out, at, open }: { out: Outage[]; at: string; open: boolean }) {
  const now = new Date(at).getTime()
  const due = out.map((o) => o.ends ? Math.max(new Date(o.ends).getTime(), now) : null).filter((x): x is number => x !== null).sort((a, b) => a - b)
  const held = out.length - due.length, total = out.length
  if (!total) return <div className="bo-none">Every site has power.</div>
  const last = due.length ? due[due.length - 1] : now + 3600_000
  const span = Math.max(last - now, 3600_000)
  const W = 1000, H = open ? 120 : 30, top = 4
  const x = (t: number) => ((t - now) / span) * (W - 8)
  const y = (n: number) => top + (H - top - 2) * (1 - n / total)
  let d = `M0 ${y(total)}`, n = total
  for (const t of due) { d += ` L${x(t)} ${y(n)}`; n -= 1; d += ` L${x(t)} ${y(n)}` }
  d += ` L${W} ${y(n)}`
  const fill = `${d} L${W} ${H} L0 ${H} Z`
  // hour marks along the bottom, every hour or two
  const marks: number[] = []
  // about six marks across, on whole hours (or whole days once it runs past two days)
  const step = span > 2 * 86400_000 ? Math.ceil(span / 6 / 86400_000) * 86400_000 : Math.max(1, Math.ceil(span / 6 / 3600_000)) * 3600_000
  const snap = step >= 86400_000 ? 86400_000 : 3600_000
  for (let t = Math.ceil(now / snap) * snap; t < last && marks.length < 8; t += step) marks.push(t)
  const clock = (t: number) => step >= 86400_000
    ? new Date(t).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", weekday: "short", day: "numeric" })
    : new Date(t).toLocaleTimeString("en-AU", { timeZone: "Australia/Sydney", hour: "numeric" }).replace(/\s/g, "").toLowerCase()
  const span_ = (ms: number) => ms < 3600_000 ? `${Math.max(1, Math.round(ms / 60_000))} min` : `${Math.round(ms / 3600_000)} h`
  return (
    <div className={`bo${open ? " open" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: H }} aria-hidden>
        <defs><linearGradient id="bo-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2B300" stopOpacity=".26" /><stop offset="1" stopColor="#F2B300" stopOpacity=".03" /></linearGradient></defs>
        {open && marks.map((t) => <line key={t} x1={x(t)} x2={x(t)} y1={top} y2={H} className="bo-m" vectorEffect="non-scaling-stroke" />)}
        <path d={fill} fill="url(#bo-f)" />
        <path d={d} className="bo-s" vectorEffect="non-scaling-stroke" />
      </svg>
      {open && <div className="bo-x">
        <span style={{ left: 0 }}>now</span>
        {marks.filter((t) => x(t) > W * 0.08 && x(t) < W * 0.88).map((t) => <span key={t} style={{ left: `${(x(t) / W) * 100}%` }}>{clock(t)}</span>)}
        {due.length > 0 && <span className="g" style={{ right: 0 }}>{clock(last)}</span>}
      </div>}
      {open && <div className="bo-f">
        {due.length > 0 && <>
          <span><b>in {span_(due[0] - now)}</b><small>first back</small></span>
          {due.length > 2 && <span><b>{time(new Date(due[Math.floor((due.length - 1) / 2)]), "NSW")}</b><small>half back</small></span>}
          <span className="g"><b>{time(new Date(last), "NSW")}</b><small>all back</small></span>
        </>}
        {held > 0 && <em>{held} with no restore time from the network yet</em>}
      </div>}
    </div>
  )
}

/**
 * The days ahead as a strip (the app's WeekStripGlance): shut, each day's letter with up to three dots under it;
 * open, the dots rise into a column per day, one per outage (or per few, in a busy fortnight), and the busiest is named.
 */
export function DaysGlance({ days, open, onDay }: { days: { key: string; d: Date; n: number; long: number }[]; open: boolean; onDay?: (key: string) => void }) {
  const peak = Math.max(1, ...days.map((x) => x.n))
  const unit = Math.max(1, Math.ceil(peak / 24))
  const busiest = days.reduce((a, b) => (b.n > a.n ? b : a), days[0])
  return (
    <div className={`dg${open ? " open" : ""}`} style={{ ["--rows" as string]: Math.ceil(peak / unit / 3) }}>
      <div className="dgc">
        {days.map((x, i) => {
          const shut = x.n === 0 ? 0 : Math.min(3, 1 + Math.floor(x.n / 8))
          const many = x.n === 0 ? 0 : Math.ceil(x.n / unit)
          const longN = Math.ceil(x.long / unit)
          const wd = fmt(x.d, "NSW", { weekday: "short" })
          return (
            <button key={x.key} className={`dgd${i === 0 ? " today" : ""}${wd === "Sat" || wd === "Sun" ? " we" : ""}`} title={`${wd} ${fmt(x.d, "NSW", { day: "numeric" })}: ${x.n} ${x.n === 1 ? "outage" : "outages"}`}
              onClick={(e) => { if (open && onDay) { e.stopPropagation(); onDay(x.key) } }} style={{ ["--i" as string]: i }}>
              <span className="dgl">{open ? wd : wd[0]}<b>{fmt(x.d, "NSW", { day: "numeric" })}</b></span>
              <span className="dgs">{Array.from({ length: shut }, (_, j) => <i key={j} />)}</span>
              <span className="dgo">
                {x.n === peak && x.n > 0 && <em>{x.n}</em>}
                {Array.from({ length: many }, (_, j) => <i key={j} className={j < longN ? "l" : ""} />)}
              </span>
            </button>
          )
        })}
      </div>
      {open && busiest.n > 0 && <div className="dgb"><span className="t"><b>Busiest {fmt(busiest.d, "NSW", { weekday: "long" })}</b>, {busiest.n} {busiest.n === 1 ? "outage" : "outages"}{unit > 1 ? ` · each dot is ${unit}` : ""}</span><span><i className="l" />4 hours or longer</span></div>}
    </div>
  )
}
