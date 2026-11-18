"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Wordmark } from "@/components/brand/wordmark"
import { NET, NetLogo, netKey } from "@/components/wattle/networks"
import { NETS, NET_VIEW, OUTAGE_DOTS } from "./network-map-data"
import styles from "./landing.module.css"

// Wattle landing, round two. One story, in order: every network in one place → told the moment a site loses power →
// planned work days ahead → the whole group sees the same thing. Paper, ink and one gold; rounded type for titles;
// no cards. Motion is quiet (fade and rise, the map filling in on scroll, screens crossfading) and all of it stops
// for prefers-reduced-motion, which shows the end state and stills instead of the clips.

const MAIL = "mailto:gridalert@arctiqservices.com.au"
const V = "/landing/v2"

// Each network in the strongest colour of its own logo (icon mark first, then wordmark), swapped for its logo's other
// colour where a neighbour on the map would look the same. Evoenergy's logo is all orange, inside Essential's orange,
// so it takes SA Power Networks' grey; Western Power's and Power and Water's logo files carry no colour.
const COLOUR: Record<string, string> = {
  "Ausgrid": "#0C6C9C", "Endeavour Energy": "#76C04E", "Essential Energy": "#F2540F", "Evoenergy": "#505050",
  "Energex": "#A6D30F", "Ergon Energy": "#2A2A8A", "CitiPower": "#E42424", "Powercor": "#E42424", "Jemena": "#24B4CC",
  "United Energy": "#E40C6C", "AusNet Services": "#243C6C", "SA Power Networks": "#505050", "TasNetworks": "#30B0D0",
  "Western Power": "#F36C12", "Horizon Power": "#103050", "Power and Water": "#6E7F3A",
}
const tint = (name: string) => COLOUR[name] ?? "#8A8170"
// one step per company: CitiPower and Powercor are one business, one logo, so they light up together
const STEPS: number[][] = []
NETS.forEach((n, i) => {
  const prev = STEPS[STEPS.length - 1]
  if (prev && netKey(NETS[prev[0]].name) && netKey(NETS[prev[0]].name) === netKey(n.name)) prev.push(i)
  else STEPS.push([i])
})
const STEP_OF = NETS.map((_, i) => STEPS.findIndex((g) => g.includes(i)))
// names drawn on the map itself; the small metro networks are named in the caption instead
const ON_MAP = new Set(["Essential Energy", "Ergon Energy", "SA Power Networks", "Power and Water", "Western Power", "Horizon Power", "TasNetworks", "Powercor", "AusNet Services"])

function useMedia(q: string) {
  const [on, setOn] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setOn(m.matches)
    f(); m.addEventListener("change", f)
    return () => m.removeEventListener("change", f)
  }, [q])
  return on
}

/** A clip from the app, shown as the phone's own screen (no drawn frame). A still instead when motion is off. */
function Clip({ src, poster, alt, still, eager }: { src?: string; poster: string; alt: string; still: boolean; eager?: boolean }) {
  return (
    <div className={styles.screen}>
      <span className={styles.glow} aria-hidden />
      {src && !still
        ? <video src={src} poster={poster} autoPlay muted loop playsInline preload={eager ? "auto" : "metadata"} aria-label={alt} />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={poster} alt={alt} loading={eager ? "eager" : "lazy"} />}
    </div>
  )
}

/** Australia, network by network: the areas fill in one at a time as the section scrolls past, then outages pulse. */
function NetworkMap({ still }: { still: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const [step, setStep] = useState(still ? STEPS.length + 1 : 0)
  const [dots, setDots] = useState(still)
  const big = useMedia("(min-width: 900px)")

  useEffect(() => {
    if (still) { setStep(STEPS.length + 1); setDots(true); return }
    let raf = 0
    const tick = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const span = Math.max(1, r.height - window.innerHeight)
      const p = Math.min(1, Math.max(0, -r.top / span))
      setStep(Math.min(STEPS.length + 1, Math.floor(p / 0.9 * (STEPS.length + 1) + (p > 0.01 ? 1 : 0))))
      setDots(p > 0.9)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(tick) }
    tick()
    window.addEventListener("scroll", on, { passive: true })
    window.addEventListener("resize", on)
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf) }
  }, [still])

  // step 0: nothing yet; 1…15: that company has just lit; 16: all of them
  const shownStep = Math.min(step, STEPS.length)
  const lit = shownStep === 0 ? 0 : STEPS[shownStep - 1][STEPS[shownStep - 1].length - 1] + 1
  const last = NETS[STEPS[Math.max(0, shownStep - 1)][0]]
  return (
    <section ref={ref} className={`${styles.netSection} ${still ? styles.still : ""}`} aria-labelledby="nets-title">
      <div className={styles.netSticky}>
        <div className={styles.netText}>
          <span className={styles.kicker}>Every network</span>
          <h2 id="nets-title" className={styles.h2}>Sixteen networks. One place to look.</h2>
          <p className={styles.body}>
            Each of Australia&apos;s sixteen electricity networks runs its own outage map. Wattle reads every one of
            them, every few minutes, so you don&apos;t have to.
          </p>
          <div className={styles.netNow} aria-live="polite">
            {lit === 0 ? <span className={styles.netHint}>Scroll to light them up</span>
              : step <= STEPS.length ? (
                <div key={step} className={styles.netBrand}>
                  {netKey(last.name) ? <NetLogo k={netKey(last.name)!} h={(big ? 72 : 52) * (NET[netKey(last.name)!].icon ? 1 : 0.62)} /> : <b>{last.name}</b>}
                  <span className={styles.netCount}>{lit} of {NETS.length}</span>
                </div>
              )
              : <div key="all" className={styles.netBrand}><b className={styles.netAll}>All {NETS.length}, in one place.</b><span className={styles.netCount}>Every network, one map.</span></div>}
          </div>
        </div>
        <svg className={styles.netMap} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} role="img"
          aria-label="A map of Australia divided into its sixteen electricity network areas">
          {NETS.map((n, i) => (
            <path key={n.name} d={n.d} className={STEP_OF[i] < step ? styles.netOn : styles.netOff}
              style={{ ["--c" as any]: tint(n.name) }} />
          ))}
          {NETS.map((n, i) => ON_MAP.has(n.name) && (
            <text key={n.name} x={n.at[0]} y={n.at[1]} className={`${styles.netLabel} ${STEP_OF[i] < step ? styles.shown : ""}`}>{n.name}</text>
          ))}
          {OUTAGE_DOTS.map((d, i) => (
            <g key={d.name} className={`${styles.outage} ${dots ? styles.shown : ""}`} style={{ ["--d" as any]: `${i * 0.35}s` }}>
              <circle cx={d.at[0]} cy={d.at[1]} r="22" className={styles.pulse} />
              <circle cx={d.at[0]} cy={d.at[1]} r="7.5" className={styles.core} />
            </g>
          ))}
        </svg>
      </div>
    </section>
  )
}

const steps = [
  {
    kicker: "Dashboard", title: "Every site, at a glance.",
    body: "Open Wattle and the bulb lights up with the sites that have power. Anything off now sits right under it, with when it's due back.",
    src: `${V}/dashboard-dark.mp4`, poster: `${V}/dashboard-dark.jpg`, alt: "The Wattle app opening: the bulb lights up, then the sites that are out now",
  },
  {
    kicker: "Planned", title: "Planned outages, days ahead.",
    body: "The networks book work weeks out. Wattle puts it on a calendar against your sites, with how long each runs, so there's time to move the fridge stock or the appointments.",
    poster: `${V}/planned.jpg`, alt: "The Planned screen: outages booked this week on a calendar",
  },
  {
    kicker: "Organisation", title: "Your sites, networks and team.",
    body: "Add each clinic once. Wattle works out its network, and everyone you invite sees the same map, the same alerts and the same planned work.",
    poster: `${V}/organisation-dark.jpg`, alt: "The Organisation screen for a sample group of sites",
  },
]

/** Desktop: one phone pinned while three short steps scroll past; its screen crossfades to match. */
function StickyPhone({ still }: { still: boolean }) {
  const [at, setAt] = useState(0)
  const refs = useRef<(HTMLDivElement | null)[]>([])
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) setAt(Number((e.target as HTMLElement).dataset.i))
    }), { rootMargin: "-45% 0px -45% 0px" })
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])
  return (
    <section className={styles.app} aria-label="The app">
      <div className={styles.appSteps}>
        {steps.map((s, i) => (
          <div key={s.title} ref={(el) => { refs.current[i] = el }} data-i={i} className={`${styles.step} ${at === i ? styles.stepOn : ""}`}>
            <span className={styles.kicker}>{s.kicker}</span>
            <h2 className={styles.h2}>{s.title}</h2>
            <p className={styles.body}>{s.body}</p>
          </div>
        ))}
      </div>
      <div className={styles.appPhone}>
        <div className={styles.stack}>
          {steps.map((s, i) => (
            <div key={s.title} className={`${styles.layer} ${at === i ? styles.layerOn : ""}`} aria-hidden={at !== i}>
              <Clip src={s.src} poster={s.poster} alt={s.alt} still={still} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Phones: the same three steps as a swipe carousel, one phone at a time, with dots. */
function Carousel({ still }: { still: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)
  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth
    setAt(Math.round(el.scrollLeft / (w + 16)))
  }
  const go = (i: number) => {
    const el = ref.current, c = el?.children[i] as HTMLElement | undefined
    if (el && c) el.scrollTo({ left: c.offsetLeft - el.offsetLeft - 24, behavior: still ? "auto" : "smooth" })
  }
  return (
    <section className={styles.carouselWrap} aria-label="The app" data-rise>
      <div ref={ref} className={styles.carousel} onScroll={onScroll}>
        {steps.map((s) => (
          <div key={s.title} className={styles.slide}>
            <Clip src={s.src} poster={s.poster} alt={s.alt} still={still} />
            <span className={styles.kicker}>{s.kicker}</span>
            <h2 className={styles.h3}>{s.title}</h2>
            <p className={styles.small}>{s.body}</p>
          </div>
        ))}
      </div>
      <div className={styles.dots} role="tablist">
        {steps.map((s, i) => (
          <button key={s.title} role="tab" aria-selected={at === i} aria-label={s.title} className={at === i ? styles.dotOn : ""} onClick={() => go(i)} />
        ))}
      </div>
    </section>
  )
}

const plans = [
  { mark: `${V}/tier.seed.png`, name: "Wattle Seed", price: "Free", per: "", line: "Up to 5 sites, with outages checked every 30 minutes." },
  { mark: `${V}/tier.bloom.png`, name: "Wattle Bloom", price: "$5.99", per: "a month per person, or $51.99 a year", line: "Up to 100 sites, live outages, push alerts and a weekly planned-work digest." },
  { mark: `${V}/tier.gold.png`, name: "Wattle Gold", price: "$14.99", per: "a month per person, coming later", line: "Up to 1,000 sites, with exports, API connections and AI monitoring." },
]

export default function Landing() {
  const still = useMedia("(prefers-reduced-motion: reduce)")
  const wide = useMedia("(min-width: 900px)")
  const root = useRef<HTMLElement>(null)

  // fade and rise as things come into view
  useEffect(() => {
    const el = root.current
    if (!el) return
    el.classList.add(styles.js)
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add(styles.in); io.unobserve(e.target) }
    }), { rootMargin: "0px 0px -8% 0px" })
    el.querySelectorAll("[data-rise]").forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [wide])

  return (
    <main ref={root} className={styles.page}>
      <div className={styles.wrap}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo} aria-label="Wattle home"><Wordmark height={28} /></Link>
          <Link href="/login" className={styles.signIn}>Sign in</Link>
        </nav>

        <section className={styles.hero}>
          <div className={styles.heroText} data-rise>
            <span className={styles.soonPill}><i className={styles.dot} aria-hidden />Coming soon to the App Store</span>
            <h1 className={styles.title}>Know the moment your sites lose power.</h1>
            <p className={styles.lede}>Every electricity network in Australia, watched in one place, for every clinic and pharmacy you run.</p>
            <div className={styles.ctas}>
              <a href={MAIL} className={styles.primary}>Get in touch</a>
              <Link href="/login" className={styles.ghost}>Sign in to the web portal</Link>
            </div>
          </div>
          <div className={styles.heroShot} data-rise>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${V}/wattle-head.png`} alt="" aria-hidden className={styles.head} />
            <Clip src={`${V}/alert-lockscreen.mp4`} poster={`${V}/alert-lockscreen.jpg`} still={still} eager
              alt="Wattle alerts arriving on an iPhone lock screen: a power outage near Bondi Junction Pharmacy, then power back" />
          </div>
        </section>
      </div>

      <div className={styles.wrap}><NetworkMap still={still} /></div>

      <div className={styles.wrap}>
        {wide ? <StickyPhone still={still} /> : <Carousel still={still} />}

        <section className={styles.groups} data-rise>
          <h2 className={styles.h2}>Running a pharmacy chain or a clinic group?</h2>
          <p className={styles.body}>
            Put every site on Wattle and the whole group works from the same picture: what&apos;s off now, what&apos;s
            booked, and who&apos;s been told. Admins choose who hears about which sites. Also on iPad and Mac, and on
            the web from any computer.
          </p>
          <a href={MAIL} className={styles.primary}>Get in touch</a>
        </section>

        <section className={styles.plans} aria-labelledby="plans-title">
          <h2 id="plans-title" className={styles.h2} data-rise>Plans</h2>
          <div className={styles.planRow}>
            {plans.map((p) => (
              <div key={p.name} className={styles.plan} data-rise>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.mark} alt="" width={88} height={88} loading="lazy" />
                <div>
                  <h3 className={styles.planName}>{p.name}</h3>
                  <p className={styles.price}>{p.price}{p.per && <span> {p.per}</span>}</p>
                  <p className={styles.small}>{p.line}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <span>© 2026 Arctiq Services · Sydney</span>
          <a href={MAIL}>Contact</a>
          <a href="https://arctiqservices.com.au" target="_blank" rel="noopener noreferrer" className={styles.pby}>
            Powered by <span className={styles.aq}><b>Arct</b><em>IQ</em></span>
          </a>
          <span>
            Another{" "}
            <a href="https://instagram.com/kieranjxn" target="_blank" rel="noopener noreferrer" className={styles.kez}>Kez Curation ↗</a>
          </span>
        </footer>
      </div>
    </main>
  )
}
