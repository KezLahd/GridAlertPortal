"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import styles from "./hero-flow.module.css"

// The hero as one real outage, scrubbed by scroll. The phone stays pinned while the page scrolls past it:
// a quiet lock screen → Wattle's alert arrives → it's tapped and the lock screen lifts away → the outage page
// scrolls through → the map slides in → the camera drops straight down into 3D, then turns slowly to face north
// with the outage area in the network's colour and the site's tooltip.
//
// Every frame is a still from the real app (demo data) in the simulator, 60 fps for the lock screen and scroll and
// one degree per frame for the orbit. They load in tiers (every 16th first, then 8th, 4th…), so the scrub works
// almost at once and fills in as the rest arrive; until a frame is in, the nearest loaded one stands in.
// The two in-between moments (the lift and the slide) are drawn on the canvas from their two end frames.

const N = 396 // 0 lock · 1–39 alert arrives · 40 alert held · 41–191 outage page · 192–395 map and orbit
const LOCK = 40, APP = 41, PAGE_END = 191, MAP = 192, LAST = N - 1
const W = 600, H = 1304 // the frames' shape, in the desktop set's pixels

const steps = [
  { k: "9:41 AM", t: "All 13 sites have power.", b: "A normal morning across the group." },
  { k: "Right now", t: "South Yarra Pharmacy just lost power.", b: "On the lock screen, from Wattle, before anyone rings you." },
  { k: "The outage", t: "CitiPower Powercor. Back by 6:15 pm.", b: "Who runs the network, why it's out, when it's back, and which of your sites sit inside the outage area." },
  { k: "On the map", t: "Right where it's happening.", b: "Your site in 3D, inside the outage area, so you know exactly what's affected." },
]

const cl = (v: number) => Math.min(1, Math.max(0, v))
const ease = (g: number) => (g < 0.5 ? 4 * g * g * g : 1 - Math.pow(-2 * g + 2, 3) / 2)
const out3 = (q: number) => 1 - Math.pow(1 - q, 3)
const q300 = (v: number) => Math.round(v * 300) / 300

/** Which picture the phone shows at progress t (0 to 1 through the pinned run), and which step is up. */
function frameAt(t: number): { i: number; lift?: number; slide?: number } {
  const ln = (a: number, b: number) => cl((t - a) / (b - a))
  if (t < 0.07) return { i: 0 }
  if (t < 0.16) return { i: 1 + Math.round(ln(0.07, 0.16) * 38) }
  if (t < 0.24) return { i: LOCK }
  if (t < 0.3) return { i: APP, lift: q300(out3(ln(0.24, 0.3))) }
  if (t < 0.34) return { i: APP }
  if (t < 0.52) return { i: APP + Math.round(ln(0.34, 0.52) * (PAGE_END - APP)) }
  if (t < 0.58) return { i: MAP, slide: q300(ease(ln(0.52, 0.58))) }
  if (t < 0.61) return { i: MAP }
  return { i: MAP + Math.round(ln(0.61, 0.94) * (LAST - MAP)) }
}
const stepAt = (t: number) => (t < 0.07 ? 0 : t < 0.3 ? 1 : t < 0.52 ? 2 : 3)

/** Frame order for loading: the ones the story pauses on, then coarse to fine. */
function loadOrder() {
  const seen = new Set<number>(), order: number[] = []
  const add = (i: number) => { if (!seen.has(i)) { seen.add(i); order.push(i) } }
  ;[0, LOCK, APP, PAGE_END, MAP, LAST].forEach(add)
  for (const s of [16, 8, 4, 2, 1]) for (let i = 0; i < N; i += s) add(i)
  return order
}

export function HeroFlow({ nav, copy, still }: { nav: ReactNode; copy: ReactNode; still: boolean }) {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState(still ? 1 : 0)

  useEffect(() => {
    if (still) return
    const sec = root.current, tr = track.current, cv = canvas.current
    if (!sec || !tr || !cv) return
    const small = window.matchMedia("(max-width: 899px)").matches
    const dir = small ? "m" : "d", cw = small ? 450 : W, ch = Math.round(cw * (H / W)), k = cw / W
    cv.width = cw; cv.height = ch
    const x = cv.getContext("2d")!
    const img: (HTMLImageElement | undefined)[] = new Array(N)
    const ok = new Uint8Array(N)
    let want: ReturnType<typeof frameAt> = { i: 0 }, drawn = "", dead = false

    // the Dynamic Island, painted on top so it's the same in every frame
    const island = () => {
      x.fillStyle = "#000"; x.beginPath(); x.roundRect(206.5 * k, 20.5 * k, 187 * k, 55 * k, 27.5 * k); x.fill()
    }
    const near = (i: number) => {
      for (let d = 0; d < N; d++) {
        if (i - d >= 0 && ok[i - d]) return img[i - d]!
        if (i + d < N && ok[i + d]) return img[i + d]!
      }
    }
    const draw = (force = false) => {
      const f = want
      const key = f.lift != null ? `L${f.lift}` : f.slide != null ? `S${f.slide}` : `F${f.i}:${ok[f.i]}`
      if (!force && key === drawn) return
      if (f.lift != null) {
        const app = ok[APP] && img[APP], lk = ok[LOCK] && img[LOCK]
        if (!app || !lk) return
        // the app underneath, dimmed less as the lock screen rises off it like a sheet with rounded bottom corners
        const y = -f.lift * ch, r = 96 * k
        x.drawImage(app, 0, 0, cw, ch)
        x.fillStyle = `rgba(0,0,0,${(0.6 * (1 - f.lift)).toFixed(3)})`; x.fillRect(0, 0, cw, ch)
        x.save(); x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = 40 * k; x.beginPath()
        x.moveTo(0, y); x.lineTo(cw, y); x.lineTo(cw, y + ch - r); x.quadraticCurveTo(cw, y + ch, cw - r, y + ch)
        x.lineTo(r, y + ch); x.quadraticCurveTo(0, y + ch, 0, y + ch - r); x.closePath(); x.fillStyle = "#000"; x.fill(); x.restore()
        x.save(); x.clip(); x.drawImage(lk, 0, y, cw, ch); x.restore()
      } else if (f.slide != null) {
        const a = ok[PAGE_END] && img[PAGE_END], b = ok[MAP] && img[MAP]
        if (!a || !b) return
        // the map pushes in from the right over the outage page, which slides a little left and dims
        const dx = (1 - f.slide) * cw
        x.drawImage(a, -f.slide * 180 * k, 0, cw, ch)
        x.fillStyle = `rgba(0,0,0,${(0.12 * f.slide).toFixed(3)})`; x.fillRect(0, 0, cw, ch)
        x.save(); x.shadowColor = "rgba(0,0,0,.25)"; x.shadowBlur = 40 * k; x.fillStyle = "#fff"; x.fillRect(dx, 0, cw, ch); x.restore()
        x.drawImage(b, dx, 0, cw, ch)
      } else {
        const im = near(f.i)
        if (!im) return
        x.drawImage(im, 0, 0, cw, ch)
      }
      island(); drawn = key
    }

    // load in tiers, a few at a time, so the order holds
    const queue = loadOrder()
    const pull = () => {
      const i = queue.shift()
      if (i == null || dead) return
      // onload, not decode(): decode() can hang in some browsers even once the picture is in
      const im = new Image()
      im.decoding = "async"
      im.onload = () => { ok[i] = 1; if (!dead) draw(); pull() }
      im.onerror = () => pull()
      im.src = `/landing/v3/hero/${dir}/${String(i).padStart(3, "0")}.webp`
      img[i] = im
    }
    for (let n = 0; n < 6; n++) pull()

    // scroll → progress through the pinned run, plus how far the stage has left the screen (for the hand-off)
    let raf = 0
    const tick = () => {
      raf = 0
      const vh = window.innerHeight, top = tr.getBoundingClientRect().top
      const run = Math.max(1, tr.offsetHeight - vh)
      const t = cl(-top / run)
      want = frameAt(t); draw()
      const tap = t < 0.19 || t > 0.24 ? 0 : Math.sin(Math.PI * cl((t - 0.19) / 0.05))
      sec.style.setProperty("--tap", tap.toFixed(3))
      sec.style.setProperty("--xp", cl((-top - run) / vh).toFixed(4))
      setStep(stepAt(t))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(tick) }
    tick()
    window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on)
    return () => {
      dead = true
      window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf)
    }
  }, [still])

  return (
    <section ref={root} className={`${styles.hero} ${still ? styles.still : ""}`}>
      {/* phones: the words come first, above the pinned phone */}
      <div className={styles.intro}>{nav}{copy}</div>
      <div ref={track} className={styles.track}>
        <div className={styles.stage}>
          <div className={styles.paper} aria-hidden />
          <div className={styles.grey} aria-hidden />
          <div className={styles.stageNav}>{nav}</div>
          <div className={styles.grid}>
            <div className={styles.text}>{copy}</div>
            <div className={styles.phone}>
              <div className={styles.body}>
                <div className={styles.screen}>
                  {still
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={`/landing/v3/hero/d/${String(LOCK).padStart(3, "0")}.webp`} alt="A Wattle alert on an iPhone lock screen: power lost at South Yarra Pharmacy" />
                    : <canvas ref={canvas} role="img" aria-label="An outage on an iPhone: Wattle's alert on the lock screen, the outage page, then the site in 3D on the map inside the outage area" />}
                  <span className={styles.tap} aria-hidden />
                </div>
              </div>
            </div>
            <div className={styles.steps} aria-live="polite">
              {steps.map((s, i) => (
                <div key={s.t} className={`${styles.step} ${i === step ? styles.on : i < step ? styles.gone : ""}`} aria-hidden={i !== step}>
                  <small>{s.k}</small>
                  <strong>{s.t}</strong>
                  <p>{s.b}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
