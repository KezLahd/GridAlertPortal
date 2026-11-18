"use client"

import { useEffect, useRef, useState } from "react"
import { NET, netKey, type NetKey } from "@/components/wattle/networks"
import { NETS, NET_VIEW } from "./network-map-data"
import styles from "./network-assembly.module.css"
import { makeTie, TIE_VIEW } from "./brand-tie"

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
const TILT: Span = [0.05, 0.13], DROPS: Span = [0.14, 0.465], FLAT: Span = [0.495, 0.57], VINES: Span = [0.58, 0.68]
const LACE: Span = [0.68, 0.77], DOTS: Span = [0.77, 0.84], GOLD: Span = [0.83, 0.89], SCATTER: Span = [0.94, 1]
const SLOT = (DROPS[1] - DROPS[0]) / (G + 0.4)
// "Wattle ties them together.": the wordmark's t's pulled together by the wire (brand-tie.ts); they knock at 62% of TIE,
// and from there the grey page gives way to Wattle's own: paper, with the aurora spreading out from where they met
const TIE: Span = [0.625, 0.735], TIE_OUT: Span = [0.75, 0.775]
const KNOCK = TIE[0] + (TIE[1] - TIE[0]) * 0.62, THEME: Span = [KNOCK, KNOCK + 0.045]

// the words, each with where it sits and when it comes in and goes out
const WORDS: { text: string; at: string; big?: boolean; inn: Span; out: Span }[] = [
  { text: "Australia\u2019s power reaches you through fifteen network companies.", at: "top", big: true, inn: [-0.02, -0.01], out: [0.05, 0.09] },
  { text: "Not your retailer. The company that owns the poles and wires in your street.", at: "bottomLeft", big: true, inn: [0.06, 0.1], out: [0.13, 0.16] },
  { text: "Each one looks after its own patch.", at: "top", big: true, inn: [0.14, 0.17], out: [0.48, 0.51] },
  { text: "Fifteen companies. Fifteen websites.", at: "top", big: true, inn: [0.51, 0.545], out: [0.6, 0.63] },
  { text: "Each one reports outages in its own way. Checking them all, for every site you run, takes hours.", at: "bottomLeft", inn: [0.525, 0.555], out: [0.6, 0.63] },
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

// the sprigs: each company tied to its two nearest (a second strand on the longer ties), and three more right across
// the middle of the country, so it's laced through the centre and not only round the edge
const PAIRS: [number, number][] = []
MID.forEach((a, i) => {
  MID.map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1])] as const).filter(([j]) => j !== i)
    .sort((x, y) => x[1] - y[1]).slice(0, 3)
    .forEach(([j]) => { if (!PAIRS.some(([p, q]) => (p === i && q === j) || (p === j && q === i))) PAIRS.push([i, j]) })
})
const group = (name: string) => STEPS.findIndex((g) => NETS[g[0]].name === name)
const ACROSS = ([["Western Power", "Ergon Energy"], ["Power and Water", "SA Power Networks"], ["Horizon Power", "Essential Energy"]] as const)
  .map(([a, b]) => [group(a), group(b)] as [number, number]).filter(([a, b]) => a >= 0 && b >= 0)
const tie = (a: number, b: number) => Math.hypot(MID[a][0] - MID[b][0], MID[a][1] - MID[b][1])
const STRANDS = [
  ...PAIRS.flatMap(([a, b], k) => {
    const one = { a, b, bend: (k % 2 ? -1 : 1) * (0.12 + (k % 3) * 0.03) }
    return tie(a, b) > 170 ? [one, { a, b, bend: -one.bend * 0.8 }] : [one]
  }),
  ...ACROSS.map(([a, b], k) => ({ a, b, bend: (k % 2 ? -1 : 1) * 0.07 })),
]
// each sprig: a stem in four lengths that go under, over, under, over the pieces (the start alternating), thin leaves
// along it, and two small clusters of wattle balls
const SEGS = 4
const LEAVES = [0.07, 0.16, 0.27, 0.38, 0.5, 0.62, 0.74, 0.86]
const BLOOMS = [0.33, 0.69]
const BALLS: [number, number][] = [[0, -9], [6.5, -5], [-6, -4], [1.5, -15]]
// every length runs under the pieces: the sprigs show only in the gaps, and vanish as the gaps close
const over = (_k: number, _u: number) => false
// each sprig its own size, from slight to sturdy
const SIZE = (k: number) => 0.65 + ((k * 7) % 10) / 10 * 0.9
type Pt = [number, number]
const lerpP = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const halves = ([a, b, c, d]: Pt[], t: number) => {
  const ab = lerpP(a, b, t), bc = lerpP(b, c, t), cd = lerpP(c, d, t), abc = lerpP(ab, bc, t), bcd = lerpP(bc, cd, t), m = lerpP(abc, bcd, t)
  return [[a, ab, abc, m], [m, bcd, cd, d]]
}
const part = (q: Pt[], t0: number, t1: number) => halves(halves(q, t1)[0], t1 > 0 ? t0 / t1 : 0)[1]
const at = (q: Pt[], t: number): Pt => [
  (1 - t) ** 3 * q[0][0] + 3 * (1 - t) ** 2 * t * q[1][0] + 3 * (1 - t) * t * t * q[2][0] + t ** 3 * q[3][0],
  (1 - t) ** 3 * q[0][1] + 3 * (1 - t) ** 2 * t * q[1][1] + 3 * (1 - t) * t * t * q[2][1] + t ** 3 * q[3][1],
]
const heading = (q: Pt[], t: number) => {
  const x = 3 * (1 - t) ** 2 * (q[1][0] - q[0][0]) + 6 * (1 - t) * t * (q[2][0] - q[1][0]) + 3 * t * t * (q[3][0] - q[2][0])
  const y = 3 * (1 - t) ** 2 * (q[1][1] - q[0][1]) + 6 * (1 - t) * t * (q[2][1] - q[1][1]) + 3 * t * t * (q[3][1] - q[2][1])
  return Math.atan2(y, x)
}

// an area comes down from high above and settles into place, easing in and out, no hop. Its height, 1 to 0
const fall = (t: number) => 1 - ease(t)

// the dots: a fine grid over the country, each in its network's colour, revealed in a sweep from the middle
type Dot = { n: number; x: number; y: number; r: number; d: number; c: number[]; cd: number[]; vx: number; vy: number }
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
      const a = Math.atan2(y - oy, x - ox) + (rand() - 0.5) * 0.9, fly = 1500 + rand() * 2300
      out.push({
        n, x, y, r: 3.9 + 1.2 * Math.pow(1 - Math.min(1, dist), 1.3), d: Math.min(1, dist),
        c: rgb(tint(name)), cd: rgb(LIFT[name] ?? tint(name)), vx: Math.cos(a) * fly, vy: Math.sin(a) * fly - 120 * rand(),
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

/** Wattle's aurora (kept from the app's backgrounds, 15 Nov): three slow curtains of gold light across the top. */
function drawAurora(c: CanvasRenderingContext2D, w: number, h: number, t: number, dk: boolean) {
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.clearRect(0, 0, w, h)
  c.globalCompositeOperation = dk ? "lighter" : "source-over"
  const s = h / 450
  ;([[0.13, 0, 0.16, "242,179,0"], [0.21, 2.1, 0.11, "201,138,0"], [0.29, 4.2, 0.08, "242,179,0"]] as const).forEach(([at, ph, a, rgb], k) => {
    for (let x = -2; x <= w + 2; x += 2) {
      const y = h * at + (Math.sin(x / s * 0.012 + t * 0.35 + ph) * 22 + Math.sin(x / s * 0.031 - t * 0.2 + ph) * 8) * s
      const len = (70 + Math.sin(x / s * 0.05 + t * 0.6 + k) * 30) * s
      const g = c.createLinearGradient(0, y - len, 0, y)
      g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.8, `rgba(${rgb},${dk ? a * 0.8 : a})`); g.addColorStop(1, `rgba(${rgb},0)`)
      c.fillStyle = g; c.fillRect(x, y - len, 2.2, len)
    }
  })
  c.globalCompositeOperation = "source-over"
}

type Refs<T> = { current: (T | null)[] }
/** The parts of every sprig that sit on one side of the pieces: over them (upper) or under them. */
function Sprigs({ upper, stems, leaves, balls }: { upper: boolean; stems: Refs<SVGPathElement>; leaves: Refs<SVGEllipseElement>; balls: Refs<SVGCircleElement> }) {
  return (
    <>
      {STRANDS.flatMap((_, k) => Array.from({ length: SEGS }, (_, j) => (
        over(k, (j + 0.5) / SEGS) === upper && <path key={`s${k}-${j}`} ref={(el) => { stems.current[k * SEGS + j] = el }} />
      )))}
      {STRANDS.flatMap((_, k) => LEAVES.map((u, j) => (
        over(k, u) === upper && <ellipse key={`l${k}-${j}`} ref={(el) => { leaves.current[k * LEAVES.length + j] = el }} rx="0" ry="0" />
      )))}
      {STRANDS.flatMap((_, k) => BLOOMS.flatMap((u, j) => BALLS.map((_, m) => (
        over(k, u) === upper && <circle key={`b${k}-${j}-${m}`} ref={(el) => { balls.current[(k * BLOOMS.length + j) * BALLS.length + m] = el }} r="0" />
      ))))}
    </>
  )
}

export function NetworkAssembly({ still, wide }: { still: boolean; wide: boolean }) {
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const rig = useRef<HTMLDivElement>(null)
  const base = useRef<SVGSVGElement>(null)
  const layers = useRef<(HTMLDivElement | null)[]>([])
  const pins = useRef<(HTMLElement | null)[]>([])
  const vines = useRef<SVGSVGElement>(null)
  const vinesUnder = useRef<SVGSVGElement>(null)
  const stems = useRef<(SVGPathElement | null)[]>([])
  const leaves = useRef<(SVGEllipseElement | null)[]>([])
  const balls = useRef<(SVGCircleElement | null)[]>([])
  const canvas = useRef<HTMLCanvasElement>(null)
  const words = useRef<(HTMLElement | null)[]>([])
  const chip = useRef<HTMLDivElement>(null)
  const chipIn = useRef<HTMLDivElement>(null)
  const leader = useRef<HTMLDivElement>(null)
  const tieBox = useRef<HTMLDivElement>(null)
  const tieRow = useRef<HTMLParagraphElement>(null)
  const tieMark = useRef<SVGSVGElement>(null)
  const tieWords = useRef<HTMLSpanElement>(null)
  const tieSub = useRef<HTMLParagraphElement>(null)
  const overcast = useRef<HTMLDivElement>(null)
  const aurora = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const sec = section.current, st = stage.current, rg = rig.current, cv = canvas.current, bs = base.current
    if (!sec || !st || !rg || !cv || !bs) return
    const dots = makeDots(Array.from(bs.querySelectorAll("path")))
    const dark = window.matchMedia("(prefers-color-scheme: dark)")
    const ctx = cv.getContext("2d")
    // the country's sides, one path per area, coloured in an area's colour once it has landed
    const sides = Array.from(rg.querySelectorAll<SVGPathElement>(`.${styles.slab} path`))
    const landed: boolean[] = STEPS.map(() => false)
    let raf = 0, visible = false, ps = -1, shown = -2, drawn = "", bloom = ""
    let dpr = 1, cx = -1, cy = 0, side = 0
    // how far an area starts above the map, and how far the country tips back (no turn: it stays square to you)
    const H = wide ? 300 : 190, TX = wide ? 50 : 40
    const areas = NETS.map((n) => new Path2D(n.d))
    const byNet = NETS.map((_, i) => dots.filter((d) => d.n === i))
    // how big a dot is as the ring first reaches it: about the gap between dots, so it starts as part of the area
    const COVER = 6.8

    const tie = tieMark.current ? makeTie(tieMark.current) : null
    let tied = -1, tiedReach = -1
    const au = aurora.current, actx = au?.getContext("2d") ?? null
    // the wordmark as tall as the words beside it: the height of an l in whatever font the words are set in
    const fitMark = () => {
      const row = tieRow.current, mk = tieMark.current, c = document.createElement("canvas").getContext("2d")
      if (!row || !mk || !c) return
      const cs = getComputedStyle(row)
      c.font = `${cs.fontWeight} 100px ${cs.fontFamily}`
      const asc = c.measureText("l").actualBoundingBoxAscent / 100
      mk.style.height = `${((asc || 0.72) * TIE_VIEW.h / 71.45).toFixed(4)}em`
    }
    fitMark()
    document.fonts?.ready.then(fitMark)

    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(st.offsetWidth * dpr); cv.height = Math.round(st.offsetHeight * dpr)
      // the aurora is soft light: half the pixels is plenty
      if (au) { au.width = Math.round(st.offsetWidth / 2); au.height = Math.round(st.offsetHeight / 2) }
      drawn = ""
      fitMark()
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(st)

    // words fade in and fade out, in place: a is how far in (0 to 1), b how far out (0 to 1)
    const slide = (box: HTMLElement | null, inner: HTMLElement | null, a: number, b: number) => {
      if (!box || !inner) return
      const v = a * (1 - b)
      inner.style.opacity = v.toFixed(3)
      box.style.visibility = v > 0.001 ? "visible" : "hidden"
    }

    const paint = (p: number) => {
      // reads first (last frame's layout), then writes
      const sr = st.getBoundingClientRect(), rr = rg.getBoundingClientRect()
      const drop = p > DROPS[0] - 0.01 && p < FLAT[0] + 0.01
      let now = -1
      STEPS.forEach((_, g) => { if (seg(p, [DROPS[0] + g * SLOT, DROPS[0] + (g + 1.4) * SLOT]) > 0.04 && drop) now = g })
      const pin = now >= 0 ? pins.current[now]?.getBoundingClientRect() : null
      const cw = chip.current?.offsetWidth ?? 0, ch = chip.current?.offsetHeight ?? 0
      const reserve = (() => { const w = words.current[2]; return w ? w.offsetTop + w.offsetHeight + 24 : 120 })()
      const secTop = sec.getBoundingClientRect().top
      const mk = tieMark.current?.getBoundingClientRect()

      WORDS.forEach((w, i) => {
        const el = words.current[i]
        slide(el, el?.firstElementChild as HTMLElement | null, ease(seg(p, w.inn)), ease(seg(p, w.out)))
      })

      // the headline: the wordmark's t's pulled together, then the words beside it, then the line under it
      const tu = seg(p, TIE), tb = tieBox.current
      if (tb) {
        const v = tu > 0 ? 1 - ease(seg(p, TIE_OUT)) : 0
        tb.style.visibility = v > 0.001 ? "visible" : "hidden"
        tb.style.opacity = v.toFixed(3)
        // the right half of the mark starts where the words will be, so the wire pulls it across the whole line
        const wr = tieWords.current?.getBoundingClientRect(), mw = mk?.width ?? 0
        const oneLine = !!(wr && mk && wr.top < mk.bottom)
        const reach = oneLine && wr && mk ? Math.round(wr.right - mk.right) : 0
        if (v > 0.001 && tie && (Math.abs(tu - tied) > 0.0002 || reach !== tiedReach)) {
          tied = tu; tiedReach = reach
          tie(tu, mw > 0 && reach > 0 ? (reach * TIE_VIEW.w) / mw : 150)
        }
        if (tieWords.current) tieWords.current.style.opacity = ease(seg(tu, [0.64, 0.8])).toFixed(3)
        if (tieSub.current) tieSub.current.style.opacity = ease(seg(tu, [0.76, 0.94])).toFixed(3)
      }

      // the page: grey and still while it's fifteen companies; from the moment the t's meet, Wattle's paper and aurora
      // spread out from where they met. The grey also comes in softly as the section scrolls up, so there's no edge.
      const th = seg(p, THEME), oc = overcast.current
      const jx = mk ? mk.left - sr.left + mk.width * (168 / TIE_VIEW.w) : sr.width / 2, jy = mk ? mk.top - sr.top + mk.height * (24.28 / TIE_VIEW.h) : 100
      const far = Math.hypot(Math.max(jx, sr.width - jx), Math.max(jy, sr.height - jy)) + 200, rad = ease(th) * far
      if (oc) {
        oc.style.opacity = ease(clamp(1 - secTop / Math.max(1, window.innerHeight))).toFixed(3)
        const m = th > 0 ? `radial-gradient(circle at ${jx.toFixed(0)}px ${jy.toFixed(0)}px, transparent ${(rad - 160).toFixed(0)}px, #000 ${rad.toFixed(0)}px)` : ""
        oc.style.maskImage = m; oc.style.webkitMaskImage = m
        oc.style.visibility = th >= 1 ? "hidden" : "visible"
      }
      if (au && actx) {
        au.style.visibility = th > 0 ? "visible" : "hidden"
        if (th > 0) {
          const m = th < 1 ? `radial-gradient(circle at ${jx.toFixed(0)}px ${jy.toFixed(0)}px, #000 ${(rad - 160).toFixed(0)}px, transparent ${rad.toFixed(0)}px)` : ""
          au.style.maskImage = m; au.style.webkitMaskImage = m
          drawAurora(actx, au.width, au.height, performance.now() / 1000, dark.matches)
        }
      }

      // the company that's landing: beside the map on the side its area is on, in a fixed spot; only its line moves,
      // following the area down
      const ca = ease(seg(p, CHIP.inn)), cb = ease(seg(p, CHIP.out))
      slide(chip.current, chipIn.current, ca, cb)
      const ld = leader.current
      if (wide && chip.current && pin && ld) {
        const mx = pin.left + pin.width / 2 - sr.left, my = pin.top + pin.height / 2 - sr.top
        const s = mx < sr.width / 2 ? -1 : 1
        const tx = s < 0
          ? Math.max(24, rr.left - sr.left - 40 - cw)
          : Math.min(sr.width - cw - 24, rr.right - sr.left + 40)
        // one fixed spot on each side, at the same height, so the eye always finds it in the same place
        const ty = Math.min(sr.height - ch - 24, Math.max(reserve, sr.height * 0.5 - 40))
        if (s !== side || cx < 0) side = s
        cx = tx; cy = ty
        chip.current.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`
        // the line, from the chip's near edge to the middle of the falling area
        const ax = s < 0 ? cx + cw + 14 : cx - 14, ay = cy + 30
        const dx = mx - ax, dy = my - ay, len = Math.hypot(dx, dy)
        const grow = ca * (1 - cb)
        ld.style.width = `${(len * grow).toFixed(1)}px`
        ld.style.transform = `translate3d(${ax.toFixed(1)}px, ${ay.toFixed(1)}px, 0) rotate(${Math.atan2(dy, dx).toFixed(4)}rad)`
        ld.style.visibility = grow > 0.01 ? "visible" : "hidden"
      } else if (ld) ld.style.visibility = "hidden"

      // the country tips back for the drops, then comes flat again
      // and on a narrower screen it shrinks a little while it does, to leave room beside it for the company
      const tilt = ease(seg(p, TILT)) * (1 - ease(seg(p, FLAT)))
      const fit = wide ? Math.min(0.96, Math.max(0.7, (sr.width - 2 * (cw + 64)) / Math.max(1, rg.offsetWidth))) : 0.96
      rg.style.transform = tilt > 0.0005
        ? `translateY(${(tilt * 3).toFixed(2)}%) rotateX(${(tilt * TX).toFixed(2)}deg) scale(${(1 - tilt * (1 - fit)).toFixed(4)})`
        : "none"
      rg.classList.toggle(styles.flat, tilt < 0.02)
      // once every area has landed the country underneath goes, sides and all: the pieces carry their own sides now
      const allIn = p >= DROPS[1]
      rg.classList.toggle(styles.allIn, allIn)

      // apart, then laced back together
      const apart = ease(seg(p, FLAT)) * (1 - ease(seg(p, LACE))) * (wide ? 1 : 0.55)
      const dotted = p > DOTS[0]
      STEPS.forEach((group, g) => {
        const t = seg(p, [DROPS[0] + g * SLOT, DROPS[0] + (g + 1.4) * SLOT])
        const z = t >= 1 ? 0 : fall(t) * H
        const sx = (SPLIT[g][0] * apart / NET_VIEW.w) * 100, sy = (SPLIT[g][1] * apart / NET_VIEW.h) * 100
        // see-through while it falls, solid as it lands
        // into dots: the area stays until a soft ring spreading from the middle melts it away, in step with the dots
        const qd = seg(p, DOTS), op = dotted && qd >= 1 ? 0 : t > 0 ? 1 : 0
        const glass = t >= 1 ? 1 : clamp(t / 0.06) * (0.32 + 0.68 * ease(t))
        const down = t >= 1 && tilt > 0.02
        if (down !== landed[g]) {
          landed[g] = down
          group.forEach((i) => sides.forEach((sp, k) => { if (k % NETS.length === i) sp.classList.toggle(styles.on, down) }))
        }
        group.forEach((i) => {
          const el = layers.current[i]
          if (!el) return
          el.style.transform = z > 0.05 || apart > 0.0005 ? `translate3d(${sx.toFixed(2)}%, ${sy.toFixed(2)}%, ${z.toFixed(1)}px)` : "none"
          el.style.opacity = String(op)
          if (dotted && qd < 1) {
            const k = el.offsetWidth / NET_VIEW.w, R = Math.hypot(CX, CY) * k
            const ra = (qd * 1.35 - 0.2) * R, rb = qd * 1.35 * R
            const m = `radial-gradient(circle at ${((CX / NET_VIEW.w) * 100).toFixed(2)}% ${(((CY + 40) / NET_VIEW.h) * 100).toFixed(2)}%, transparent ${ra.toFixed(1)}px, #000 ${Math.max(ra + 1, rb).toFixed(1)}px)`
            el.style.maskImage = m; el.style.webkitMaskImage = m
          } else if (el.style.maskImage) { el.style.maskImage = ""; el.style.webkitMaskImage = "" }
          el.style.setProperty("--a", glass.toFixed(3))
          el.classList.toggle(styles.lifting, t > 0 && t < 1)
        })
      })
      if (now !== shown) { shown = now; if (now >= 0) setStep(now) }

      // the light behind the map takes the colour of what's happening: each company, the sprigs' green, then gold
      const want = now >= 0 ? tint(NETS[STEPS[now][0]].name) : p >= DOTS[0] ? "#F2B300" : p >= VINES[0] ? "#7E9B3A" : "#C9B48A"
      if (want !== bloom) { bloom = want; st.style.setProperty("--bloom", want) }

      // the sprigs grow from the middle of each piece, weaving over and under the pieces, then pull tight like a lace
      // and draw back in, so once the country is whole there's nothing left of them
      const grow = seg(p, VINES), tight = ease(seg(p, LACE))
      const vs = vines.current, vu = vinesUnder.current
      if (vs && vu) {
        const on = grow > 0 && tight < 1
        vs.style.opacity = vu.style.opacity = on ? "1" : "0"
        if (on) STRANDS.forEach((s, k) => {
          const A: Pt = [MID[s.a][0] + SPLIT[s.a][0] * apart, MID[s.a][1] + SPLIT[s.a][1] * apart]
          const B: Pt = [MID[s.b][0] + SPLIT[s.b][0] * apart, MID[s.b][1] + SPLIT[s.b][1] * apart]
          const dx = B[0] - A[0], dy = B[1] - A[1], nx = -dy, ny = dx
          const k1 = s.bend * (1 - 0.8 * tight), k2 = -s.bend * 0.55 * (1 - 0.8 * tight)
          const q: Pt[] = [A, [A[0] + dx * 0.3 + nx * k1, A[1] + dy * 0.3 + ny * k1], [A[0] + dx * 0.7 + nx * k2, A[1] + dy * 0.7 + ny * k2], B]
          const g = clamp(grow * 1.15 - (k % 5) * 0.03) * (1 - ease(clamp((tight - 0.45) / 0.55)))
          for (let j = 0; j < SEGS; j++) {
            const el = stems.current[k * SEGS + j]
            if (!el) continue
            el.style.strokeWidth = (2.6 * SIZE(k)).toFixed(2)
            const t0 = j / SEGS, t1 = Math.min((j + 1) / SEGS, g)
            if (t1 <= t0) { el.setAttribute("d", ""); continue }
            const [p0, p1, p2, p3] = part(q, t0, t1)
            el.setAttribute("d", `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}C${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} ${p3[0].toFixed(1)} ${p3[1].toFixed(1)}`)
          }
          LEAVES.forEach((u, j) => {
            const el = leaves.current[k * LEAVES.length + j]
            if (!el) return
            const sz = clamp((g - u) * 8)
            if (sz <= 0) { el.setAttribute("rx", "0"); el.setAttribute("ry", "0"); return }
            const [x, y] = at(q, u), ang = heading(q, u) + (j % 2 ? 0.75 : -0.75), rx = 12 * sz * SIZE(k)
            const cx = x + Math.cos(ang) * rx, cy = y + Math.sin(ang) * rx
            el.setAttribute("cx", cx.toFixed(1)); el.setAttribute("cy", cy.toFixed(1))
            el.setAttribute("rx", rx.toFixed(2)); el.setAttribute("ry", (2.8 * sz * SIZE(k)).toFixed(2))
            el.setAttribute("transform", `rotate(${((ang * 180) / Math.PI).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})`)
          })
          BLOOMS.forEach((u, j) => {
            const sz = clamp((g - u) * 6), [x, y] = at(q, u), ang = heading(q, u), c = Math.cos(ang), sn = Math.sin(ang)
            const side = (j + k) % 2 ? 1 : -1
            BALLS.forEach(([ox, oy], m) => {
              const el = balls.current[(k * BLOOMS.length + j) * BALLS.length + m]
              if (!el) return
              const px = (ox * c - oy * side * sn) * SIZE(k), py = (ox * sn + oy * side * c) * SIZE(k)
              el.setAttribute("cx", (x + px).toFixed(1)); el.setAttribute("cy", (y + py).toFixed(1))
              el.setAttribute("r", ((m === 3 ? 3.4 : 4.4) * sz * SIZE(k)).toFixed(2))
            })
          })
        })
      }

      // the dots, over the whole stage so they can fly off it: in each area's colour, then gold, then away
      if (ctx) {
        const q = seg(p, DOTS), gold = ease(seg(p, GOLD)), o = seg(p, SCATTER), out = o * o
        const ox = rr.left - sr.left, oy = rr.top - sr.top, sc = rr.width / NET_VIEW.w
        const key = `${q.toFixed(3)}|${gold.toFixed(3)}|${out.toFixed(4)}|${dark.matches}|${ox.toFixed(0)}|${oy.toFixed(0)}|${sc.toFixed(3)}`
        if (key !== drawn) {
          drawn = key
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.clearRect(0, 0, cv.width, cv.height)
          if (q > 0 && o < 1) {
            ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy)
            const shrink = 1 - 0.28 * gold
            // the morph: as the ring passes, each dot starts as a disc a little bigger than the gap between dots, over its
            // still-solid area, and shrinks to its dot while the area melts away under it. Nothing is clipped: a disc may
            // spill a touch past its edge, but every dot stays whole
            byNet.forEach((list) => {
              for (const d of list) {
                const front = q * 1.35 - d.d
                if (front <= 0) continue
                const m = ease(clamp(front * 2.4))
                const c = dark.matches ? d.cd : d.c
                const r = Math.round(c[0] + (GOLD_RGB[0] - c[0]) * gold), gg = Math.round(c[1] + (GOLD_RGB[1] - c[1]) * gold), b = Math.round(c[2] + (GOLD_RGB[2] - c[2]) * gold)
                ctx.fillStyle = `rgb(${r},${gg},${b})`
                ctx.beginPath()
                ctx.arc(d.x + d.vx * out, d.y + d.vy * out, (COVER + (d.r - COVER) * m) * shrink * (1 + 1.6 * o * o), 0, Math.PI * 2)
                ctx.fill()
              }
            })
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
      <div ref={stage} className={styles.stage} style={{ ["--tint" as string]: tint(name) }}>
        <h2 id="nets-title" className={styles.srOnly}>Australia&apos;s electricity networks, and Wattle</h2>
        <div ref={overcast} className={styles.overcast} aria-hidden />
        <canvas ref={aurora} className={styles.aurora} aria-hidden />
        <div className={styles.bloom} aria-hidden />

        <div className={styles.mapBox}>
          <div ref={rig} className={styles.rig}>
            {/* the country's thickness, seen while it's tipped back: three layers make a solid side */}
            {[3, 2, 1].map((k) => (
              <svg key={k} className={`${styles.base} ${styles.slab}`} style={{ ["--z" as string]: `${-k * 5}px` }} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
                {NETS.map((n) => <path key={n.name} d={n.d} style={{ ["--c" as string]: tint(n.name), ["--cd" as string]: LIFT[n.name] ?? tint(n.name) }} />)}
              </svg>
            ))}
            <svg ref={base} className={styles.base} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
              {NETS.map((n) => <path key={n.name} d={n.d} />)}
            </svg>
            {/* the lengths of sprig that pass under the pieces */}
            <svg ref={vinesUnder} className={styles.vines} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
              <Sprigs upper={false} stems={stems} leaves={leaves} balls={balls} />
            </svg>
            {NETS.map((n, i) => {
              const g = STEPS.findIndex((s) => s[0] === i)
              return (
                <div key={n.name} ref={(el) => { layers.current[i] = el }} className={styles.layer}
                  style={{ ["--c" as string]: tint(n.name), ["--cd" as string]: LIFT[n.name] ?? tint(n.name) }}>
                  {[3, 2, 1].map((k) => (
                    <svg key={k} className={styles.edge} style={{ ["--z" as string]: `${-k * 4}px` }} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden><path d={n.d} /></svg>
                  ))}
                  <svg viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden><path d={n.d} /></svg>
                  {g >= 0 && <i ref={(el) => { pins.current[g] = el }} className={styles.pin}
                    style={{ left: `${(MID[g][0] / NET_VIEW.w) * 100}%`, top: `${(MID[g][1] / NET_VIEW.h) * 100}%` }} />}
                </div>
              )
            })}
            <svg ref={vines} className={styles.vines} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
              <Sprigs upper stems={stems} leaves={leaves} balls={balls} />
            </svg>
          </div>
        </div>
        <canvas ref={canvas} className={styles.dots} role="img" aria-label="A map of Australia made of wattle-gold dots" />

        {WORDS.map((w, i) => (
          <p key={i} ref={(el) => { words.current[i] = el }} className={`${styles.words} ${styles[w.at]} ${w.big ? styles.big : ""}`}>
            <span>{w.text}</span>
          </p>
        ))}

        <div ref={tieBox} className={styles.tie}>
          <p ref={tieRow} className={styles.tieRow}>
            <svg ref={tieMark} className={styles.tieMark} viewBox={`0 0 ${TIE_VIEW.w} ${TIE_VIEW.h}`} role="img" aria-label="Wattle" />
            <span ref={tieWords}>ties them together.</span>
          </p>
          <p ref={tieSub} className={styles.tieSub}>All fifteen networks, in one place.</p>
        </div>

        <div ref={leader} className={styles.leader} aria-hidden />
        <div ref={chip} className={styles.chip} aria-live="polite">
          <div ref={chipIn}>
            {net && key && (
              <div key={key} className={styles.company}>
                <div className={styles.logo}><Logo k={key} h={wide ? 40 : 32} w={wide ? 230 : 190} /></div>
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
      </div>
    </section>
  )
}
