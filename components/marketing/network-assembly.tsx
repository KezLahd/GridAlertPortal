"use client"

import { useEffect, useRef, useState } from "react"
import { NET, netKey, type NetKey } from "@/components/wattle/networks"
import { NETS, NET_VIEW } from "./network-map-data"
import styles from "./network-assembly.module.css"
import { makeTie, halves as tieHalves, TIE_VIEW, MEET as TIE_MEET, PULL as TIE_PULL } from "./brand-tie"
import { STITCHES } from "./network-stitches"

// The page's story, told on one map of Australia as you scroll. Every step is tied to the scroll position (smoothed
// a little more on top of Lenis, like a scrubbed timeline), so nothing fires and vanishes on one flick of the wheel:
//   1. the country, flat, in one colour
//   2. it tips back into 3D, and each network's area drops onto it in turn, named with its logo and details
//   3. the map comes back flat and breaks apart into fifteen pieces, with no country behind them
//   4. Wattle sprigs grow between the pieces, twining, then pull tight like a lace and draw them back into one
//   5. each area turns into dots of its own colour; a gold ripple from where the t's meet turns the wordmark into wattle
//      dots (the app's pull to refresh), which fly down, one onto every dot, each turning gold as its own lands; then away
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
export const tint = (name: string) => COLOUR[name] ?? "#8A8170"
// the darkest brand colours, lifted for dark mode so their areas don't vanish into the page
export const LIFT: Record<string, string> = { "Horizon Power": "#2F7199", "Ergon Energy": "#4A55C8", "SA Power Networks": "#7D7D7D" }

// one step per company: CitiPower and Powercor are one business with one logo, so they land together
export const STEPS: number[][] = []
NETS.forEach((n, i) => {
  const prev = STEPS[STEPS.length - 1]
  if (prev && netKey(NETS[prev[0]].name) && netKey(NETS[prev[0]].name) === netKey(n.name)) prev.push(i)
  else STEPS.push([i])
})
const G = STEPS.length

// the timeline, as fractions of the section's scroll (0 = its top reaches the top of the screen, 1 = its end)
type Span = [number, number]
// the country is a 3D slab throughout. Tipped back while the areas drop onto it, it turns to face you once they're all
// in (FACE), keeping its depth; only then does it break apart (FLAT), the sprigs grow and pull it back together
// It opens as one plain slab facing you, only just tipped so its depth shows, and tips back as you start to scroll (TIP)
const TIP: Span = [0.05, 0.06], TIP0 = 0.28
const DROPS: Span = [0.09, 0.37], FACE: Span = [0.312, 0.37], FLAT: Span = [0.38, 0.43], VINES: Span = [0.44, 0.6]
const DOTS: Span = [0.83, 0.885], GOLD: Span = [0.88, 0.915], SCATTER: Span = [0.945, 1]
// the wordmark ripples into wattle dots (RIPPLE), then they fly down onto the map (FLIGHT), one onto every dot. GOLD is
// only the fallback for when the wordmark couldn't be loaded: then the dots just turn gold together
const RIPPLE: Span = [0.886, 0.896], FLIGHT: Span = [0.896, 0.936]
// The fifteen companies: their logos come in round the map (LOGOS), each with a faint, small copy of its piece beside it;
// then, as you scroll, the pieces all fly in together from beside their logos to their places (FLY). Once the country is
// painted, the camera moves in (ZOOM): the map grows to its full size, the logos rush outwards past the edges of the
// screen and the "15 companies." line grows and fades with them
// it opens on "When the power goes out," over a lit bulb that flickers out as the section scrolls fully into view, then
// "who do you call?" under the dead bulb; the answer,
// "15 companies.", comes in with their logos in two columns in the middle (LOGOS), then the columns part (PART) and
// Australia comes up between them
const PART: Span = [0.1, 0.135]
const LOGOS: Span = [0.068, 0.094], FLY: Span = [0.145, 0.27], ZOOM: Span = [0.282, 0.37]
// the timeline against the real scroll: the opening is short, the flying in a little longer, the rest as before, and
// the last screen stays put for the final stretch of the section (raw 0.88 to 1)
const WARP: [number, number][] = [[0, 0], [0.14, 0.15], [0.32, 0.4], [0.88, 1], [1, 1]]
const warp = (r: number) => {
  for (let i = 1; i < WARP.length; i++) {
    const [r0, p0] = WARP[i - 1], [r1, p1] = WARP[i]
    if (r <= r1) return p0 + ((r - r0) / Math.max(1e-6, r1 - r0)) * (p1 - p0)
  }
  return 1
}
// "Wattle ties them together.": the wordmark's t's pulled together by the wire (brand-tie.ts), hard at first then quicker,
// while the sprigs pull the pieces of the country together in step (LACE). They meet at MEET (62% of TIE) and bounce; once the word has
// settled, the grey page gives way to Wattle's own: paper, with the aurora spreading out from the middle of the word.
const TIE: Span = [0.612, 0.79], TIE_OUT: Span = [0.925, 0.94]
const MEET = TIE[0] + (TIE[1] - TIE[0]) * TIE_MEET, LACE: Span = [TIE[0] + (TIE[1] - TIE[0]) * TIE_PULL, MEET]
// the moment the t's first meet, Wattle's paper and aurora ripple out from where they met (THEME), and the map goes from
// 3D to flat under it (FLATTEN): the pieces' sides sink away to nothing
const THEME: Span = [MEET, MEET + 0.045], FLATTEN: Span = [MEET, MEET + 0.035]

// the words, each with where it sits and when it comes in and goes out: a big line, and sometimes a smaller one under
// it; the last one carries the wordmark above it
// Each entry is one or more big lines, each coming in at its own moment (lines[j].inn), and maybe a smaller line under
// them that comes in after; the whole thing goes out together. **15** marks a number to set big and bold: the numbers
// are the point. The last one carries the wordmark above it.
type Line = { text: string; inn: Span; note?: string; noteIn?: Span; noteOut?: Span }
type Words = { lines: Line[]; sub?: Line; brand?: boolean; hero?: boolean; at: string; out: Span }
const WORDS: Words[] = [
  // the opening line, alone and big; it goes as the country tips back
  // a small lead-in, then the big claim; the kicker and the claim are split by "|"
  // the opening question, one line at a time, over the bulb going out
  { lines: [{ text: "When the power goes out,", inn: [-0.02, -0.01] }, { text: "who do you call?", inn: [0.016, 0.028] }], hero: true, at: "top", out: [0.044, 0.054] },
  // as the logos come in, then as the country breaks apart
  // "15 companies." first, then the logos under it; "Across the nation." once the columns part and Australia shows, and
  // it stays until the line goes past the camera
  { lines: [{ text: "**15** companies.", inn: [0.054, 0.066], note: "Across the nation.", noteIn: [0.112, 0.128] }, { text: "**15** websites.", inn: [0.345, 0.365] }], at: "top", out: [0.428, 0.438] },
  // as the dots turn gold
  { lines: [{ text: "**15** networks. **1** map.", inn: [0.832, 0.852] }], at: "bottomLeft", out: [0.925, 0.94] },
  { lines: [{ text: "Be the first to know.", inn: [0.94, 0.965] }], brand: true, at: "centre", out: [2, 3] },
]
/** a line with its **numbers** set big and bold */
function Rich({ text }: { text: string }) {
  return <>{text.split(/\*\*(.+?)\*\*/).map((t, i) => (i % 2 ? <b key={i} className={styles.num}>{t}</b> : t))}</>
}

// customers on each network, rounded, from the networks' own 2024-26 reports and regulatory filings with the AER and
// ERA WA (CitiPower and Powercor added together)
export const CUSTOMERS: Partial<Record<NetKey, string>> = {
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
// the pieces start out all about the same size, whatever their real size: START[g] is the scale that does it (filled
// in once the pieces are drawn, from their bounds)
const START: number[] = []
// the thickness of the country and of each piece: one copy of its outline per pixel of depth, so the sides read as
// solid rather than as stacked layers
const PIECE_DEPTH = 12, BASE_DEPTH = 15
const PIECE_SLICES = Array.from({ length: PIECE_DEPTH }, (_, i) => PIECE_DEPTH - i)
const BASE_SLICES = Array.from({ length: BASE_DEPTH }, (_, i) => BASE_DEPTH - i)
// which company each area belongs to
const OWN = NETS.map((_, i) => STEPS.findIndex((g) => g.includes(i)))
// how far each piece turns as it drifts apart, in degrees: a little, each its own way
const TURN = STEPS.map((_, g) => (g % 2 ? 1 : -1) * (1.2 + ((g * 37) % 10) * 0.22))
// which side of the map each company's logo sits on, and where down that side: the western half of the pieces on the
// left, the eastern half on the right, each side top to bottom in the order their pieces sit
const COL: { side: number; j: number; n: number }[] = (() => {
  const byX = STEPS.map((_, g) => g).sort((a, b) => MID[a][0] - MID[b][0])
  const half = Math.ceil(byX.length / 2)
  const out: { side: number; j: number; n: number }[] = []
  ;[byX.slice(0, half), byX.slice(half)].forEach((list, s) => {
    list.sort((a, b) => MID[a][1] - MID[b][1]).forEach((g, j) => { out[g] = { side: s ? 1 : -1, j, n: list.length } })
  })
  return out
})()
// Horizon Power's little strip on the south coast (its first outline, below this line) breaks off on its own when the
// country splits, dropping below Western Power, so the west comes apart like a puzzle
const SNIP_Y = 645
const HORIZON = NETS.findIndex((n) => n.name === "Horizon Power")
const [SNIP_D, HORIZON_D] = (() => {
  const parts = NETS[HORIZON]?.d.split(/(?=M)/) ?? []
  return [parts.filter((d) => +d.slice(1).split(/[ L]/)[1] > SNIP_Y).join(""), parts.filter((d) => +d.slice(1).split(/[ L]/)[1] <= SNIP_Y).join("")]
})()
const shapeOf = (i: number) => (i === HORIZON && SNIP_D ? HORIZON_D : NETS[i].d)
// filled in by evenSplit() once the shapes are on the page
const SPLIT: number[][] = MID.map(() => [0, 0])
// each piece's own box on the map (x, y, w, h, in the map's units), a little padded. Its layer and its SVGs are cropped
// to it, so a moving piece is a small layer for the browser to move about, not a map-sized one (times 13, for its sides)
// Horizon's strip rides on Western Power, right where it sits, so it never drifts off on its own
const WPN = NETS.findIndex((n) => n.name === "Western Power")
const BOX = NETS.map((_, i) => {
  const v = (shapeOf(i).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  if (i === WPN && SNIP_D) {
    const w = (SNIP_D.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    v.push(...w)
  }
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity
  for (let k = 0; k + 1 < v.length; k += 2) { a = Math.min(a, v[k]); c = Math.max(c, v[k]); b = Math.min(b, v[k + 1]); d = Math.max(d, v[k + 1]) }
  return [a - 3, b - 3, c - a + 6, d - b + 6]
})
const TAS = STEPS.findIndex((g) => NETS[g[0]].name === "TasNetworks")
const WP = STEPS.findIndex((g) => NETS[g[0]].name === "Western Power")

/** Where each piece goes when the country breaks apart: pushed out from the middle a little, then nudged apart until
 *  every piece sits the same gap from each of its neighbours, none covering another. */
function evenSplit(paths: SVGPathElement[], GAP = 30) {
  const step = 8, cols = Math.ceil(NET_VIEW.w / step), rows = Math.ceil(NET_VIEW.h / step)
  const owner = new Int16Array(cols * rows).fill(-1)
  const gOf = NETS.map((_, i) => STEPS.findIndex((s) => s.includes(i)))
  const pt = new DOMPoint()
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    pt.x = c * step + step / 2; pt.y = r * step + step / 2
    const n = paths.findIndex((p) => p.isPointInFill(pt))
    if (n >= 0 && !(NETS[n].name === "Horizon Power" && pt.y > SNIP_Y)) owner[r * cols + c] = gOf[n]
  }
  const pts: { g: number; x: number; y: number }[] = [], mass = MID.map(() => 0)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const g = owner[r * cols + c]
    if (g < 0) continue
    mass[g]++
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => {
      const cc = c + dc, rr = r + dr
      return cc < 0 || rr < 0 || cc >= cols || rr >= rows || owner[rr * cols + cc] !== g
    })
    if (nb) pts.push({ g, x: c * step + step / 2, y: r * step + step / 2 })
  }
  const D = MID.map(([x, y]) => [(x - CX) * 0.14, (y - CY - 40) * 0.14])
  // a few start off in a set direction: Evoenergy (the ACT,
  // a hole in Essential's area) out to the south-east and Essential up and away from it, so it has a gap of its own
  const START: Record<string, [number, number]> = { "Evoenergy": [34, 44], "Essential Energy": [-12, -16] }
  STEPS.forEach((g, i) => { const v = START[NETS[g[0]].name]; if (v) D[i] = [...v] })
  const small = Math.min(...mass.filter((m) => m > 0))
  for (let it = 0; it < 160; it++) {
    const grid = new Map<number, number[]>(), key = (i: number, j: number) => i * 4099 + j
    pts.forEach((q, k) => { const x = q.x + D[q.g][0], y = q.y + D[q.g][1], kk = key(Math.floor(x / GAP), Math.floor(y / GAP)); (grid.get(kk) ?? grid.set(kk, []).get(kk)!).push(k) })
    const F = MID.map(() => [0, 0, 0])
    // whose ground (if anyone else's) a point has been moved onto
    const inside = (x: number, y: number, me: number) => {
      for (let g = 0; g < D.length; g++) {
        if (g === me) continue
        const c = Math.floor((x - D[g][0]) / step), r = Math.floor((y - D[g][1]) / step)
        if (c >= 0 && r >= 0 && c < cols && r < rows && owner[r * cols + c] === g) return g
      }
      return -1
    }
    pts.forEach((q) => {
      const x = q.x + D[q.g][0], y = q.y + D[q.g][1], gi = Math.floor(x / GAP), gj = Math.floor(y / GAP)
      // sitting on another piece: push straight away from that piece's middle, hard
      const o = inside(x, y, q.g)
      if (o >= 0) {
        const dx = MID[q.g][0] + D[q.g][0] - MID[o][0] - D[o][0], dy = MID[q.g][1] + D[q.g][1] - MID[o][1] - D[o][1], d = Math.hypot(dx, dy) || 1
        F[q.g][0] += (dx / d) * 2; F[q.g][1] += (dy / d) * 2; F[q.g][2]++
        return
      }
      for (let i = gi - 1; i <= gi + 1; i++) for (let j = gj - 1; j <= gj + 1; j++) for (const k of grid.get(key(i, j)) ?? []) {
        const o = pts[k]
        if (o.g === q.g) continue
        let dx = x - (o.x + D[o.g][0]), dy = y - (o.y + D[o.g][1]), d = Math.hypot(dx, dy)
        if (d >= GAP) continue
        if (d < 0.01) { dx = MID[q.g][0] - MID[o.g][0]; dy = MID[q.g][1] - MID[o.g][1]; d = Math.hypot(dx, dy) || 1 }
        const f = (GAP - Math.min(d, GAP)) / GAP
        F[q.g][0] += (dx / d) * f; F[q.g][1] += (dy / d) * f; F[q.g][2]++
      }
    })
    F.forEach(([fx, fy, n], g) => {
      if (!n) return
      const k = GAP * 0.45 * Math.sqrt(small / mass[g]) ** 0.6
      D[g][0] += (fx / Math.sqrt(n)) * k * 0.25; D[g][1] += (fy / Math.sqrt(n)) * k * 0.25
    })
  }
  D.forEach((d, g) => { SPLIT[g][0] = d[0]; SPLIT[g][1] = d[1] })
}

// the sprigs: short stitches across every border where two pieces meet, evenly spaced along it (network-stitches.ts),
// so as the country breaks apart each gap is laced across its whole length, and the stitches draw it back together.
// Longer borders (the big states) get sturdier stitches; each one's thickness wanders a little
const STRANDS = STITCHES.map((t, k) => ({
  ...t, bend: (k % 2 ? -1 : 1) * (0.1 + (k % 3) * 0.05),
  w: (0.5 + 1.2 * Math.min(1, t.len / 160)) * (0.4 + (((k * 7) % 11) / 10) * 1.3),
}))
// how far out each stitch is from the middle of the country (0 to 1), so the sprigs creep outwards from there
const SPREAD = (() => {
  const d = STRANDS.map((t) => Math.hypot((t.pa[0] + t.pb[0]) / 2 - NET_VIEW.w * 0.6, (t.pa[1] + t.pb[1]) / 2 - NET_VIEW.h * 0.55))
  const top = Math.max(...d)
  return d.map((v) => v / top)
})()
// each sprig: a stem in four lengths that go under, over, under, over the pieces (the start alternating), thin leaves
// along it, and two small clusters of wattle balls
const SEGS = 2
const LEAVES = [0.22, 0.5, 0.78]
const BLOOMS = [0.5]
const BALLS: [number, number][] = [[0, -6.4], [4.6, -3.2], [-4.4, -2.8]]
// every length runs under the pieces: the sprigs show only in the gaps, and vanish as the gaps close
const over = (_k: number, _u: number) => false
// each sprig its own size, from slight to sturdy
const SIZE = (k: number) => STRANDS[k].w
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
type Dot = { n: number; x: number; y: number; r: number; d: number; c: number[]; cd: number[]; vx: number; vy: number; land: number }
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
        c: rgb(tint(name)), cd: rgb(LIFT[name] ?? tint(name)), vx: Math.cos(a) * fly, vy: Math.sin(a) * fly - 120 * rand(), land: Infinity,
      })
    }
  }
  return out
}

// The wordmark as wattle dots, packed largest first as the app's pull to refresh does, in the wordmark's own units
// (TIE_VIEW). Packed on a 400px-wide copy, where the app's sizes were tuned.
type WDot = { x: number; y: number; r: number; d: number; kids: Flyer[]; leave: number[] }
type Flyer = { s: WDot; to: Dot; tl: number; dur: number; jx: number; jy: number }
const JOIN: Pt = [168, 24.28] // where the t's meet, in the wordmark's units
function packWord(path: string): WDot[] {
  const k = 400 / TIE_VIEW.w, W = 400, H = Math.ceil(TIE_VIEW.h * k)
  const c = document.createElement("canvas"); c.width = W; c.height = H
  const g = c.getContext("2d", { willReadFrequently: true })
  if (!g) return []
  g.scale(k, k); g.fill(new Path2D(path))
  const px = g.getImageData(0, 0, W, H).data
  const inside = (x: number, y: number) => { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] > 200 }
  let seed = 11
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const cell = 10, grid = new Map<string, { x: number; y: number; r: number }[]>(), got: { x: number; y: number; r: number }[] = []
  const fits = (x: number, y: number, r: number) => {
    if (!inside(x, y)) return false
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; if (!inside(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92)) return false }
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell)
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of grid.get(`${cx + i},${cy + j}`) ?? []) if (Math.hypot(o.x - x, o.y - y) < o.r + r + 0.9) return false
    return true
  }
  for (const r of [4.6, 3.8, 3.1, 2.5, 2.0, 1.6]) for (let n = 0; n < 9000; n++) {
    const x = rand() * W, y = rand() * H
    if (!fits(x, y, r)) continue
    const o = { x, y, r: r * (0.94 + rand() * 0.12) }, key = `${Math.floor(x / cell)},${Math.floor(y / cell)}`
    got.push(o); grid.set(key, [...(grid.get(key) ?? []), o])
  }
  return got.map((o) => ({ x: o.x / k, y: o.y / k, r: o.r / k, d: Math.hypot(o.x / k - JOIN[0], o.y / k - JOIN[1]), kids: [], leave: [] }))
}
// One gold dot flies to every map dot. Each map dot is fed by the word dot whose place in the word matches its place on
// the map (left letters feed the west, the tops of the letters the north); a word dot whose place is off the coast still
// flies, to the nearest map dot. Times are fractions of FLIGHT, scattered so they land all over at once, not as a wave
function planFlight(word: WDot[], dots: Dot[]): Flyer[] {
  let seed = 13
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const maxD = Math.max(...word.map((w) => w.d)), xs = word.map((w) => w.x), ys = word.map((w) => w.y)
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const home = word.map((w) => [NET_VIEW.w * (0.04 + (0.92 * (w.x - x0)) / (x1 - x0)), NET_VIEW.h * (0.1 + (0.8 * (w.y - y0)) / (y1 - y0))])
  const fly = (s: WDot, to: Dot): Flyer => {
    const f = { s, to, tl: (0.25 * (s.d / maxD) + rand() * 0.95) / 2.25, dur: (0.65 + rand() * 0.4) / 2.25, jx: rand() - 0.5, jy: rand() }
    s.kids.push(f); to.land = Math.min(to.land, f.tl + f.dur); return f
  }
  word.forEach((w) => { w.kids = [] })
  dots.forEach((d) => { d.land = Infinity })
  const out = dots.map((d) => {
    let bi = 0, bv = Infinity
    home.forEach(([hx, hy], k) => { const e = (hx - d.x) ** 2 + ((hy - d.y) * 1.6) ** 2; if (e < bv) { bv = e; bi = k } })
    return fly(word[bi], d)
  })
  word.forEach((w, k) => {
    if (w.kids.length) return
    let best = dots[0], bv = Infinity
    for (const d of dots) { const e = (home[k][0] - d.x) ** 2 + (home[k][1] - d.y) ** 2; if (e < bv) { bv = e; best = d } }
    out.push(fly(w, best))
  })
  word.forEach((w) => { w.leave = w.kids.map((f) => f.tl).sort((a, b) => a - b) })
  return out
}

// logos with a sharper or fuller lockup than the app's icon + wordmark pair: one image, light and dark versions
const LOCKUP: Partial<Record<NetKey, { light: string; dark: string; aspect: number }>> = {
  energex: { light: "/networks/energex-lockup.svg", dark: "/networks/energex-lockup-dark.svg", aspect: 2.646 },
  tasnetworks: { light: "/networks/tasnetworks-lockup.png", dark: "/networks/tasnetworks-lockup-dark.png", aspect: 2.19 },
}


/** A network's logo at most `h` tall and `w` wide, as one lockup or as its icon mark and wordmark side by side. */
// `area`: size every logo to the same area instead of the same height, so stacked and wide ones carry the same weight
/** From four screen points (the map's corners: top-left, top-right, bottom-left, bottom-right) to a function that turns
 *  any screen point into where it falls on the map, 0–1 across and down, however the map is tilted. */
function unproject(q: (Pt | null)[]): ((x: number, y: number) => Pt) | null {
  if (q.some((v) => !v)) return null
  const src = q as Pt[], dst: Pt[] = [[0, 0], [1, 0], [0, 1], [1, 1]]
  // solve the 8 unknowns of the homography screen → map
  const A: number[][] = []
  src.forEach(([x, y], i) => {
    const [u, v] = dst[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v])
  })
  for (let c = 0; c < 8; c++) {
    let m = c
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r
    ;[A[c], A[m]] = [A[m], A[c]]
    if (Math.abs(A[c][c]) < 1e-9) return null
    for (let r = 0; r < 8; r++) {
      if (r === c) continue
      const f = A[r][c] / A[c][c]
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]
    }
  }
  const h = A.map((row, i) => row[8] / row[i])
  return (x, y) => { const w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w] }
}

export function Logo({ k, h, w, area }: { k: NetKey; h: number; w: number; area?: number }) {
  const n = NET[k]
  const lock = LOCKUP[k]
  if (lock) {
    const lh = area ? Math.min(Math.sqrt(area / lock.aspect), w / lock.aspect, h * 2.4) : Math.min(h * 1.25, w / lock.aspect)
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
  const fit = area ? Math.min(Math.sqrt(area / (across + gap / h)), (w - gap) / across, h * 1.6) : Math.min(h, (w - gap) / across)
  return (
    <span className={styles.pair} role="img" aria-label={n.name}>
      {n.icon && <img src={`/networks/${k}-icon.png`} alt="" className={`tone-${n.icon[1]}`} style={{ height: fit, width: fit * n.icon[0] }} />}
      {n.word && <img src={`/networks/${k}-word.png`} alt="" className={`tone-${n.word[1]}`} style={{ height: fit * wordScale, width: fit * wordScale * n.word[0] }} />}
    </span>
  )
}

/** Wattle's aurora (kept from the app's backgrounds, 15 Nov): three slow curtains of gold light across the top. */
function drawAurora(c: CanvasRenderingContext2D, w: number, h: number, t: number, dk: boolean, reveal?: [number, number, number]) {
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
  // spreading out from a point: everything outside the circle is wiped, with a soft edge
  if (reveal) {
    const [x, y, r] = reveal, g = c.createRadialGradient(x, y, Math.max(0, r - 80), x, y, Math.max(1, r))
    g.addColorStop(0, "#000"); g.addColorStop(1, "rgba(0,0,0,0)")
    c.globalCompositeOperation = "destination-in"
    c.fillStyle = r > 0 ? g : "rgba(0,0,0,0)"; c.fillRect(0, 0, w, h)
  }
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
  const marks = useRef<(HTMLDivElement | null)[]>([])
  const mapBox = useRef<HTMLDivElement>(null)
  const bulb = useRef<HTMLDivElement>(null)
  const corners = useRef<(HTMLElement | null)[]>([])
  const tieBox = useRef<HTMLDivElement>(null)
  const tieRow = useRef<HTMLParagraphElement>(null)
  const tieWords = useRef<HTMLSpanElement>(null)
  const tieMark = useRef<SVGSVGElement>(null)
  const overcast = useRef<HTMLDivElement>(null)
  const aurora = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const sec = section.current, st = stage.current, rg = rig.current, cv = canvas.current, bs = base.current
    if (!sec || !st || !rg || !cv || !bs) return
    const dots = makeDots(Array.from(bs.querySelectorAll("path")))
    evenSplit(Array.from(bs.querySelectorAll("path")))
    const dark = window.matchMedia("(prefers-color-scheme: dark)")
    const ctx = cv.getContext("2d")
    // the country's sides, one path per area, coloured in an area's colour once it has landed
    const sides = Array.from(rg.querySelectorAll<SVGPathElement>(`.${styles.slab} path`))
    const landed: boolean[] = STEPS.map(() => false)
    let raf = 0, visible = false, ps = -1, shown = -2, drawn = "", bloom = ""
    let dpr = 1, cx = -1, cy = 0, side = 0
    // how far an area starts above the map, and how far the country tips back (no turn: it stays square to you)
    const TX = wide ? 62 : 52, GAPX = wide ? 64 : 10
    const areas = NETS.map((n) => new Path2D(n.d))
    const byNet = NETS.map((_, i) => dots.filter((d) => d.n === i))
    // how big a dot is as the ring first reaches it: just big enough that neighbouring dots cover the area between them
    // (the grid is 10.5 apart, so no point is further than 7.4 from a dot), so it starts as part of the solid area
    const COVER = 7.8

    const tie = tieMark.current ? makeTie(tieMark.current) : null
    let tied = -1, tiedReach = -1, bulbFit = ""
    const au = aurora.current, actx = au?.getContext("2d") ?? null
    // the wordmark as wattle dots and their flights down onto the map, ready once the wordmark has loaded
    let word: WDot[] = [], flyers: Flyer[] = [], wordMax = 1, gone = false
    fetch("/wattle-wordmark.svg").then((r) => r.text()).then((svg) => {
      const d = svg.match(/ d="([^"]+)"/)?.[1]
      if (gone || !d) return
      word = packWord(d)
      if (!word.length) return
      wordMax = Math.max(...word.map((w) => w.d))
      flyers = planFlight(word, dots)
      drawn = ""
      if (still) paint(0.9)
    }).catch(() => {})

    // the wordmark as wide as the line of words over it
    const fitMark = () => {
      const mk = tieMark.current, tw = tieWords.current
      if (!mk || !tw) return
      mk.style.width = `${tw.offsetWidth}px`
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
      // where the map's four corners are on screen, tilted as it is; turns a point on the screen into a point on the map
      const toMap = unproject(corners.current.map((el) => { const r = el?.getBoundingClientRect(); return r ? [r.left, r.top] as Pt : null }))
      const fr = toMap ? (() => {
        const rs = corners.current.map((el) => el!.getBoundingClientRect()), xs = rs.map((r) => r.left), ys = rs.map((r) => r.top)
        return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }
      })() : rr
      let now = -1
      const span = (_g: number): Span => FLY
      STEPS.forEach((_, g) => { const t = seg(p, span(g)); if (t > 0 && t < 1) now = g })
      // the camera moving in, eased at both ends
      const zq = seg(p, ZOOM), zoom = zq * zq * (3 - 2 * zq)
      // a real camera moving in: the logos and the "15 companies." line are a frame close to it, Australia is further
      // back. Something at depth d grows by d / (d - travel), so the frame rushes past while the map grows only to its
      // full size (from SMALL), all from the middle of the map
      const SMALL = wide ? 0.68 : 0.84, TRAVEL = 0.74, DEEP = (TRAVEL / SMALL) / (1 / SMALL - 1)
      const near = 1 / (1 - TRAVEL * zoom), back = DEEP / (DEEP - TRAVEL * zoom)
      const mw = marks.current.map((m) => m?.offsetWidth ?? 0), mh = marks.current.map((m) => m?.offsetHeight ?? 0)
      if (!START.length && layers.current.every(Boolean)) STEPS.forEach((group, g) => {
        let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity
        group.forEach((i) => { const bb = [...layers.current[i]!.querySelectorAll("svg")].pop()?.getBBox(); if (bb && bb.width > 0) { a = Math.min(a, bb.x); b = Math.min(b, bb.y); c = Math.max(c, bb.x + bb.width); d = Math.max(d, bb.y + bb.height) } })
        START[g] = Number.isFinite(a) ? Math.min(3, Math.max(0.12, (NET_VIEW.w * 0.075) / Math.max(1, c - a, d - b))) : NaN
      })
      // not drawn yet: try again next frame
      if (START.some((v) => !Number.isFinite(v))) START.length = 0
      const secTop = sec.getBoundingClientRect().top
      const mk = tieMark.current?.getBoundingClientRect()

      // each line comes in on its own, then they all go together
      WORDS.forEach((w, i) => {
        const el = words.current[i]
        slide(el, el?.firstElementChild as HTMLElement | null, ease(seg(p, w.lines[0].inn)), ease(seg(p, w.out)))
        el?.querySelectorAll<HTMLElement>("[data-line]").forEach((ln, j) => {
          const at = j < w.lines.length ? w.lines[j].inn : w.sub?.inn
          if (!at) return
          // "15 companies." is part of the frame the camera flies through, and goes as it passes
          const toward = i === 1 && j === 0 ? zoom : 0
          ln.style.opacity = (ease(seg(p, at)) * (1 - ease(seg(toward, [0.45, 0.9])))).toFixed(3)
          const line = w.lines[j], note = line?.note ? ln.querySelector<HTMLElement>("[data-note]") : null
          if (note && line.noteIn) note.style.opacity = (ease(seg(p, line.noteIn)) * (1 - ease(seg(p, line.noteOut ?? [2, 3])))).toFixed(3)
        })
      })

      // the headline: the wordmark's t's pulled together, then the line under it; it stays up through the dots
      const tu = seg(p, TIE), tb = tieBox.current
      // how far apart the two halves of the wordmark start, in its own units: as far as the screen allows
      const reachU = mk && mk.width > 0 ? Math.min(TIE_VIEW.w * 1.1, (Math.max(0, sr.width * 0.92 - mk.width) * TIE_VIEW.w) / mk.width) : 200
      if (tb) {
        const v = p >= VINES[0] ? 1 - ease(seg(p, TIE_OUT)) : 0
        tb.style.visibility = v > 0.001 ? "visible" : "hidden"
        tb.style.opacity = v.toFixed(3)
        // "But tying it all together" is up while the sprigs grow and the t's are pulled together, then goes once the
        // word has settled; the wordmark stays on its own
        if (tieWords.current) tieWords.current.style.opacity = (ease(seg(p, [VINES[0] + 0.003, VINES[0] + 0.015])) * (1 - ease(seg(p, [TIE[1], TIE[1] + 0.02])))).toFixed(3)
        // while the sprigs spread the line sits lower, where the wordmark will be; once they've joined everything up it
        // moves up, and the wordmark is drawn under it
        if (tieRow.current) tieRow.current.style.transform = `translateY(${((mk?.height ?? 0) * (1 - ease(seg(p, [VINES[1], TIE[0]])))).toFixed(1)}px)`
        // the two halves start as far apart as the screen allows, and meet in the middle of the word
        const mw = mk?.width ?? 0, room = Math.max(0, sr.width * 0.92 - mw)
        if (v > 0.001 && tie && (Math.abs(tu - tied) > 0.0002 || room !== tiedReach)) {
          tied = tu; tiedReach = room
          tie(tu, reachU)
        }
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
          const ak = au.width / Math.max(1, sr.width)
          drawAurora(actx, au.width, au.height, performance.now() / 1000, dark.matches, th < 1 ? [jx * ak, jy * ak, (rad - 80) * ak] : undefined)
        } else actx.clearRect(0, 0, au.width, au.height)
      }

      // the fifteen logos, down both sides of the map, all the same height; each piece starts small and faint just inside
      // its logo, on the map's side of it (start[g], in the map's own units)
      const li = ease(seg(p, LOGOS)), lo = ease(seg(near, [2, 3.2])), ls = ease(seg(p, PART))
      const start: Pt[] = []
      // close in round the map: down its sides, from just under its top edge to just over its bottom
      const fh = Math.max(fr.bottom - fr.top, sr.height * 0.42), fm = (fr.top + fr.bottom) / 2 - sr.top
      const y0 = fm - fh * 0.66, y1 = fm + fh * 0.66
      const cx = (fr.left + fr.right) / 2 - sr.left, cy = fm
      STEPS.forEach((_, g) => {
        const m = marks.current[g], c = COL[g]
        const y = y0 + (y1 - y0) * (c.n > 1 ? c.j / (c.n - 1) : 0.5) - mh[g] / 2
        const x = c.side < 0 ? Math.max(16, fr.left - sr.left - GAPX - mw[g]) : Math.min(sr.width - 16 - mw[g], fr.right - sr.left + GAPX)
        // first the two columns stand together in the middle, then they part to either side of the map
        const xc = c.side < 0 ? cx - (wide ? 36 : 10) - mw[g] : cx + (wide ? 36 : 10)
        const xm = xc + (x - xc) * ls
        const sx = c.side < 0 ? x + mw[g] + (wide ? 58 : 18) : x - (wide ? 58 : 18), sy = y + mh[g] / 2
        const uv = toMap?.(sx + sr.left, sy + sr.top) ?? [0.5, 0.5]
        start[g] = [uv[0] * NET_VIEW.w, uv[1] * NET_VIEW.h]
        if (!m) return
        const a = ease(seg(p, [LOGOS[0] + c.j * 0.003, LOGOS[1] + c.j * 0.003])) * (1 - lo)
        m.style.opacity = a.toFixed(3)
        m.style.visibility = a > 0.001 ? "visible" : "hidden"
        // as the camera moves in they come towards it and past, off the edges
        const zx = cx + (xm + mw[g] / 2 - cx) * near - mw[g] / 2, zy = cy + (y + mh[g] / 2 - cy) * near - mh[g] / 2
        m.style.transform = `translate3d(${zx.toFixed(1)}px, ${zy.toFixed(1)}px, 0) scale(${((0.97 + 0.03 * a) * near).toFixed(4)})`
      })
      // "15 websites." takes the top line of the box, where "15 companies." was, well clear of the map
      {
        const l2 = words.current[1]?.querySelectorAll<HTMLElement>("[data-line]")
        if (l2?.[1]) l2[1].style.transform = `translateY(${(l2[0].offsetTop - l2[1].offsetTop).toFixed(1)}px)`
      }
      // "15 companies." sits just over the top of the frame of logos, and comes past the camera with them
      {
        const box = words.current[1], ln = box?.querySelector<HTMLElement>("[data-line]")
        if (box && ln) {
          const at = box.getBoundingClientRect().top - sr.top + ln.offsetTop + ln.offsetHeight / 2
          const home = y0 - (wide ? 30 : 16) - ln.offsetHeight / 2, y = cy + (home - cy) * near
          ln.style.transform = p < ZOOM[1] + 0.02 ? `translateY(${(y - at).toFixed(1)}px) scale(${near.toFixed(4)})` : ""
        }
      }
      // while the logos are up the map sits further back, smaller, until the camera moves in on it
      const shrink = 1 - SMALL * back * (0.9 + 0.1 * ls)
      if (mapBox.current) { mapBox.current.style.opacity = ls.toFixed(3); mapBox.current.style.visibility = ls > 0.001 ? "visible" : "hidden" }
      // the bulb: lit, flickering out, then gone with the question
      if (bulb.current) {
        const ft = seg(p, [0.002, 0.014]), flick = ft <= 0 ? 1 : ft >= 1 ? 0 : (Math.sin(ft * 41) > -0.15 ? 1 - ft * 0.5 : 0.12) * (1 - ft * ft)
        const bo = 1 - ease(seg(p, WORDS[0].out))
        bulb.current.style.setProperty("--lit", flick.toFixed(3))
        bulb.current.style.opacity = bo.toFixed(3)
        bulb.current.style.visibility = bo > 0.001 ? "visible" : "hidden"
        // the bulb fills the space under the first line, and "who do you call?" sits under it, the same gap either side
        const box = words.current[0], ls2 = box?.querySelectorAll<HTMLElement>("[data-line]"), k = ls2?.[0], q = ls2?.[1]
        if (box && k && q) {
          const sh = sr.height, kb = k.getBoundingClientRect().bottom - sr.top, m = Math.max(18, sh * 0.04)
          const H = Math.max(120, Math.min(sh * 0.5, sh - kb - sh * 0.09 - q.offsetHeight - 2 * m))
          const fit = `${(kb + m + H / 2).toFixed(1)}px|${((H * 120) / 184).toFixed(1)}px`
          if (fit !== bulbFit) { bulbFit = fit; const [t, w] = fit.split("|"); bulb.current.style.top = t; bulb.current.style.width = w }
          const at = box.getBoundingClientRect().top - sr.top + q.offsetTop
          // (less the space over its letters, so the gaps look the same, not just measure the same)
          q.style.transform = `translateY(${(kb + 2 * m + H - 0.2 * parseFloat(getComputedStyle(q).fontSize) - at).toFixed(1)}px)`
        }
      }

      // the country tips back for the drops, then comes flat again
      // and on a narrower screen it shrinks a little while it does, to leave room beside it for the company
      const tilt = (TIP0 + (1 - TIP0) * ease(seg(p, TIP))) * (1 - ease(seg(p, FACE)))
      // at the very start it's a little smaller, so the opening line leads
      const opening = 1 - ease(seg(p, TIP))
      // while it's in pieces it sits smaller, so the gaps and the sprigs across them have room; it grows back as the
      // sprigs pull it together
      const spread = ease(seg(p, FLAT)) * (1 - Math.pow(seg(p, LACE), 2.2))
      // facing you it sits a little smaller and lower, to stay clear of the words above it
      // the jolt as the wordmark locks them all together: a quick squeeze the moment the t's meet, settling in a few beats
      const lockS = (Math.max(0, p - MEET) / (TIE[1] - MEET)) * 0.9, lock = p > MEET ? 1 - 0.028 * Math.exp(-8 * lockS) * Math.cos(lockS * 28) : 1
      rg.style.transform = `translateY(${(tilt * 2 + (1 - tilt) * 5).toFixed(2)}%) rotateX(${(tilt * TX).toFixed(2)}deg) scale(${((0.82 + 0.18 * tilt) * (1 - 0.2 * spread) * (1 - Math.max(0.2 * opening, shrink)) * lock).toFixed(4)})`
      rg.classList.toggle(styles.flat, p >= FLATTEN[1])
      // once every area has landed the country underneath goes, sides and all: the pieces carry their own sides now
      const allIn = p >= FLY[1]
      rg.classList.toggle(styles.allIn, allIn)
      // the country stays a full 3D slab while the pieces fly over it, and fades away as they arrive, so it's gone by
      // the time they're in place and they show only their own sides
      const flying = p < FLY[1] && p > FLY[0] - 0.01
      rg.classList.toggle(styles.flying, flying)
      rg.style.setProperty("--base-a", flying ? (1 - ease(seg(seg(p, FLY), [0.72, 0.9]))).toFixed(3) : "1")
      // apart, then laced back together
      // the pull is hard at first and quicker as they near, like the wordmark's t's; when they meet the pieces knock and
      // bounce apart twice, in step with the t's
      const lace = Math.pow(seg(p, LACE), 2.2), since = (Math.max(0, p - MEET) / (TIE[1] - MEET)) * 0.9
      const knock = p > MEET ? 0.12 * Math.exp(-5.2 * since) * Math.abs(Math.sin((Math.PI * since) / 0.34)) : 0
      // as the sprigs anchor in, the pieces keep drifting slowly further apart (easing out) until the pull starts
      // one unbroken move, from the split right up to the pull: quick at first, slowing but never stopping
      const drift = (1 - Math.pow(1 - seg(p, [FLAT[0], LACE[0]]), 3)) * ease(seg(p, [FLAT[0], FLAT[0] + 0.015]))
      const apart = (1.45 * drift * (1 - lace) + knock) * (wide ? 2.4 : 1)
      const dotted = p > DOTS[0]
      STEPS.forEach((group, g) => {
        const t = seg(p, span(g)), e = ease(t)
        // a hop as it flies; it stays a whole piece-height above the country (so its sides never cut into it) until the
        // country has faded, then settles the last bit onto nothing, sides and all
        const z = t >= 1 ? 0 : 30 * Math.sin(Math.PI * e) + PIECE_DEPTH * (1 - ease(seg(t, [0.9, 1])))
        const sx = (SPLIT[g][0] * apart / NET_VIEW.w) * 100, sy = (SPLIT[g][1] * apart / NET_VIEW.h) * 100
        // see-through while it falls, solid as it lands
        // into dots: the area stays fully solid until the ring reaches it; only there, in a narrow band, does it give way to
        // whole dots of its own colour, which then shrink
        // faint and small beside its logo, then solid and full size as it reaches its place
        const qd = seg(p, DOTS), op = dotted && qd >= 1 ? 0 : t >= 1 ? 1 : ls
        const s0 = START[g] || 0.32, glass = 1, sc = t >= 1 ? 1 : s0 + (1 - s0) * e
        const from = t >= 1 ? 0 : 1 - e, st = start[g] ?? MID[g]
        // beside its logo it's a flat shape with no sides (a small 3D piece looks smudgy); its sides grow out from nothing
        // as it grows on its way in
        const d3 = (t >= 1 ? 1 : ease(seg(e, [0.18, 0.5]))) * (1 - ease(seg(p, FLATTEN)))
        // a slight turn as it drifts away while the sprigs anchor in, gone again as they're laced back together
        const rot = TURN[g] * drift * (1 - lace) + TURN[g] * 0.6 * knock
        const fx = ((st[0] - MID[g][0]) * from / NET_VIEW.w) * 100, fy = ((st[1] - MID[g][1]) * from / NET_VIEW.h) * 100
        const down = t >= 1
        if (down !== landed[g]) {
          landed[g] = down
          group.forEach((i) => sides.forEach((sp, k) => { if (k % NETS.length === i) sp.classList.toggle(styles.on, down) }))
        }
        group.forEach((i) => {
          const el = layers.current[i]
          if (!el) return
          const bx = NET_VIEW.w / BOX[i][2], by = NET_VIEW.h / BOX[i][3]
          el.style.transform = t < 1 || apart > 0.0005 || Math.abs(rot) > 0.01
            ? `translate3d(${((sx + fx) * bx).toFixed(2)}%, ${((sy + fy) * by).toFixed(2)}%, ${z.toFixed(1)}px) scale(${sc.toFixed(4)}) rotate(${rot.toFixed(3)}deg)` : "none"
          // faded by its fill, never by the layer's opacity: opacity under 1 flattens a 3D piece and hides its sides
          el.style.opacity = op > 0.001 ? "1" : "0"
          if (dotted && qd < 1) {
            const k = el.offsetWidth / BOX[i][2], R = Math.hypot(CX, CY) * k
            const rb = qd * 1.35 * R, ra = rb - 0.018 * R
            const m = `radial-gradient(circle at ${(((CX - BOX[i][0]) / BOX[i][2]) * 100).toFixed(2)}% ${(((CY + 40 - BOX[i][1]) / BOX[i][3]) * 100).toFixed(2)}%, transparent ${ra.toFixed(1)}px, #000 ${Math.max(ra + 1, rb).toFixed(1)}px)`
            el.style.maskImage = m; el.style.webkitMaskImage = m
          } else if (el.style.maskImage) { el.style.maskImage = ""; el.style.webkitMaskImage = "" }
          el.style.setProperty("--a", (glass * op).toFixed(3))
          el.style.setProperty("--d", d3.toFixed(3))
          el.classList.toggle(styles.lifting, t < 1 && op > 0.001 && d3 > 0.02)
        })
      })

      // the light behind the map takes the colour of what's happening: each company, the sprigs' green, then gold
      const want = now >= 0 ? tint(NETS[STEPS[now][0]].name) : p >= DOTS[0] ? "#F2B300" : p >= VINES[0] ? "#7E9B3A" : "#C9B48A"
      if (want !== bloom) { bloom = want; st.style.setProperty("--bloom", want) }

      // the sprigs grow from the middle of each piece, weaving over and under the pieces, then pull tight like a lace
      // and draw back in, so once the country is whole there's nothing left of them
      const grow = seg(p, VINES), tight = lace
      const vs = vines.current, vu = vinesUnder.current
      if (vs && vu) {
        const on = grow > 0 && tight < 1
        vs.style.opacity = vu.style.opacity = on ? "1" : "0"
        if (on) STRANDS.forEach((s, k) => {
          const A: Pt = [s.pa[0] + SPLIT[s.a][0] * apart, s.pa[1] + SPLIT[s.a][1] * apart]
          const B: Pt = [s.pb[0] + SPLIT[s.b][0] * apart, s.pb[1] + SPLIT[s.b][1] * apart]
          const dx = B[0] - A[0], dy = B[1] - A[1], nx = -dy, ny = dx
          const k1 = s.bend * (1 - 0.8 * tight), k2 = -s.bend * 0.55 * (1 - 0.8 * tight)
          const q: Pt[] = [A, [A[0] + dx * 0.3 + nx * k1, A[1] + dy * 0.3 + ny * k1], [A[0] + dx * 0.7 + nx * k2, A[1] + dy * 0.7 + ny * k2], B]
          // spreading out from the middle of the country like a fungus: the nearest stitches first, the furthest last
          const g = clamp((grow - SPREAD[k] * 0.62) / 0.38) * (1 - ease(clamp((tight - 0.9) / 0.1)))
          for (let j = 0; j < SEGS; j++) {
            const el = stems.current[k * SEGS + j]
            if (!el) continue
            el.style.strokeWidth = (3.6 * SIZE(k)).toFixed(2)
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
            const [x, y] = at(q, u), ang = heading(q, u) + (j % 2 ? 0.75 : -0.75), rx = 7.6 * sz * SIZE(k)
            const cx = x + Math.cos(ang) * rx, cy = y + Math.sin(ang) * rx
            el.setAttribute("cx", cx.toFixed(1)); el.setAttribute("cy", cy.toFixed(1))
            el.setAttribute("rx", rx.toFixed(2)); el.setAttribute("ry", (2.1 * sz * SIZE(k)).toFixed(2))
            el.setAttribute("transform", `rotate(${((ang * 180) / Math.PI).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})`)
          })
          BLOOMS.forEach((u, j) => {
            // wattle on every other stitch
            const sz = k % 2 ? 0 : clamp((g - u) * 6), [x, y] = at(q, u), ang = heading(q, u), c = Math.cos(ang), sn = Math.sin(ang)
            const side = (j + k) % 2 ? 1 : -1
            BALLS.forEach(([ox, oy], m) => {
              const el = balls.current[(k * BLOOMS.length + j) * BALLS.length + m]
              if (!el) return
              const px = (ox * c - oy * side * sn) * SIZE(k), py = (ox * sn + oy * side * c) * SIZE(k)
              el.setAttribute("cx", (x + px).toFixed(1)); el.setAttribute("cy", (y + py).toFixed(1))
              el.setAttribute("r", (2.9 * sz * SIZE(k)).toFixed(2))
            })
          })
        })
      }

      // the dots, over the whole stage so they can fly off it: in each area's colour, then gold, then away. The gold
      // comes from the wordmark: a ripple from where the t's meet turns it into wattle dots, and they fly down, one onto
      // every dot, each turning gold as its own lands
      const ready = flyers.length > 0
      const rp = still ? 1 : seg(p, RIPPLE), fl = still ? 1 : seg(p, FLIGHT)
      // the flight's clock run on past its end, so the last dots to land still get their whole turn to gold
      const flk = still ? 1.5 : Math.min(1.5, Math.max(0, (p - FLIGHT[0]) / (FLIGHT[1] - FLIGHT[0])))
      const mkEl = tieMark.current
      const ux = mk ? mk.left - sr.left : 0, uy = mk ? mk.top - sr.top : 0, uk = mk ? mk.width / TIE_VIEW.w : 0
      const jh = tieHalves(tu, reachU)
      if (mkEl) {
        // the solid wordmark is eaten away by the ripple, from the join out
        const m = ready && rp > 0 ? (rp >= 1 ? "linear-gradient(transparent, transparent)" : `radial-gradient(circle at ${((JOIN[0] + (jh[0] + jh[1]) / 2) * uk).toFixed(1)}px ${(JOIN[1] * uk).toFixed(1)}px, transparent ${(rp * wordMax * uk).toFixed(1)}px, #000 ${(rp * wordMax * uk + 0.6).toFixed(1)}px)`) : ""
        if (mkEl.style.maskImage !== m) { mkEl.style.maskImage = m; mkEl.style.setProperty("-webkit-mask-image", m) }
      }
      if (ctx) {
        const q = seg(p, DOTS), gold = ease(seg(p, GOLD)), o = seg(p, SCATTER), out = o * o
        const ox = rr.left - sr.left, oy = rr.top - sr.top, sc = rr.width / NET_VIEW.w
        const key = `${q.toFixed(3)}|${ready ? `${rp.toFixed(4)}|${flk.toFixed(4)}|${ux.toFixed(0)}|${uy.toFixed(0)}|${uk.toFixed(3)}` : gold.toFixed(3)}|${out.toFixed(4)}|${dark.matches}|${ox.toFixed(0)}|${oy.toFixed(0)}|${sc.toFixed(3)}`
        if (key !== drawn) {
          drawn = key
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.clearRect(0, 0, cv.width, cv.height)
          if (q > 0 && o < 1) {
            ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy)
            // the morph: as the ring passes, each dot starts as a disc a little bigger than the gap between dots, over its
            // still-solid area, and shrinks to its dot while the area melts away under it. Nothing is clipped: a disc may
            // spill a touch past its edge, but every dot stays whole
            byNet.forEach((list) => {
              for (const d of list) {
                const front = q * 1.35 - d.d
                if (front <= 0) continue
                const m = ease(clamp(front * 40))
                // gold once its own gold dot has landed, with a small pop (seconds of the app's timing, 2.25 for FLIGHT)
                const since = (flk - d.land) * 2.25, k = ready ? (since > 0 ? ease(clamp(since / 0.2)) : 0) : gold
                const pop = ready && since > 0 ? 1 + 0.5 * Math.exp(-11 * since) * Math.min(1, since * 30) : 1
                const c = dark.matches ? d.cd : d.c
                const r = Math.round(c[0] + (GOLD_RGB[0] - c[0]) * k), gg = Math.round(c[1] + (GOLD_RGB[1] - c[1]) * k), b = Math.round(c[2] + (GOLD_RGB[2] - c[2]) * k)
                ctx.fillStyle = `rgb(${r},${gg},${b})`
                ctx.beginPath()
                ctx.arc(d.x + d.vx * out, d.y + d.vy * out, (COVER + (d.r - COVER) * m) * (1 - 0.28 * k) * pop * (1 + 1.6 * o * o), 0, Math.PI * 2)
                ctx.fill()
              }
            })
          }
          if (ready && rp > 0 && fl < 1 && mk) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.fillStyle = "#F2B300"
            // the word's dots, popping in as the ripple reaches them, shrinking as their gold dots leave. The t's are still
            // bouncing when it starts, so each dot moves with its half of the word
            const [hl, hr] = tieHalves(tu, reachU)
            for (const w of word) {
              const ahead = (rp - w.d / wordMax) * 0.5
              if (ahead < 0) continue
              let left = 0
              for (const tl of w.leave) if (tl > fl) left++
              if (!left) continue
              const r = w.r * uk * (1 + 0.45 * Math.exp(-12 * ahead)) * Math.sqrt(left / w.leave.length)
              ctx.beginPath(); ctx.arc(ux + (w.x + (w.x < JOIN[0] ? hl : hr)) * uk, uy + w.y * uk, r, 0, Math.PI * 2); ctx.fill()
            }
            // the gold dots in flight: up a little first, then down onto their own dot, with a short faint tail
            ctx.strokeStyle = "rgba(242,179,0,0.3)"; ctx.lineCap = "round"
            const lift = uk * (400 / TIE_VIEW.w) ** -1
            for (const f of flyers) {
              const u0 = (fl - f.tl) / f.dur
              if (u0 <= 0 || u0 >= 1) continue
              const sx = ux + (f.s.x + (f.s.x < JOIN[0] ? hl : hr)) * uk, sy = uy + f.s.y * uk, tx = ox + f.to.x * sc, ty = oy + f.to.y * sc
              const cx = sx + (tx - sx) * 0.3 + f.jx * 110 * lift, cy = sy - (25 + 70 * f.jy) * lift
              const at = (u: number) => { const v = 1 - u; return [v * v * sx + 2 * v * u * cx + u * u * tx, v * v * sy + 2 * v * u * cy + u * u * ty] }
              const u = ease(u0), [px, py] = at(u), [qx, qy] = at(Math.max(0, u - 0.07)), r = f.to.r * sc * (0.55 + 0.45 * u)
              ctx.lineWidth = r * 1.2; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke()
              ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill()
            }
          }
        }
      }
    }

    if (still) { paint(0.9); return () => { gone = true; ro.disconnect() } }

    // follow the scroll with a little lag of our own, so a flick of the wheel plays through rather than skipping
    const frame = () => {
      raf = 0
      if (!visible) return
      const r = sec.getBoundingClientRect()
      const target = warp(clamp(-r.top / Math.max(1, r.height - window.innerHeight)))
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
    return () => { gone = true; io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf) }
  }, [still, wide])

  return (
    <section ref={section} className={`${styles.section} ${still ? styles.still : ""}`} aria-labelledby="nets-title">
      <div ref={stage} className={styles.stage}>
        <h2 id="nets-title" className={styles.srOnly}>Australia&apos;s electricity networks, and Wattle</h2>
        <div ref={overcast} className={styles.overcast} aria-hidden />
        <canvas ref={aurora} className={styles.aurora} aria-hidden />
        <div className={styles.bloom} aria-hidden />

        <div ref={bulb} className={styles.bulb} aria-hidden>
          <i className={styles.bulbGlow} />
          <svg viewBox="0 0 120 184">
            <path className={styles.bulbGlass} d="M60 6C30 6 8 29 8 58c0 21 12 34 22 46 7 8 11 16 11 26h38c0-10 4-18 11-26 10-12 22-25 22-46C112 29 90 6 60 6Z" />
            <path className={styles.bulbWire} d="M48 128V96l-8-22 10 6 10-12 10 12 10-6-8 22v32" />
            <rect className={styles.bulbBase} x="40" y="136" width="40" height="11" rx="5.5" />
            <rect className={styles.bulbBase} x="40" y="151" width="40" height="11" rx="5.5" />
            <path className={styles.bulbBase} d="M48 166h24l-4 10a6 6 0 0 1-5.6 4h-4.8a6 6 0 0 1-5.6-4Z" />
          </svg>
        </div>

        <div ref={mapBox} className={styles.mapBox}>
          <div ref={rig} className={styles.rig}>
            {[0, 1, 2, 3].map((q) => <i key={q} ref={(el) => { corners.current[q] = el }} className={styles.corner} style={{ left: q % 2 ? "100%" : 0, top: q > 1 ? "100%" : 0 }} />)}
            {/* the country's thickness, seen while it's tipped back: thin layers 1px apart make a solid side */}
            {BASE_SLICES.map((k) => (
              <svg key={k} className={`${styles.base} ${styles.slab} ${k === BASE_SLICES[0] ? styles.floor : ""}`} style={{ ["--z" as string]: `${-k}px` }} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
                {NETS.map((n) => <path key={n.name} d={n.d} style={{ ["--c" as string]: tint(n.name), ["--cd" as string]: LIFT[n.name] ?? tint(n.name) }} />)}
              </svg>
            ))}
            <svg ref={base} className={styles.base} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
              {/* lit from the top left, so the slab reads as solid even while it faces you */}
              <defs>
                <linearGradient id="land-light" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={NET_VIEW.w} y2={NET_VIEW.h}>
                  <stop offset="0" className={styles.landHi} /><stop offset="1" className={styles.landLo} />
                </linearGradient>
              </defs>
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
                  style={{ ["--c" as string]: tint(n.name), ["--cd" as string]: LIFT[n.name] ?? tint(n.name),
                    left: `${(BOX[i][0] / NET_VIEW.w) * 100}%`, top: `${(BOX[i][1] / NET_VIEW.h) * 100}%`,
                    width: `${(BOX[i][2] / NET_VIEW.w) * 100}%`, height: `${(BOX[i][3] / NET_VIEW.h) * 100}%`,
                    transformOrigin: `${((MID[OWN[i]][0] - BOX[i][0]) / BOX[i][2]) * 100}% ${((MID[OWN[i]][1] - BOX[i][1]) / BOX[i][3]) * 100}%` }}>
                  {PIECE_SLICES.map((k) => (
                    <svg key={k} className={styles.edge} style={{ ["--z" as string]: `${-k}px` }} viewBox={BOX[i].join(" ")} preserveAspectRatio="none" aria-hidden>
                      <path d={shapeOf(i)} />{i === WPN && SNIP_D && <path className={styles.snip} d={SNIP_D} style={{ ["--c" as string]: tint("Horizon Power"), ["--cd" as string]: LIFT["Horizon Power"] ?? tint("Horizon Power") }} />}
                    </svg>
                  ))}
                  <svg viewBox={BOX[i].join(" ")} preserveAspectRatio="none" aria-hidden>
                    <path d={shapeOf(i)} />{i === WPN && SNIP_D && <path className={styles.snip} d={SNIP_D} style={{ ["--c" as string]: tint("Horizon Power"), ["--cd" as string]: LIFT["Horizon Power"] ?? tint("Horizon Power") }} />}
                  </svg>
                  {g >= 0 && <i ref={(el) => { pins.current[g] = el }} className={styles.pin}
                    style={{ left: `${((MID[g][0] - BOX[i][0]) / BOX[i][2]) * 100}%`, top: `${((MID[g][1] - BOX[i][1]) / BOX[i][3]) * 100}%` }} />}
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
          <div key={i} ref={(el) => { words.current[i] = el }} className={`${styles.words} ${styles[w.at]}`}>
            <div>
              {w.brand && <span className={styles.brandMark} role="img" aria-label="Wattle" />}
              {w.lines.map((l, j) => w.hero
                ? j === 0
                  ? <p key={j} className={styles.kicker} data-line>{l.text}</p>
                  : <h2 key={j} className={`${styles.big} ${styles.hero}`} data-line>{l.text}</h2>
                : <p key={j} className={styles.big} data-line><Rich text={l.text} />{l.note && <span className={styles.note} data-note>{l.note}</span>}</p>)}
              {w.sub && <p className={styles.sub} data-line><Rich text={w.sub.text} /></p>}
            </div>
          </div>
        ))}

        <div ref={tieBox} className={styles.tie}>
          <p ref={tieRow} className={styles.tieRow}><span ref={tieWords}>But tying it all together</span></p>
          <svg ref={tieMark} className={styles.tieMark} viewBox={`0 0 ${TIE_VIEW.w} ${TIE_VIEW.h}`} role="img" aria-label="Wattle" />
        </div>

        {STEPS.map((group, g) => {
          const k = netKey(NETS[group[0]].name)
          return k && <div key={k} ref={(el) => { marks.current[g] = el }} className={styles.mark}><Logo k={k} h={wide ? 24 : 13} w={wide ? 150 : 70} area={wide ? 2100 : 600} /></div>
        })}
      </div>
    </section>
  )
}
