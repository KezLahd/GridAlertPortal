"use client"
// The Wattle wordmark as the map's headline: the app's pull to refresh (brand/wattle/motion/MOTION.md) played in
// reverse. The two halves (w a t, t l e) start far apart, a slack wire between the t's with a slack wire between them; it pulls tight and gold, drags the poles together
// (the tops leaning in as they come), they knock with a flash, bounce twice and settle, and the wire is gone.
// Driven by the scroll: tie(u) draws the frame for u from 0 to 1. Letter outlines are from public/wattle-wordmark.svg.

const LETTERS = { w: "M19.44 72.43Q16.38 72.43 14.58 70.92Q12.79 69.41 11.84 66.19L0.62 27.49Q0.29 26.38 0.14 25.55Q0.00 24.71 0.00 23.90Q0.00 21.55 1.64 20.12Q3.27 18.68 5.89 18.68Q8.15 18.68 9.56 19.97Q10.97 21.26 11.55 23.80L20.13 59.41L20.39 59.41L29.40 24.23Q30.67 18.68 36.34 18.68Q41.90 18.68 43.17 24.21L52.27 59.41L52.53 59.41L61.13 23.73Q61.69 21.23 63.08 19.96Q64.48 18.68 66.72 18.68Q69.31 18.68 70.91 20.11Q72.52 21.54 72.52 23.85Q72.52 24.67 72.37 25.48Q72.23 26.30 71.91 27.42L60.69 66.16Q59.78 69.36 57.93 70.90Q56.09 72.43 52.98 72.43Q49.73 72.43 47.88 70.93Q46.03 69.43 45.19 66.13L36.29 33.60L36.04 33.60L27.18 66.19Q26.40 69.37 24.49 70.90Q22.59 72.43 19.44 72.43Z", a: "M90.55 72.29Q85.56 72.29 81.65 70.33Q77.73 68.36 75.49 64.83Q73.25 61.31 73.25 56.67Q73.25 49.74 78.37 45.73Q83.49 41.73 92.91 41.19L106.63 40.39L106.63 36.66Q106.63 32.62 104.05 30.37Q101.47 28.13 96.97 28.13Q93.39 28.13 90.90 29.50Q88.41 30.87 86.12 34.19Q84.23 36.62 81.22 36.62Q78.95 36.62 77.52 35.27Q76.08 33.93 76.08 31.77Q76.08 30.08 76.90 28.42Q78.86 23.92 84.44 21.28Q90.02 18.64 97.44 18.64Q103.88 18.64 108.65 20.76Q113.42 22.88 116.02 26.73Q118.63 30.58 118.63 35.78L118.63 66.30Q118.63 69.25 116.98 70.84Q115.33 72.43 112.75 72.43Q110.26 72.43 108.67 70.97Q107.08 69.51 106.93 66.82Q106.93 65.92 106.93 65.00Q106.93 64.09 106.93 63.19L106.67 63.19Q105.19 65.99 102.66 68.04Q100.14 70.09 97.00 71.19Q93.87 72.29 90.55 72.29ZM94.22 63.11Q97.66 63.11 100.48 61.70Q103.29 60.28 104.96 57.82Q106.63 55.36 106.63 52.24L106.63 48.29L94.63 49.04Q90.24 49.34 87.83 51.21Q85.41 53.07 85.41 56.17Q85.41 59.34 87.83 61.22Q90.25 63.11 94.22 63.11Z", l: "M225.70 72.43Q223.04 72.43 221.33 70.77Q219.62 69.10 219.62 66.05L219.62 6.39Q219.62 3.33 221.33 1.67Q223.04 0.00 225.70 0.00Q228.36 0.00 230.07 1.67Q231.78 3.33 231.78 6.40L231.78 66.05Q231.78 69.10 230.07 70.77Q228.36 72.43 225.70 72.43Z", e: "M260.60 72.48Q248.74 72.48 242.08 65.42Q235.43 58.35 235.43 45.78Q235.43 37.51 238.42 31.42Q241.42 25.32 246.94 21.98Q252.45 18.64 259.90 18.64Q266.99 18.64 272.35 21.73Q277.71 24.81 280.72 30.24Q283.73 35.68 283.73 42.75Q283.73 45.45 282.25 46.96Q280.77 48.47 278.08 48.47L247.52 48.47Q247.52 48.58 247.52 48.68Q247.52 48.77 247.52 48.88Q247.52 55.36 251.04 59.23Q254.56 63.09 260.47 63.09Q264.60 63.09 267.54 61.52Q270.48 59.94 273.41 56.20Q274.37 55.12 275.32 54.68Q276.27 54.25 277.51 54.25Q279.60 54.25 281.00 55.50Q282.41 56.75 282.41 58.94Q282.41 60.32 281.56 62.03Q279.04 66.99 273.51 69.73Q267.99 72.48 260.60 72.48ZM247.65 40.50L271.80 40.50Q271.69 36.73 270.15 33.93Q268.61 31.13 266.00 29.59Q263.39 28.04 259.94 28.04Q256.53 28.04 253.85 29.60Q251.17 31.16 249.54 33.96Q247.91 36.76 247.65 40.50Z" }
export const TIE_VIEW = { w: 283.73, h: 72.48 }
/** where in the moment (0 to 1) the t's meet; the rest is the bounce */
export const MEET = 0.62
/** where the pull starts: before it the wire draws out from the middle to the t's, then the other letters come in */
export const PULL = 0.3

const STEM = 12.17, BAR = 11.19, ARM = 22.695, T1 = 142.785, T2 = 193.28, BASE = 71.45, TOP = 5, CY = 24.28
const YL = BASE - (BASE - 18.68) * 0.45, HB = YL - (TOP + STEM / 2), HC = YL - CY, WW = BAR * 0.22
const INK = "currentColor", GOLD = "#F2B300", AMBER = "#C98A00"

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (u: number, a: number, b: number) => clamp((u - a) / (b - a))
const easeOut = (t: number, p = 3) => 1 - Math.pow(1 - clamp(t), p)
const backOut = (x: number, c = 1.70158) => { const t = clamp(x) - 1; return 1 + (c + 1) * t * t * t + c * t * t }
const NS = "http://www.w3.org/2000/svg"

/** Where the two halves are at u: the shift of the left half (w a t) and of the right half (t l e), in the mark's units.
 *  While they're apart the pair is centred on the middle between the t's, not on the word (the right half is the wider
 *  one), easing back to the word's own centre as they close. */
export function halves(u: number, reach: number): [number, number] {
  const GAP = Math.max(60, reach), k = seg(u, PULL, MEET), tb = (Math.max(0, u - MEET) / (1 - MEET)) * 0.9
  const gap = u < MEET ? GAP * (1 - Math.pow(k, 2.2)) : GAP * 0.1 * Math.exp(-5.2 * tb) * Math.abs(Math.sin((Math.PI * tb) / 0.34))
  const sh = ((T1 + T2) / 2 - TIE_VIEW.w / 2) * clamp(gap / 60)
  return [-gap / 2 - sh, gap / 2 - sh]
}

/** Builds the mark inside `svg` (viewBox TIE_VIEW, overflow visible) and returns the function that draws a frame. */
export function makeTie(svg: SVGSVGElement) {
  svg.innerHTML = ""
  const el = <K extends keyof SVGElementTagNameMap>(tag: K, parent: Element, attrs: Record<string, string> = {}) => {
    const e = document.createElementNS(NS, tag) as SVGElementTagNameMap[K]
    for (const k in attrs) e.setAttribute(k, attrs[k])
    parent.appendChild(e); return e
  }
  const letter = (d: string) => { const g = el("g", svg); el("path", g, { d, fill: INK }); return g }
  const pole = () => {
    const g = el("g", svg)
    return { g, stem: el("path", g, { fill: "none", stroke: INK, "stroke-width": String(STEM), "stroke-linecap": "round", "stroke-linejoin": "round" }),
      bar: el("path", g, { fill: "none", stroke: INK, "stroke-width": String(BAR), "stroke-linecap": "round", pathLength: "1" }) }
  }
  // drawing order: the wires pass in front of the right t and behind the left one
  const w = letter(LETTERS.w), a = letter(LETTERS.a), p2 = pole()
  const wires = [0, 1].map(() => el("path", svg, { fill: "none", "stroke-width": WW.toFixed(2), "stroke-linecap": "round", pathLength: "1" }))
  const p1 = pole(), l = letter(LETTERS.l), e = letter(LETTERS.e)
  const flash = el("circle", svg, { fill: GOLD })
  const sparks = Array.from({ length: 14 }, () => el("circle", svg, { fill: GOLD }))

  const bendAt = (t: number, dir: number, h: number, lean: number): [number, number] => { const k = clamp(h / HB, 0, 1.2); return [t + dir * lean * k * k, YL - h] }
  const angAt = (dir: number, h: number, lean: number) => Math.atan((2 * lean * Math.max(h, 0)) / (HB * HB)) * dir
  // a stretch `len` (0 to 1) of a path drawn out from `at` (0 to 1 along it), by dash offset: a dash pattern that starts
  // with a zero-length dash would leave a round dot at the start of the path
  const grow = (path: SVGPathElement, at: number, len: number) => {
    if (len >= 1) { path.removeAttribute("stroke-dasharray"); path.removeAttribute("stroke-dashoffset"); path.removeAttribute("visibility"); return }
    path.setAttribute("visibility", len > 0.002 ? "visible" : "hidden")
    path.setAttribute("stroke-dasharray", `${len.toFixed(4)} 3`)
    path.setAttribute("stroke-dashoffset", (-(at - at * len)).toFixed(4))
  }
  // where on the stem (0 bottom to 1 top) the lower wire meets it, which is where the stem draws out from
  const STEM_AT = (BASE - STEM / 2 - YL + HC + (YL - TOP - HC) * 0.5) / (BASE - STEM / 2 - YL + HB)
  const drawPole = (P: ReturnType<typeof pole>, t: number, dir: number, lean: number) => {
    let d = `M${t} ${BASE - STEM / 2}L${t} ${YL}`
    for (let i = 1; i <= 12; i++) { const [x, y] = bendAt(t, dir, (HB * i) / 12, lean); d += `L${x.toFixed(2)} ${y.toFixed(2)}` }
    P.stem.setAttribute("d", d)
    P.stem.setAttribute("pathLength", "1")
    // the crossbar runs from the end its wire arrives at to the far end
    const [ix, iy] = onBar(t, dir, dir * (ARM - BAR / 2), lean), [ox, oy] = onBar(t, dir, -dir * (ARM - BAR / 2), lean)
    P.bar.setAttribute("d", `M${ix.toFixed(2)} ${iy.toFixed(2)}L${ox.toFixed(2)} ${oy.toFixed(2)}`)
  }
  const onBar = (t: number, dir: number, dx: number, lean: number): [number, number] => {
    const [bx, by] = bendAt(t, dir, HC, lean), q = angAt(dir, HC, lean); return [bx + dx * Math.cos(q), by + dx * Math.sin(q)]
  }
  // letters come in from the t's outwards, each rising into place with a small overshoot
  const reveal = (g: SVGGElement, d: number, u: number, dx: number) => {
    const k = clamp((u - d * 0.14) / 0.72)
    g.setAttribute("opacity", clamp(k * 1.6).toFixed(3))
    g.setAttribute("transform", `translate(${dx.toFixed(2)} ${((1 - backOut(k)) * BAR * 1.6).toFixed(2)})`)
  }

  /** u: 0 to 1 through the moment; reach: how far apart the halves start, in the mark's own units */
  return (u: number, reach: number) => {
    const GAP = Math.max(60, reach)
    // first the wire, drawn out from the middle to both t's; the t's draw on as it reaches them; then the other letters
    const draw = easeOut(seg(u, 0, 0.12), 2), inn = seg(u, 0.12, 0.24)
    // each t draws itself on from where its wires reach it: the crossbar from its inner end out, the stem from the
    // lower wire up and down
    const barIn = easeOut(seg(u, 0.095, 0.15), 2), stemIn = easeOut(seg(u, 0.11, 0.18), 2)
    // then it takes up its slack and goes gold, and drags the halves in: a hard pull at first, quicker and quicker as
    // they near. They meet in the middle of the word at MEET, knock with a flash, bounce apart twice and settle
    const slack = 1 - easeOut(seg(u, 0.2, PULL), 2)
    const k = seg(u, PULL, MEET)
    const tb = (Math.max(0, u - MEET) / (1 - MEET)) * 0.9            // seconds after they meet, as the app counts them
    const lean = u < MEET ? STEM * 0.9 * Math.min(1, GAP / 150) * Math.sin(Math.PI * Math.pow(k, 1.3)) : -STEM * 0.5 * Math.exp(-6 * tb) * Math.sin(tb * 30)
    const [L, R] = halves(u, reach)
    reveal(w, 2, inn, L); reveal(a, 1, inn, L); reveal(l, 1, inn, R); reveal(e, 2, inn, R)
    drawPole(p1, T1 + L, 1, lean); drawPole(p2, T2 + R, -1, lean)
    for (const P of [p1, p2]) { grow(P.bar, 0, barIn); grow(P.stem, STEM_AT, stemIn) }

    // two wires: between the facing crossbar ends, and between the middles of the poles
    const wire = (draw > 0 ? 1 : 0) * (1 - seg(tb, 0, 0.35))
    const gold = seg(u, 0.24, PULL)
    const ends: [number, number][][] = [
      [onBar(T1 + L, 1, ARM - BAR / 2, lean), onBar(T2 + R, -1, -(ARM - BAR / 2), lean)],
      [bendAt(T1 + L, 1, HC + (YL - TOP - HC) * 0.5, lean), bendAt(T2 + R, -1, HC + (YL - TOP - HC) * 0.5, lean)],
    ]
    ends.forEach(([p, q], i) => {
      const span = q[0] - p[0], sag = (2.5 + 67 * 0.42 * slack) * (i ? 1.12 : 1) * clamp(span / (STEM * 2.2), 0.25, 1)
      const path = wires[i]
      path.setAttribute("d", `M${p[0].toFixed(2)} ${p[1].toFixed(2)}Q${((p[0] + q[0]) / 2).toFixed(2)} ${(Math.max(p[1], q[1]) + 2 * sag).toFixed(2)} ${q[0].toFixed(2)} ${q[1].toFixed(2)}`)
      path.setAttribute("stroke", gold > 0.5 ? GOLD : INK)
      path.setAttribute("opacity", wire.toFixed(3))
      // drawn from its middle outwards
      grow(path, 0.5, draw)
    })

    // the knock: a gold flash where they meet, and sparks flying out and falling
    const mx = (T1 + T2) / 2 + (L + R) / 2, f = tb > 0 ? tb : -1
    if (f >= 0 && f < 0.16) { flash.setAttribute("cx", String(mx)); flash.setAttribute("cy", String(CY)); flash.setAttribute("r", (BAR * (0.6 + f * 9)).toFixed(2)); flash.setAttribute("opacity", (0.6 * (1 - f / 0.16)).toFixed(3)) }
    else flash.setAttribute("opacity", "0")
    sparks.forEach((s, j) => {
      const v = f >= 0 ? clamp(f / 0.42) : 1
      if (v >= 1) { s.setAttribute("r", "0"); return }
      const ang = (j / sparks.length) * Math.PI * 2 + ((j * 37) % 10) * 0.06, dist = easeOut(v) * BAR * (2.4 + ((j * 53) % 17) / 10)
      s.setAttribute("cx", (mx + Math.cos(ang) * dist).toFixed(2)); s.setAttribute("cy", (CY + Math.sin(ang) * dist + v * v * BAR * 2.4).toFixed(2))
      s.setAttribute("r", (BAR * 0.3 * (1 - v)).toFixed(2)); s.setAttribute("fill", j % 2 ? AMBER : GOLD)
    })
  }
}
