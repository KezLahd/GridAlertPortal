"use client"

import { useEffect, useRef, useState } from "react"
import { NET, netKey, type NetKey } from "@/components/wattle/networks"
import { NETS, NET_VIEW } from "./network-map-data"
import styles from "./network-assembly.module.css"

// The page's story, told on one map of Australia as you scroll. Every step is tied to the scroll position (smoothed
// a little more on top of Lenis, like a scrubbed timeline), so nothing fires and vanishes on one flick of the wheel:
//   1. the country, flat, in one colour
//   2. it tips back into 3D, and each network's area drops onto it in turn, named with its logo and details
//   3. the map comes back flat and breaks apart into fifteen pieces, with no country behind them
//   4. Wattle sprigs grow between the pieces, twining, then pull tight like a lace and draw them back into one
//   5. each area turns into dots of its own colour, the dots turn wattle gold, and finally drift away
// Words arrive in different places as it goes, some over the map. Reduced motion shows the gold map, still.

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

// the timeline, as fractions of the section's scroll (0 = its top reaches the top of the screen, 1 = its end)
type Span = [number, number]
const TILT: Span = [0.05, 0.13], DROPS: Span = [0.14, 0.5], FLAT: Span = [0.5, 0.57], VINES: Span = [0.58, 0.68]
const LACE: Span = [0.68, 0.77], DOTS: Span = [0.77, 0.84], GOLD: Span = [0.83, 0.89], SCATTER: Span = [0.94, 1]
const SLOT = (DROPS[1] - DROPS[0]) / (G + 0.4)

// the words, each with where it sits and when it comes in and goes out
const WORDS: { text: string; at: string; big?: boolean; inn: Span; out: Span }[] = [
  { text: "Australia\u2019s power reaches you through fifteen network companies.", at: "top", big: true, inn: [-0.02, -0.01], out: [0.05, 0.09] },
  { text: "Not your retailer. The company that owns the poles and wires in your street.", at: "bottomLeft", big: true, inn: [0.06, 0.1], out: [0.13, 0.16] },
  { text: "Each one looks after its own patch.", at: "topLeft", big: true, inn: [0.14, 0.17], out: [0.48, 0.51] },
  { text: "Fifteen companies. Fifteen websites.", at: "centre", big: true, inn: [0.51, 0.545], out: [0.6, 0.63] },
  { text: "Each one reports outages in its own way. Checking them all, for every site you run, takes hours.", at: "bottom", inn: [0.525, 0.555], out: [0.6, 0.63] },
  { text: "Wattle ties them together.", at: "topRight", big: true, inn: [0.6, 0.635], out: [0.74, 0.77] },
  { text: "Every network, on one map.", at: "bottomLeft", big: true, inn: [0.77, 0.8], out: [0.86, 0.89] },
  { text: "Wattle checks all fifteen, every few minutes.", at: "top", big: true, inn: [0.87, 0.9], out: [0.93, 0.955] },
  { text: "So you know the moment a site loses power.", at: "centre", big: true, inn: [0.95, 0.98], out: [2, 3] },
]
const CHIP: { inn: Span; out: Span } = { inn: [0.145, 0.17], out: [0.48, 0.51] }

// customers on each network, rounded, from the networks' own 2024-26 reports and regulatory filings with the AER and
// ERA WA (CitiPower and Powercor added together)
const CUSTOMERS: Partial<Record<NetKey, string>> = {
  ausgrid: "1.8 million", endeavour: "1.2 million", essential: "900,000", evoenergy: "200,000", energex: "1.6 million",
  ergon: "790,000", citipowercor: "1.27 million", jemena: "384,000", unitedenergy: "720,000", ausnet: "800,000",
  sapower: "930,000", tasnetworks: "300,000", wpower: "1.2 million", horizonpower: "50,000", powerwater: "90,000",
}

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const seg = (p: number, [a, b]: Span) => clamp((p - a) / (b - a))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const CX = NET_VIEW.w / 2, CY = NET_VIEW.h / 2

// the middle of each company's areas, and how far it moves out when the country breaks apart
const MID = STEPS.map((g) => g.reduce((a, i) => [a[0] + NETS[i].at[0] / g.length, a[1] + NETS[i].at[1] / g.length], [0, 0]))
const SPLIT = MID.map(([x, y]) => {
  const dx = x - CX, dy = y - (CY + 60), len = Math.hypot(dx, dy) || 1
  const push = 34 + 46 * Math.min(1, len / 420)
  return [(dx / len) * push, (dy / len) * push]
})

// the sprigs: each company tied to its two nearest, twice over (two strands that cross, like twine)
const PAIRS: [number, number][] = []
MID.forEach((a, i) => {
  MID.map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1])] as const).filter(([j]) => j !== i)
    .sort((x, y) => x[1] - y[1]).slice(0, 2)
    .forEach(([j]) => { if (!PAIRS.some(([p, q]) => (p === i && q === j) || (p === j && q === i))) PAIRS.push([i, j]) })
})
const STRANDS = PAIRS.flatMap(([a, b], k) => [{ a, b, bend: 0.32 + (k % 3) * 0.06 }, { a, b, bend: -(0.26 + (k % 2) * 0.08) }])
const PUFFS = [0.3, 0.55, 0.8]
const bez = (t: number, p0: number, p1: number, p2: number, p3: number) =>
  (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3

// an area falls fast and hits with one small hop: its height above the map, 1 to 0, over its slot of scroll
const fall = (t: number) => (t < 0.8 ? 1 - (t / 0.8) ** 2 : 0.07 * Math.sin(Math.PI * ((t - 0.8) / 0.2)))

// the dots: a fine grid over the country, each in its network's colour, revealed in a sweep from the middle
type Dot = { x: number; y: number; r: number; d: number; c: number[]; cd: number[]; vx: number; vy: number }
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const GOLD_RGB = rgb("#F2B300")
function makeDots(paths: SVGPathElement[]): Dot[] {
  const out: Dot[] = []
  const step = 10.5, ox = CX, oy = CY + 40, R = Math.hypot(CX, CY)
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let y = step / 2; y < NET_VIEW.h; y += step) {
    for (let x = step / 2 + ((Math.round(y / step) % 2) * step) / 2; x < NET_VIEW.w; x += step) {
      const pt = new DOMPoint(x, y)
      const n = paths.findIndex((p) => p.isPointInFill(pt))
      if (n < 0) continue
      const name = NETS[n].name
      const dist = Math.hypot(x - ox, y - oy) / R
      const turn = (Math.atan2(y - oy, x - ox) + Math.PI) / (Math.PI * 2)
      const a = Math.atan2(y - oy, x - ox) + (rand() - 0.5) * 0.9, fly = 120 + rand() * 360
      out.push({
        x, y, r: 2.6 + 1.6 * Math.pow(1 - Math.min(1, dist), 1.3), d: Math.min(1, dist * 0.8 + turn * 0.2),
        c: rgb(tint(name)), cd: rgb(LIFT[name] ?? tint(name)), vx: Math.cos(a) * fly, vy: Math.sin(a) * fly - 60 * rand(),
      })
    }
  }
  return out
}

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
  const rig = useRef<HTMLDivElement>(null)
  const base = useRef<SVGSVGElement>(null)
  const layers = useRef<(HTMLDivElement | null)[]>([])
  const vines = useRef<SVGSVGElement>(null)
  const strands = useRef<(SVGPathElement | null)[]>([])
  const puffs = useRef<(SVGCircleElement | null)[]>([])
  const canvas = useRef<HTMLCanvasElement>(null)
  const words = useRef<(HTMLElement | null)[]>([])
  const chip = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const sec = section.current, rg = rig.current, cv = canvas.current, bs = base.current
    if (!sec || !rg || !cv || !bs) return
    const dots = makeDots(Array.from(bs.querySelectorAll("path")))
    const dark = window.matchMedia("(prefers-color-scheme: dark)")
    const ctx = cv.getContext("2d")
    let raf = 0, visible = false, ps = -1, shown = -2, drawn = ""
    const H = wide ? 230 : 150, TX = wide ? 52 : 44, TZ = wide ? -12 : -8

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(rg.offsetWidth * dpr); cv.height = Math.round(rg.offsetHeight * dpr)
      drawn = ""
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(rg)

    const paint = (p: number) => {
      // the words: each slides in and out over its own stretch of scroll
      WORDS.forEach((w, i) => {
        const el = words.current[i]
        if (!el) return
        const a = ease(seg(p, w.inn)), b = ease(seg(p, w.out)), v = a * (1 - b)
        el.style.opacity = v.toFixed(3)
        el.style.transform = `translate3d(0, ${((1 - a) * 34 - b * 34).toFixed(1)}px, 0)`
        el.style.visibility = v > 0.001 ? "visible" : "hidden"
      })
      if (chip.current) {
        const a = ease(seg(p, CHIP.inn)), b = ease(seg(p, CHIP.out)), v = a * (1 - b)
        chip.current.style.opacity = v.toFixed(3)
        chip.current.style.transform = `translate3d(0, ${((1 - a) * 24 - b * 24).toFixed(1)}px, 0)`
        chip.current.style.visibility = v > 0.001 ? "visible" : "hidden"
      }

      // the country tips back for the drops, then comes flat again
      const tilt = ease(seg(p, TILT)) * (1 - ease(seg(p, FLAT)))
      rg.style.transform = tilt > 0.0005
        ? `translateY(${(tilt * 5).toFixed(2)}%) rotateX(${(tilt * TX).toFixed(2)}deg) rotateZ(${(tilt * TZ).toFixed(2)}deg) scale(${(1 - tilt * 0.06).toFixed(4)})`
        : "none"
      bs.style.opacity = (1 - ease(seg(p, FLAT))).toFixed(3)

      // apart, then laced back together
      const apart = ease(seg(p, FLAT)) * (1 - ease(seg(p, LACE))) * (wide ? 1 : 0.55)
      const areaOut = ease(seg(p, [DOTS[0], DOTS[0] + (DOTS[1] - DOTS[0]) * 0.8]))
      let now = -1
      STEPS.forEach((group, g) => {
        const t = seg(p, [DROPS[0] + g * SLOT, DROPS[0] + (g + 1.4) * SLOT])
        if (t > 0.04 && p < FLAT[0] + 0.01) now = g
        const z = t >= 1 ? 0 : fall(t) * H
        const sx = (SPLIT[g][0] * apart / NET_VIEW.w) * 100, sy = (SPLIT[g][1] * apart / NET_VIEW.h) * 100
        const op = clamp(t / 0.12) * (1 - areaOut)
        group.forEach((i) => {
          const el = layers.current[i]
          if (!el) return
          el.style.transform = z > 0.05 || apart > 0.0005 ? `translate3d(${sx.toFixed(2)}%, ${sy.toFixed(2)}%, ${z.toFixed(1)}px)` : "none"
          el.style.opacity = op.toFixed(3)
          el.classList.toggle(styles.lifting, t > 0 && t < 1)
        })
      })
      if (now !== shown) { shown = now; if (now >= 0) setStep(now) }

      // the sprigs grow along their strands, then shorten and fade as the lace pulls the pieces in
      const grow = seg(p, VINES), tight = ease(seg(p, LACE))
      const vs = vines.current
      if (vs) {
        const on = grow > 0 && tight < 1
        vs.style.opacity = on ? (1 - tight).toFixed(3) : "0"
        if (on) STRANDS.forEach((s, k) => {
          const el = strands.current[k]
          if (!el) return
          const ax = MID[s.a][0] + SPLIT[s.a][0] * apart, ay = MID[s.a][1] + SPLIT[s.a][1] * apart
          const bx = MID[s.b][0] + SPLIT[s.b][0] * apart, by = MID[s.b][1] + SPLIT[s.b][1] * apart
          const dx = bx - ax, dy = by - ay, nx = -dy, ny = dx
          const k1 = s.bend * (1 - 0.6 * tight), k2 = -s.bend * 0.55 * (1 - 0.6 * tight)
          const c1x = ax + dx * 0.3 + nx * k1, c1y = ay + dy * 0.3 + ny * k1
          const c2x = ax + dx * 0.7 + nx * k2, c2y = ay + dy * 0.7 + ny * k2
          el.setAttribute("d", `M${ax.toFixed(1)} ${ay.toFixed(1)}C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`)
          const g = clamp(grow * 1.15 - (k % 5) * 0.03)
          el.style.strokeDashoffset = (1 - g).toFixed(3)
          PUFFS.forEach((u, j) => {
            const c = puffs.current[k * PUFFS.length + j]
            if (!c) return
            c.setAttribute("cx", bez(u, ax, c1x, c2x, bx).toFixed(1)); c.setAttribute("cy", bez(u, ay, c1y, c2y, by).toFixed(1))
            c.setAttribute("r", (9 * clamp((g - u) * 5)).toFixed(2))
          })
        })
      }

      // the dots: in each area's colour, then gold, then away
      if (ctx) {
        const q = seg(p, DOTS), gold = ease(seg(p, GOLD)), out = ease(seg(p, SCATTER))
        const key = `${q.toFixed(3)}|${gold.toFixed(3)}|${out.toFixed(3)}|${dark.matches}`
        if (key !== drawn) {
          drawn = key
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.clearRect(0, 0, cv.width, cv.height)
          if (q > 0) {
            const sx = cv.width / NET_VIEW.w, sy = cv.height / NET_VIEW.h
            ctx.setTransform(sx, 0, 0, sy, 0, 0)
            for (const d of dots) {
              const a = clamp((q * 1.3 - d.d) * 5)
              if (a <= 0) continue
              const alpha = a * (1 - out)
              if (alpha <= 0.002) continue
              const c = dark.matches ? d.cd : d.c
              const r = Math.round(c[0] + (GOLD_RGB[0] - c[0]) * gold), gg = Math.round(c[1] + (GOLD_RGB[1] - c[1]) * gold), b = Math.round(c[2] + (GOLD_RGB[2] - c[2]) * gold)
              ctx.fillStyle = `rgba(${r},${gg},${b},${alpha.toFixed(3)})`
              ctx.beginPath()
              ctx.arc(d.x + d.vx * out, d.y + d.vy * out, d.r * (0.35 + 0.65 * a) * (1 - 0.5 * out), 0, Math.PI * 2)
              ctx.fill()
            }
          }
        }
      }
    }

    if (still) { paint(0.9); return () => ro.disconnect() }

    // follow the scroll with a little lag of our own, so a flick of the wheel plays through rather than skipping
    const frame = () => {
      raf = 0
      if (!visible) return
      const r = sec.getBoundingClientRect()
      const target = clamp(-r.top / Math.max(1, r.height - window.innerHeight))
      ps = ps < 0 ? target : ps + (target - ps) * 0.12
      if (Math.abs(target - ps) < 0.00005) ps = target
      paint(ps)
      raf = requestAnimationFrame(frame)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(frame)
    }, { rootMargin: "200px 0px" })
    io.observe(sec)
    return () => { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf) }
  }, [still, wide])

  const name = NETS[STEPS[step][0]].name
  const key = netKey(name)
  const net = key ? NET[key] : null

  return (
    <section ref={section} className={`${styles.section} ${still ? styles.still : ""}`} aria-labelledby="nets-title">
      <div className={styles.stage} style={{ ["--tint" as string]: tint(name) }}>
        <h2 id="nets-title" className={styles.srOnly}>Australia&apos;s electricity networks, and Wattle</h2>

        <div className={styles.mapBox}>
          <div ref={rig} className={styles.rig}>
            <svg ref={base} className={styles.base} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
              {NETS.map((n) => <path key={n.name} d={n.d} />)}
            </svg>
            {NETS.map((n, i) => (
              <div key={n.name} ref={(el) => { layers.current[i] = el }} className={styles.layer}
                style={{ ["--c" as string]: tint(n.name), ["--cd" as string]: LIFT[n.name] ?? tint(n.name) }}>
                <svg viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden><path d={n.d} /></svg>
              </div>
            ))}
            <svg ref={vines} className={styles.vines} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
              {STRANDS.map((s, k) => <path key={k} ref={(el) => { strands.current[k] = el }} pathLength={1} />)}
              {STRANDS.flatMap((_, k) => PUFFS.map((_, j) => (
                <circle key={`${k}-${j}`} ref={(el) => { puffs.current[k * PUFFS.length + j] = el }} r="0" />
              )))}
            </svg>
            <canvas ref={canvas} className={styles.dots} role="img" aria-label="A map of Australia made of wattle-gold dots" />
          </div>
        </div>

        {WORDS.map((w, i) => (
          <p key={i} ref={(el) => { words.current[i] = el }} className={`${styles.words} ${styles[w.at]} ${w.big ? styles.big : ""}`}>{w.text}</p>
        ))}

        <div ref={chip} className={styles.chip} aria-live="polite">
          {net && key && (
            <div key={key} className={styles.company}>
              <div className={styles.logo}><Logo k={key} h={wide ? 44 : 32} w={wide ? 250 : 190} /></div>
              <p className={styles.meta}>
                <b>{net.states.join(" · ")}</b> {net.area}
                {CUSTOMERS[key] && <> About {CUSTOMERS[key]} customers.</>}
                {" "}<a href={net.website} target="_blank" rel="noopener noreferrer">{net.website.replace(/^https?:\/\/(www\.)?/, "")}{" ↗"}</a>
              </p>
              <div className={styles.rail} aria-hidden>
                {STEPS.map((g, i) => <i key={i} style={{ background: i <= step ? tint(NETS[g[0]].name) : undefined }} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
