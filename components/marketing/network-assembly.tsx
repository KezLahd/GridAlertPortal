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
  { text: "Each one looks after its own patch.", at: "top", big: true, inn: [0.14, 0.17], out: [0.48, 0.51] },
  { text: "Fifteen companies. Fifteen websites.", at: "top", big: true, inn: [0.51, 0.545], out: [0.6, 0.63] },
  { text: "Each one reports outages in its own way. Checking them all, for every site you run, takes hours.", at: "bottomLeft", inn: [0.525, 0.555], out: [0.6, 0.63] },
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
const STRANDS = PAIRS.flatMap(([a, b], k) => [{ a, b, bend: 0.14 + (k % 3) * 0.04 }, { a, b, bend: -(0.12 + (k % 2) * 0.05) }])
// wattle balls all along each sprig, three sizes
const PUFFS = [0.05, 0.14, 0.24, 0.34, 0.44, 0.54, 0.64, 0.74, 0.84, 0.94]
const PUFF_R = [7, 10, 8.5]
const bez = (t: number, p0: number, p1: number, p2: number, p3: number) =>
  (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3

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
      const turn = (Math.atan2(y - oy, x - ox) + Math.PI) / (Math.PI * 2)
      const a = Math.atan2(y - oy, x - ox) + (rand() - 0.5) * 0.9, fly = 420 + rand() * 900
      out.push({
        n, x, y, r: 3.9 + 1.2 * Math.pow(1 - Math.min(1, dist), 1.3), d: Math.min(1, dist * 0.8 + turn * 0.2),
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

export function NetworkAssembly({ still, wide }: { still: boolean; wide: boolean }) {
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const rig = useRef<HTMLDivElement>(null)
  const base = useRef<SVGSVGElement>(null)
  const layers = useRef<(HTMLDivElement | null)[]>([])
  const pins = useRef<(HTMLElement | null)[]>([])
  const vines = useRef<SVGSVGElement>(null)
  const strands = useRef<(SVGPathElement | null)[]>([])
  const puffs = useRef<(SVGCircleElement | null)[]>([])
  const canvas = useRef<HTMLCanvasElement>(null)
  const words = useRef<(HTMLElement | null)[]>([])
  const chip = useRef<HTMLDivElement>(null)
  const chipIn = useRef<HTMLDivElement>(null)
  const leader = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const sec = section.current, st = stage.current, rg = rig.current, cv = canvas.current, bs = base.current
    if (!sec || !st || !rg || !cv || !bs) return
    const dots = makeDots(Array.from(bs.querySelectorAll("path")))
    const dark = window.matchMedia("(prefers-color-scheme: dark)")
    const ctx = cv.getContext("2d")
    let raf = 0, visible = false, ps = -1, shown = -2, drawn = "", bloom = ""
    let dpr = 1, cx = -1, cy = 0, side = 0
    // how far an area starts above the map, and how far the country tips back (no turn: it stays square to you)
    const H = wide ? 300 : 190, TX = wide ? 50 : 40
    const areas = NETS.map((n) => new Path2D(n.d))
    const land = new Path2D(); areas.forEach((a) => land.addPath(a))

    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(st.offsetWidth * dpr); cv.height = Math.round(st.offsetHeight * dpr)
      drawn = ""
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(st)

    // words fade and rise in, and fade and rise out: a is how far in (0 to 1), b how far out (0 to 1)
    const slide = (box: HTMLElement | null, inner: HTMLElement | null, a: number, b: number) => {
      if (!box || !inner) return
      const v = a * (1 - b)
      inner.style.opacity = v.toFixed(3)
      inner.style.transform = `translate3d(0, ${((1 - a) * 28 - b * 28).toFixed(1)}px, 0)`
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

      WORDS.forEach((w, i) => {
        const el = words.current[i]
        slide(el, el?.firstElementChild as HTMLElement | null, ease(seg(p, w.inn)), ease(seg(p, w.out)))
      })

      // the company that's landing: beside the map on the side its area is on, level with it, with a line to it
      const ca = ease(seg(p, CHIP.inn)), cb = ease(seg(p, CHIP.out))
      slide(chip.current, chipIn.current, ca, cb)
      const ld = leader.current
      if (wide && chip.current && pin && ld) {
        const mx = pin.left + pin.width / 2 - sr.left, my = pin.top + pin.height / 2 - sr.top
        const s = mx < sr.width / 2 ? -1 : 1
        const tx = s < 0
          ? Math.max(24, rr.left - sr.left - 40 - cw)
          : Math.min(sr.width - cw - 24, rr.right - sr.left + 40)
        const ty = Math.min(sr.height - ch - 24, Math.max(reserve, my - 30))
        if (s !== side || cx < 0) { side = s; cx = tx; cy = ty } else { cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18 }
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
      bs.style.opacity = (1 - ease(seg(p, FLAT))).toFixed(3)

      // apart, then laced back together
      const apart = ease(seg(p, FLAT)) * (1 - ease(seg(p, LACE))) * (wide ? 1 : 0.55)
      const dotted = p > DOTS[0]
      STEPS.forEach((group, g) => {
        const t = seg(p, [DROPS[0] + g * SLOT, DROPS[0] + (g + 1.4) * SLOT])
        const z = t >= 1 ? 0 : fall(t) * H
        const sx = (SPLIT[g][0] * apart / NET_VIEW.w) * 100, sy = (SPLIT[g][1] * apart / NET_VIEW.h) * 100
        const op = dotted ? 0 : clamp(t / 0.06)
        group.forEach((i) => {
          const el = layers.current[i]
          if (!el) return
          el.style.transform = z > 0.05 || apart > 0.0005 ? `translate3d(${sx.toFixed(2)}%, ${sy.toFixed(2)}%, ${z.toFixed(1)}px)` : "none"
          el.style.opacity = op.toFixed(3)
        })
      })
      if (now !== shown) { shown = now; if (now >= 0) setStep(now) }

      // the light behind the map takes the colour of what's happening: each company, the sprigs' green, then gold
      const want = now >= 0 ? tint(NETS[STEPS[now][0]].name) : p >= DOTS[0] ? "#F2B300" : p >= VINES[0] ? "#7E9B3A" : "#C9B48A"
      if (want !== bloom) { bloom = want; st.style.setProperty("--bloom", want) }

      // the sprigs run underneath the pieces: they show only in the gaps, and vanish as the gaps close
      const grow = seg(p, VINES), tight = ease(seg(p, LACE))
      const vs = vines.current
      if (vs) {
        const on = grow > 0 && tight < 1
        vs.style.opacity = on ? "1" : "0"
        if (on) STRANDS.forEach((s, k) => {
          const el = strands.current[k]
          if (!el) return
          const ax = MID[s.a][0] + SPLIT[s.a][0] * apart, ay = MID[s.a][1] + SPLIT[s.a][1] * apart
          const bx = MID[s.b][0] + SPLIT[s.b][0] * apart, by = MID[s.b][1] + SPLIT[s.b][1] * apart
          const dx = bx - ax, dy = by - ay, nx = -dy, ny = dx
          const k1 = s.bend * (1 - 0.8 * tight), k2 = -s.bend * 0.55 * (1 - 0.8 * tight)
          const c1x = ax + dx * 0.3 + nx * k1, c1y = ay + dy * 0.3 + ny * k1
          const c2x = ax + dx * 0.7 + nx * k2, c2y = ay + dy * 0.7 + ny * k2
          el.setAttribute("d", `M${ax.toFixed(1)} ${ay.toFixed(1)}C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`)
          // where the pieces never quite meet (Bass Strait, the Bight) the strands draw themselves back in at the end
          const g = clamp(grow * 1.15 - (k % 5) * 0.03) * (1 - ease(clamp((tight - 0.45) / 0.55)))
          el.style.strokeDashoffset = (1 - g).toFixed(3)
          PUFFS.forEach((u, j) => {
            const c = puffs.current[k * PUFFS.length + j]
            if (!c) return
            c.setAttribute("cx", bez(u, ax, c1x, c2x, bx).toFixed(1)); c.setAttribute("cy", bez(u, ay, c1y, c2y, by).toFixed(1))
            c.setAttribute("r", (PUFF_R[(j + k) % 3] * clamp((g - u) * 5)).toFixed(2))
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
            // the morph: each dot starts as a big disc that, with its neighbours and the area under them, makes the
            // solid area, clipped to the coast; the discs shrink to dots, so the area breaks up rather than fades
            const morphing = q < 1
            if (morphing) {
              ctx.save(); ctx.clip(land)
              // the areas themselves fill the slivers along the coast the first discs don't reach
              const under = 1 - clamp(q * 2.4)
              if (under > 0) NETS.forEach((n, i) => {
                const c = rgb(dark.matches ? LIFT[n.name] ?? tint(n.name) : tint(n.name))
                ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`
                ctx.globalAlpha = under; ctx.fill(areas[i]); ctx.globalAlpha = 1
              })
            }
            for (const d of dots) {
              const m = ease(clamp((q * 1.35 - d.d) * 3))
              const c = dark.matches ? d.cd : d.c
              const r = Math.round(c[0] + (GOLD_RGB[0] - c[0]) * gold), gg = Math.round(c[1] + (GOLD_RGB[1] - c[1]) * gold), b = Math.round(c[2] + (GOLD_RGB[2] - c[2]) * gold)
              ctx.fillStyle = `rgb(${r},${gg},${b})`
              ctx.beginPath()
              ctx.arc(d.x + d.vx * out, d.y + d.vy * out, (7.2 + (d.r - 7.2) * m) * shrink * (1 - 0.45 * o), 0, Math.PI * 2)
              ctx.fill()
            }
            if (morphing) ctx.restore()
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
        <div className={styles.bloom} aria-hidden />

        <div className={styles.mapBox}>
          <div ref={rig} className={styles.rig}>
            {/* the country's thickness, seen while it's tipped back */}
            <svg className={`${styles.base} ${styles.slab}`} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
              {NETS.map((n) => <path key={n.name} d={n.d} />)}
            </svg>
            <svg ref={base} className={styles.base} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
              {NETS.map((n) => <path key={n.name} d={n.d} />)}
            </svg>
            {NETS.map((n, i) => {
              const g = STEPS.findIndex((s) => s[0] === i)
              return (
                <div key={n.name} ref={(el) => { layers.current[i] = el }} className={styles.layer}
                  style={{ ["--c" as string]: tint(n.name), ["--cd" as string]: LIFT[n.name] ?? tint(n.name) }}>
                  <svg className={styles.edge} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden><path d={n.d} /></svg>
                  <svg viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden><path d={n.d} /></svg>
                  {g >= 0 && <i ref={(el) => { pins.current[g] = el }} className={styles.pin}
                    style={{ left: `${(MID[g][0] / NET_VIEW.w) * 100}%`, top: `${(MID[g][1] / NET_VIEW.h) * 100}%` }} />}
                </div>
              )
            })}
            {/* the sprigs, over the pieces, through the middle of each */}
            <svg ref={vines} className={styles.vines} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
              {STRANDS.map((s, k) => <path key={k} ref={(el) => { strands.current[k] = el }} pathLength={1} />)}
              {STRANDS.flatMap((_, k) => PUFFS.map((_, j) => (
                <circle key={`${k}-${j}`} ref={(el) => { puffs.current[k * PUFFS.length + j] = el }} r="0" />
              )))}
            </svg>
          </div>
        </div>
        <canvas ref={canvas} className={styles.dots} role="img" aria-label="A map of Australia made of wattle-gold dots" />

        {WORDS.map((w, i) => (
          <p key={i} ref={(el) => { words.current[i] = el }} className={`${styles.words} ${styles[w.at]} ${w.big ? styles.big : ""}`}>
            <span>{w.text}</span>
          </p>
        ))}

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
