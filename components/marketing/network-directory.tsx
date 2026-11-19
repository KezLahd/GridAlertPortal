"use client"
// The fifteen networks, one at a time. Desktop: the map on the left, one network on the right; phones: the map over it.
// Point at a network on the map (or swipe the cards, or pick a number) and its card swipes in while a pill slides along
// the numbers to it. Click it (tap on a phone) and the map closes in on just that network's patch, the rest of the
// country goes dim, and the card opens up with who they are, where they run and how many customers they have.
// This is where the details live that the map story above leaves out.

import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react"
import { NET, netKey, type NetKey } from "@/components/wattle/networks"
import { NETS, NET_VIEW } from "./network-map-data"
import { CUSTOMERS, LIFT, Logo, STEPS, tint } from "./network-assembly"
import styles from "./network-directory.module.css"

const W = NET_VIEW.w, H = NET_VIEW.h
// which company each area belongs to (CitiPower and Powercor are one)
const OWNER = NETS.map((_, i) => STEPS.findIndex((g) => g.includes(i)))
const KEYS = STEPS.map((g) => netKey(NETS[g[0]].name) as NetKey)
const TINT = STEPS.map((g) => tint(NETS[g[0]].name))

// each company's box on the map, read off its outline, and the move that brings it to the middle and fills most of it
const ZOOM = STEPS.map((g) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  g.forEach((i) => {
    const n = NETS[i].d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
    for (let k = 0; k + 1 < n.length; k += 2) {
      x0 = Math.min(x0, n[k]); x1 = Math.max(x1, n[k]); y0 = Math.min(y0, n[k + 1]); y1 = Math.max(y1, n[k + 1])
    }
  })
  const s = Math.min((W * 0.72) / Math.max(1, x1 - x0), (H * 0.72) / Math.max(1, y1 - y0), 9)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  return { s, x: W / 2 - cx * s, y: H / 2 - cy * s }
})

// a spring for CSS: a slightly underdamped settle, sampled into linear()
const SPRING = (() => {
  const k = 170, c = 20, steps = 600, dt = 1 / steps, pts: string[] = []
  let x = 0, v = 0
  for (let i = 0; i <= steps; i++) {
    if (i % 12 === 0) pts.push(`${x.toFixed(4)} ${((i / steps) * 100).toFixed(1)}%`)
    v += (k * (1 - x) - c * v) * dt
    x += v * dt
  }
  pts[pts.length - 1] = "1 100%"
  return `linear(${pts.join(", ")})`
})()

export function NetworkDirectory({ wide }: { wide: boolean }) {
  const G = STEPS.length
  const [at, setAt] = useState(0) // the network on the card (and under the pill)
  const [open, setOpen] = useState(-1) // the network the map has closed in on, or -1 for the whole country
  const [lit, setLit] = useState(-1) // the one being pointed at on the map
  const [drag, setDrag] = useState(0) // the cards following a finger, in px
  const view = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number; t: number; on: boolean } | null>(null)

  const show = (g: number) => { setAt(g); if (open >= 0) setOpen(g) }
  const pick = (g: number) => { setAt(g); setOpen((o) => (o === g ? -1 : g)) }

  // Esc goes back out to the whole country
  useEffect(() => {
    if (open < 0) return
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(-1) }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [open])

  // swipe the cards: they follow the finger, give a little past the first and last, and move on a flick or past a third
  const down = (e: RPointerEvent) => {
    if (e.pointerType === "mouse") return
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), on: false }
  }
  const move = (e: RPointerEvent) => {
    const s = start.current
    if (!s) return
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    if (!s.on) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) { start.current = null; return }
      if (Math.abs(dx) < 6) return
      s.on = true
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch {}
    }
    const edge = (at === 0 && dx > 0) || (at === G - 1 && dx < 0)
    setDrag(edge ? Math.sign(dx) * Math.pow(Math.abs(dx), 0.7) : dx)
  }
  const up = (e: RPointerEvent) => {
    const s = start.current
    start.current = null
    setDrag(0)
    if (!s?.on) return
    const dx = e.clientX - s.x, w = view.current?.offsetWidth ?? 300
    const v = dx / Math.max(1, performance.now() - s.t)
    const step = Math.abs(dx) > w / 3 || Math.abs(v) > 0.45 ? -Math.sign(dx) : 0
    if (step) show(Math.min(G - 1, Math.max(0, at + step)))
  }

  const z = open >= 0 ? ZOOM[open] : { s: 1, x: 0, y: 0 }
  const hot = lit >= 0 ? lit : at
  const vars = useMemo(() => ({ ["--spring" as string]: SPRING }), [])

  return (
    <section className={`${styles.section} ${open >= 0 ? styles.isOpen : ""}`} aria-labelledby="networks-title" style={vars}>
      <div className={styles.head}>
        <h2 id="networks-title" className={styles.title}>Fifteen networks. Wattle watches them all.</h2>
        <p className={styles.lede}>{wide ? "Point at one to see who it is. Click it to look closer." : "Tap one to look closer, or swipe through them."}</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.mapCol}>
          <svg className={styles.map} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of Australia's electricity networks"
            onMouseLeave={() => setLit(-1)} onClick={(e) => { if (e.target === e.currentTarget) setOpen(-1) }}>
            <g className={styles.zoom} style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})` }}>
              {NETS.map((n, i) => {
                const g = OWNER[i]
                const cls = open >= 0 ? (g === open ? styles.lit : styles.dim) : g === hot ? styles.lit : styles.soft
                return (
                  <path key={n.name} d={n.d} className={`${styles.area} ${cls}`}
                    style={{ ["--c" as string]: tint(n.name), ["--cd" as string]: LIFT[n.name] ?? tint(n.name) }}
                    onMouseEnter={() => { setLit(g); if (open < 0) setAt(g) }} onClick={() => pick(g)} />
                )
              })}
            </g>
          </svg>
        </div>

        <div className={styles.panel}>
          {/* the numbers, with one pill that slides along to whichever network is up */}
          <div className={styles.pager} role="tablist" aria-label="Networks" style={{ ["--n" as string]: G }}>
            <span className={styles.pill} style={{ transform: `translateX(calc(${at} * (100% + var(--gap))))`, background: TINT[at] }} aria-hidden />
            {KEYS.map((k, g) => (
              <button key={k} type="button" role="tab" aria-selected={g === at} aria-label={NET[k].name}
                className={g === at ? styles.numOn : ""} onClick={() => (open >= 0 ? pick(g) : show(g))}>
                {g + 1}
              </button>
            ))}
          </div>

          <div ref={view} className={styles.view} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <div className={`${styles.track} ${drag ? styles.dragging : ""}`} style={{ transform: `translateX(calc(${-at * 100}% + ${drag}px))` }}>
              {KEYS.map((k, g) => {
                const net = NET[k]
                return (
                  <article key={k} className={styles.card} style={{ ["--c" as string]: TINT[g] }} aria-hidden={g !== at} inert={g !== at}>
                    <div className={styles.logo}><Logo k={k} h={40} w={280} /></div>
                    <p className={styles.where}>
                      {net.states.map((s) => <b key={s}>{s}</b>)} {net.area}
                    </p>
                    {/* opens up when the map closes in on this network */}
                    <div className={`${styles.more} ${open === g ? styles.moreOn : ""}`}>
                      <div className={styles.moreIn}>
                        <dl className={styles.stats}>
                          {CUSTOMERS[k] && <div className={styles.big}><dt>Customers</dt><dd>About {CUSTOMERS[k]}</dd></div>}
                          <div><dt>The network</dt><dd>{net.name} runs the poles and wires that bring power to every home and business here.</dd></div>
                          <div><dt>Wattle watches</dt><dd>Its outages as they happen, and the planned work it books days ahead.</dd></div>
                        </dl>
                        <a className={styles.site} href={net.website} target="_blank" rel="noopener noreferrer">
                          {net.website.replace(/^https?:\/\/(www\.)?/, "")} ↗
                        </a>
                      </div>
                    </div>
                    <button type="button" className={styles.look} onClick={() => pick(g)}>
                      {open === g ? "← All of Australia" : "Look closer"}
                    </button>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
