"use client"

import { useEffect, useRef, useState } from "react"
import { NET, netKey, type NetKey } from "@/components/wattle/networks"
import { NETS, NET_VIEW, OUTAGE_DOTS } from "./network-map-data"
import styles from "./network-assembly.module.css"

// The story of the page, told on one map of Australia, centred, as you scroll:
//   1. just the country: power here reaches you through fifteen network companies
//   2. their service areas drop in one by one, each named with its logo, area and customers
//   3. the areas pull apart: fifteen companies, fifteen websites, fifteen ways of reporting an outage
//   4. Wattle's dots spread over every area and draw it back together as one
//   5. your sites light up on it: outages now and planned work, from all fifteen, in one place
// Everything is drawn in one SVG, so it stays sharp at any size. The beats are scrubbed by the scroll position (Lenis
// smooths it); each area's landing is a short timed spring so it feels the same however fast you scroll. Reduced
// motion shows the finished map with the Wattle dots.

// Each network in the strongest colour of its own logo (the app's brand table, NetworkBrand in Models.swift), swapped
// for another colour from the same logo where a neighbour on the map would look alike: CitiPower Powercor takes its
// blue (its red sits against Essential's orange), AusNet its green (its blue would meet Powercor's), Evoenergy its
// teal (its orange sits inside Essential's).
const COLOUR: Record<string, string> = {
  "Ausgrid": "#006095", "Endeavour Energy": "#00A98E", "Essential Energy": "#FF5300", "Evoenergy": "#15909C",
  "Energex": "#B2DB17", "Ergon Energy": "#212A86", "CitiPower": "#0979BF", "Powercor": "#0979BF", "Jemena": "#21BAD6",
  "United Energy": "#A61D72", "AusNet Services": "#8DC63F", "SA Power Networks": "#525252", "TasNetworks": "#2196C6",
  "Western Power": "#F36C12", "Horizon Power": "#00344F", "Power and Water": "#3D8704",
}
const tint = (name: string) => COLOUR[name] ?? "#8A8170"
// the darkest brand colours, lifted for dark mode so their areas don't vanish into the page
const LIFT: Record<string, string> = { "Horizon Power": "#2F7199", "Ergon Energy": "#4A55C8", "SA Power Networks": "#7D7D7D" }

// one step per company: CitiPower and Powercor are one business with one logo, so they land together
const STEPS: number[][] = []
NETS.forEach((n, i) => {
  const prev = STEPS[STEPS.length - 1]
  if (prev && netKey(NETS[prev[0]].name) && netKey(NETS[prev[0]].name) === netKey(n.name)) prev.push(i)
  else STEPS.push([i])
})
const G = STEPS.length

// the beats, as fractions of the section's scroll (0 = its top reaches the top of the screen, 1 = its end)
const AREAS_FROM = 0.1, AREAS_TO = 0.52, SPLIT_FROM = 0.52, SPLIT_TO = 0.6, DOTS_FROM = 0.66, DOTS_TO = 0.84, SITES_FROM = 0.87
const SLOT = (AREAS_TO - AREAS_FROM) / G

// customers on each network, rounded, from the networks' own 2024-26 reports and regulatory filings with the AER and
// ERA WA (CitiPower and Powercor added together)
const CUSTOMERS: Partial<Record<NetKey, string>> = {
  ausgrid: "1.8 million", endeavour: "1.2 million", essential: "900,000", evoenergy: "200,000", energex: "1.6 million",
  ergon: "790,000", citipowercor: "1.27 million", jemena: "384,000", unitedenergy: "720,000", ausnet: "800,000",
  sapower: "930,000", tasnetworks: "300,000", wpower: "1.2 million", horizonpower: "50,000", powerwater: "90,000",
}

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const CX = NET_VIEW.w / 2, CY = NET_VIEW.h / 2

// how far each company's areas move out when the map comes apart: away from the middle of the country
const SPLIT = STEPS.map((g) => {
  const [x, y] = g.reduce((a, i) => [a[0] + NETS[i].at[0] / g.length, a[1] + NETS[i].at[1] / g.length], [0, 0])
  const dx = x - CX, dy = y - (CY + 40), len = Math.hypot(dx, dy) || 1
  const push = 26 + 34 * Math.min(1, len / 420)
  return [(dx / len) * push, (dy / len) * push]
})

// Wattle's dots: a grid over the country, bigger towards the middle like the app icon, each revealed in a sweep that
// spirals out from the centre. Worked out once in the browser from the areas themselves.
type Dot = { x: number; y: number; r: number; d: number }
function makeDots(paths: SVGPathElement[]): Dot[] {
  const out: Dot[] = []
  const step = 15, ox = CX, oy = CY + 30, R = Math.hypot(CX, CY)
  for (let y = step / 2; y < NET_VIEW.h; y += step) {
    for (let x = step / 2 + ((Math.round(y / step) % 2) * step) / 2; x < NET_VIEW.w; x += step) {
      const pt = new DOMPoint(x, y)
      if (!paths.some((p) => p.isPointInFill(pt))) continue
      const dist = Math.hypot(x - ox, y - oy) / R
      const turn = (Math.atan2(y - oy, x - ox) + Math.PI) / (Math.PI * 2)
      out.push({ x, y, r: 2.4 + 5.4 * Math.pow(1 - Math.min(1, dist), 1.4), d: Math.min(1, dist * 0.82 + turn * 0.18) })
    }
  }
  return out
}

const BEATS = [
  { line: "Australia\u2019s power reaches you through fifteen network companies.", sub: "Not your retailer. The company that owns the poles and wires in your street." },
  { line: "Each one looks after its own part of the country.", sub: "" },
  { line: "And each one reports outages on its own website, in its own way.", sub: "Keeping an eye on fifteen of them, for every site you run, takes hours." },
  { line: "Wattle watches all fifteen for you.", sub: "Every network, every few minutes, on one map." },
  { line: "Add your sites. Wattle tells you the moment one loses power.", sub: "And about planned work days ahead, so you can move the fridge stock or the appointments." },
]

// logos with a sharper or fuller lockup than the app's icon + wordmark pair: one image, light and dark versions
const LOCKUP: Partial<Record<NetKey, { light: string; dark: string; aspect: number }>> = {
  energex: { light: "/networks/energex-lockup.svg", dark: "/networks/energex-lockup-dark.svg", aspect: 2.646 },
  tasnetworks: { light: "/networks/tasnetworks-lockup.png", dark: "/networks/tasnetworks-lockup-dark.png", aspect: 2.19 },
}


/** A network's logo at most `h` tall and `w` wide, as one lockup or as its icon mark and wordmark side by side. */
function Logo({ k, h, w }: { k: NetKey; h: number; w: number }) {
  const n = NET[k]
  const lock = LOCKUP[k]
  if (lock) {
    const lh = Math.min(h * 1.25, w / lock.aspect)
    return (
      <picture className={styles.lockup}>
        <source media="(prefers-color-scheme: dark)" srcSet={lock.dark} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lock.light} alt={n.name} style={{ height: lh, width: lh * lock.aspect }} />
      </picture>
    )
  }
  if (!n.icon && !n.word) return <b className={styles.logoText}>{n.name}</b>
  const wordScale = n.word && n.icon && n.word[0] > 2.5 ? 0.62 : 1
  const across = (n.icon?.[0] ?? 0) + (n.word?.[0] ?? 0) * wordScale
  const gap = n.icon && n.word ? 14 : 0
  const fit = Math.min(h, (w - gap) / across)
  return (
    <span className={styles.pair} role="img" aria-label={n.name}>
      {n.icon && <img src={`/networks/${k}-icon.png`} alt="" className={`tone-${n.icon[1]}`} style={{ height: fit, width: fit * n.icon[0] }} />}
      {n.word && <img src={`/networks/${k}-word.png`} alt="" className={`tone-${n.word[1]}`} style={{ height: fit * wordScale, width: fit * wordScale * n.word[0] }} />}
    </span>
  )
}

export function NetworkAssembly({ still, wide }: { still: boolean; wide: boolean }) {
  const section = useRef<HTMLElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const groups = useRef<(SVGGElement | null)[]>([])
  const [dots, setDots] = useState<Dot[]>([])
  const [beat, setBeat] = useState(still ? 4 : 0)
  const [step, setStep] = useState(-1)

  // the dots are worked out from the drawn areas once they're on the page
  useEffect(() => {
    const el = svg.current
    if (!el) return
    setDots(makeDots(Array.from(el.querySelectorAll<SVGPathElement>(`.${styles.area} path`))))
  }, [])

  useEffect(() => {
    const sec = section.current, sv = svg.current
    if (!sec || !sv) return
    if (still) {
      sv.style.setProperty("--split", "0"); sv.style.setProperty("--q", "1"); sv.style.setProperty("--fade", "1")
      groups.current.forEach((g) => g?.classList.add(styles.in))
      return
    }
    let raf = 0, visible = false, shownBeat = -1, shownStep = -2
    const frame = () => {
      raf = 0
      if (!visible) return
      const r = sec.getBoundingClientRect()
      const p = clamp(-r.top / Math.max(1, r.height - window.innerHeight))

      // areas: each company's drops in when its turn comes (the spring itself is a CSS transition on .in)
      const shown = p < AREAS_FROM ? -1 : Math.min(G - 1, Math.floor((p - AREAS_FROM) / SLOT))
      groups.current.forEach((g, i) => g?.classList.toggle(styles.in, i <= shown))

      // apart, then back together under the dots
      const apart = ease(clamp((p - SPLIT_FROM) / (SPLIT_TO - SPLIT_FROM)))
      const q = clamp((p - DOTS_FROM) / (DOTS_TO - DOTS_FROM))
      sv.style.setProperty("--split", (apart * (1 - ease(clamp(q * 1.6)))).toFixed(4))
      sv.style.setProperty("--q", q.toFixed(4))
      sv.style.setProperty("--fade", ease(clamp(q * 1.25)).toFixed(4))

      const b = p < AREAS_FROM ? 0 : p < SPLIT_FROM ? 1 : p < DOTS_FROM - 0.02 ? 2 : p < SITES_FROM ? 3 : 4
      if (b !== shownBeat) { shownBeat = b; setBeat(b) }
      const st = b === 1 ? shown : -1
      if (st !== shownStep) { shownStep = st; setStep(st) }
      raf = requestAnimationFrame(frame)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(frame)
    }, { rootMargin: "100px 0px" })
    io.observe(sec)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [still])

  const current = step >= 0 ? STEPS[step] : null
  const name = current ? NETS[current[0]].name : null
  const key = name ? netKey(name) : null
  const net = key ? NET[key] : null
  const B = BEATS[beat]

  return (
    <section ref={section} className={`${styles.section} ${still ? styles.still : ""}`} aria-labelledby="nets-title">
      <div className={styles.stage} style={{ ["--tint" as string]: name ? tint(name) : "#F2B300" }}>
        <div className={styles.copy}>
          <h2 id="nets-title" className={styles.srOnly}>Australia&apos;s electricity networks, and Wattle</h2>
          <p key={beat} className={styles.line}>{B.line}</p>
          <div className={styles.under}>
            {beat === 1 && net && key ? (
              <div key={key} className={styles.company} aria-live="polite">
                <div className={styles.logo}><Logo k={key} h={wide ? 44 : 34} w={wide ? 260 : 200} /></div>
                <p className={styles.meta}>
                  <b>{net.states.join(" \u00b7 ")}</b> {net.area}
                  {CUSTOMERS[key] && <> About {CUSTOMERS[key]} customers.</>}
                  {" "}<a href={net.website} target="_blank" rel="noopener noreferrer">{net.website.replace(/^https?:\/\/(www\.)?/, "")}{"\u00a0\u2197"}</a>
                </p>
                <div className={styles.rail} aria-hidden>
                  {STEPS.map((g, i) => <i key={i} style={{ background: i <= step ? tint(NETS[g[0]].name) : undefined }} />)}
                </div>
              </div>
            ) : (
              B.sub && <p key={`s${beat}`} className={styles.sub}>{B.sub}</p>
            )}
          </div>
        </div>

        <div className={styles.mapBox}>
          <svg ref={svg} className={`${styles.map} ${beat >= 4 ? styles.sitesOn : ""}`} viewBox={`-40 -40 ${NET_VIEW.w + 80} ${NET_VIEW.h + 80}`}
            role="img" aria-label="A map of Australia divided into its electricity network areas">
            <g className={styles.base}>{NETS.map((n) => <path key={n.name} d={n.d} />)}</g>
            {STEPS.map((g, gi) => (
              <g key={gi} className={styles.split} style={{ ["--dx" as string]: SPLIT[gi][0].toFixed(1), ["--dy" as string]: SPLIT[gi][1].toFixed(1) }}>
                <g ref={(el) => { groups.current[gi] = el }} className={styles.area}>
                  {g.map((i) => (
                    <path key={NETS[i].name} d={NETS[i].d}
                      style={{ ["--c" as string]: tint(NETS[i].name), ["--cd" as string]: LIFT[NETS[i].name] ?? tint(NETS[i].name) }} />
                  ))}
                </g>
              </g>
            ))}
            <g className={styles.dots}>
              {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={d.r.toFixed(2)} style={{ ["--d" as string]: d.d.toFixed(3) }} />
              ))}
            </g>
            <g className={styles.sites}>
              {OUTAGE_DOTS.map((d, i) => (
                <g key={d.name} style={{ ["--i" as string]: i }}>
                  <circle cx={d.at[0]} cy={d.at[1]} r="22" className={styles.pulse} />
                  <circle cx={d.at[0]} cy={d.at[1]} r="9" className={styles.core} />
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
    </section>
  )
}
