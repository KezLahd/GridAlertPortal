"use client"

import { useEffect, useRef, useState } from "react"
import { NET, netKey, type NetKey } from "@/components/wattle/networks"
import { NETS, NET_VIEW, OUTAGE_DOTS } from "./network-map-data"
import { Backdrop } from "./backdrop"
import styles from "./network-assembly.module.css"

// Every network, as an exploded view. Australia's sixteen network areas start as coloured sheets hovering in a tilted
// stack over an empty outline of the country. Scrolling drops them into place one company at a time, the one landing
// lifted with a shadow and its own logo pinned beside it on a leader line; a wash of its colour moves behind the map.
// Once the last one lands the map swings flat and the outages pulse. Driven per frame from the scroll position (Lenis
// smooths it); nothing runs while the section is off screen, and reduced motion shows the finished, flat map.

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
const STEP_OF = NETS.map((_, i) => STEPS.findIndex((g) => g.includes(i)))
const G = STEPS.length

// where in the section's scroll each phase happens (0 = section top reaches the top of the screen, 1 = its end)
const START = 0.04, END = 0.84, SLOT = (END - START) / G, FLAT_FROM = 0.84, FLAT_TO = 0.94

// logos with a sharper or fuller lockup than the app's icon + wordmark pair: one image, light and dark versions
const LOCKUP: Partial<Record<NetKey, { light: string; dark: string; aspect: number }>> = {
  energex: { light: "/networks/energex-lockup.svg", dark: "/networks/energex-lockup-dark.svg", aspect: 2.646 },
  tasnetworks: { light: "/networks/tasnetworks-lockup.png", dark: "/networks/tasnetworks-lockup-dark.png", aspect: 2.19 },
}

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const CX = NET_VIEW.w / 2, CY = NET_VIEW.h / 2

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
  const layers = useRef<(HTMLDivElement | null)[]>([])
  const marks = useRef<(HTMLElement | null)[]>([])
  const callout = useRef<HTMLDivElement>(null)
  const leader = useRef<SVGLineElement>(null)
  const pin = useRef<HTMLSpanElement>(null)
  const wash = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(still ? G : -1)

  useEffect(() => {
    const sec = section.current, stg = stage.current, rg = rig.current
    if (!sec || !stg || !rg) return
    if (still) {
      setStep(G)
      layers.current.forEach((el) => { if (el) { el.style.transform = "none"; el.style.opacity = "1" } })
      rg.style.transform = "none"
      return
    }
    let raf = 0, visible = false, shown = -2
    const pos = { x: 0, y: 0, set: false }
    const tiltX = wide ? 50 : 38, tiltZ = wide ? -16 : -10

    const frame = () => {
      raf = 0
      if (!visible) return
      const r = sec.getBoundingClientRect()
      const p = clamp(-r.top / Math.max(1, r.height - window.innerHeight))
      stg.style.setProperty("--p", p.toFixed(4))

      // the stack: each company's sheet drops from its height to the outline as its slot of scroll passes
      let landing = -1
      STEPS.forEach((group, g) => {
        const t = clamp((p - (START + g * SLOT)) / (SLOT * 1.35))
        const e = ease(t)
        if (t > 0 && t < 1) landing = g
        group.forEach((i) => {
          const el = layers.current[i]
          if (!el) return
          const [ax, ay] = NETS[i].at
          const out = 1 - e
          const dx = ((ax - CX) / NET_VIEW.w) * 14 * out, dy = ((ay - CY) / NET_VIEW.h) * 14 * out
          const z = out * (70 + g * 16)
          el.style.transform = `translate3d(${dx.toFixed(2)}%, ${dy.toFixed(2)}%, ${z.toFixed(1)}px)`
          el.style.opacity = (0.32 + 0.68 * e).toFixed(3)
          el.classList.toggle(styles.lifting, t > 0 && t < 1)
        })
      })

      // after the last lands, the whole map swings flat to face you
      const f = ease(clamp((p - FLAT_FROM) / (FLAT_TO - FLAT_FROM)))
      rg.style.transform = `rotateX(${((1 - f) * tiltX).toFixed(2)}deg) rotateZ(${((1 - f) * tiltZ).toFixed(2)}deg) scale(${(0.9 + 0.1 * f).toFixed(4)})`

      // which company the caption is about: the one landing, else the last that landed; all of them at the end
      const now = p >= FLAT_FROM ? G : landing >= 0 ? landing : Math.min(G - 1, Math.floor((p - START) / SLOT))
      if (now !== shown) { shown = now; setStep(now) }

      // pin the logo to where that area is on screen right now, easing towards it
      const s = stg.getBoundingClientRect()
      const at = now >= 0 && now < G ? marks.current[STEPS[now][0]] : null
      if (at && callout.current && leader.current && pin.current) {
        const m = at.getBoundingClientRect()
        const mx = m.left - s.left, my = m.top - s.top
        const cw = callout.current.offsetWidth, ch = callout.current.offsetHeight
        let tx: number, ty: number
        if (wide) {
          // right of the pin when it fits on screen, otherwise left of it; never past either edge
          const left = mx + 64 + cw > s.width - 28
          tx = Math.min(s.width - cw - 28, Math.max(28, left ? mx - cw - 64 : mx + 64))
          ty = Math.min(s.height - ch - 40, Math.max(90, my - ch / 2 - 40))
        } else {
          tx = (s.width - cw) / 2
          ty = Math.max(12, Math.min(my - ch - 70, s.height - ch - 20))
        }
        if (!pos.set) { pos.x = tx; pos.y = ty; pos.set = true }
        pos.x += (tx - pos.x) * 0.14
        pos.y += (ty - pos.y) * 0.14
        callout.current.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`
        const ex = wide ? (pos.x + cw / 2 < mx ? pos.x + cw + 10 : pos.x - 10) : pos.x + cw / 2
        const ey = wide ? pos.y + ch / 2 : pos.y + ch + 8
        leader.current.setAttribute("x1", ex.toFixed(1)); leader.current.setAttribute("y1", ey.toFixed(1))
        leader.current.setAttribute("x2", mx.toFixed(1)); leader.current.setAttribute("y2", my.toFixed(1))
        pin.current.style.transform = `translate3d(${mx.toFixed(1)}px, ${my.toFixed(1)}px, 0)`
        if (wash.current) wash.current.style.transform = `translate3d(${mx.toFixed(1)}px, ${my.toFixed(1)}px, 0)`
      }
      raf = requestAnimationFrame(frame)
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(frame)
    }, { rootMargin: "100px 0px" })
    io.observe(sec)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [still, wide])

  const current = step >= 0 && step < G ? STEPS[step] : null
  const name = current ? NETS[current[0]].name : null
  const key = name ? netKey(name) : null
  const colour = name ? tint(name) : "#F2B300"
  const landed = step >= G ? NETS.length : step < 0 ? 0 : STEPS[step][STEPS[step].length - 1] + 1

  return (
    <section ref={section} className={`${styles.section} ${still ? styles.still : ""}`} aria-labelledby="nets-title">
      <div ref={stage} className={styles.stage} style={{ ["--tint" as string]: colour }}>
        <Backdrop className={styles.backdrop} />
        <div ref={wash} className={styles.wash} aria-hidden />

        <div className={styles.grid}>
          <div className={styles.text}>
            <span className={styles.kicker}>Every network</span>
            <h2 id="nets-title" className={styles.h2}>Sixteen networks. One place to look.</h2>
            <p className={styles.body}>
              Each of Australia&apos;s sixteen electricity networks runs its own outage map. Wattle reads every one of
              them, every few minutes, so you don&apos;t have to.
            </p>
            <div className={styles.rail} aria-hidden>
              {NETS.map((n, i) => (
                <i key={n.name} style={{ background: i < landed ? tint(n.name) : undefined }} className={i < landed ? styles.on : ""} />
              ))}
            </div>
            <p className={styles.count} aria-live="polite">
              {step >= G ? <><b>All sixteen</b>, in one place.</> : step < 0 ? "Scroll to bring them in" : <><b>{landed}</b> of 16 · {name}</>}
            </p>
          </div>

          <div className={styles.mapBox}>
            <div ref={rig} className={styles.rig}>
              <svg className={styles.base} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden>
                {NETS.map((n) => <path key={n.name} d={n.d} />)}
              </svg>
              {NETS.map((n, i) => (
                <div key={n.name} ref={(el) => { layers.current[i] = el }} className={styles.layer}
                  style={{ ["--c" as string]: tint(n.name), ["--cd" as string]: LIFT[n.name] ?? tint(n.name), zIndex: 2 + STEP_OF[i] }}>
                  <svg viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} aria-hidden><path d={n.d} /></svg>
                  <i ref={(el) => { marks.current[i] = el }} className={styles.mark}
                    style={{ left: `${(n.at[0] / NET_VIEW.w) * 100}%`, top: `${(n.at[1] / NET_VIEW.h) * 100}%` }} />
                </div>
              ))}
              <svg className={`${styles.dots} ${step >= G ? styles.dotsOn : ""}`} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`}
                role="img" aria-label="A map of Australia divided into its sixteen electricity network areas">
                {OUTAGE_DOTS.map((d, i) => (
                  <g key={d.name} style={{ ["--d" as string]: `${i * 0.3}s` }}>
                    <circle cx={d.at[0]} cy={d.at[1]} r="22" className={styles.pulse} />
                    <circle cx={d.at[0]} cy={d.at[1]} r="7.5" className={styles.core} />
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* the logo of the network landing now, on a leader line to its area */}
        <svg className={`${styles.lines} ${key ? styles.show : ""}`} aria-hidden><line ref={leader} /></svg>
        <span ref={pin} className={`${styles.pin} ${key ? styles.show : ""}`} aria-hidden />
        <div ref={callout} className={`${styles.callout} ${key ? styles.show : ""}`}>
          {key && <div key={key} className={styles.logoIn}><Logo k={key} h={wide ? 64 : 46} w={wide ? 340 : 260} /></div>}
        </div>
      </div>
    </section>
  )
}
