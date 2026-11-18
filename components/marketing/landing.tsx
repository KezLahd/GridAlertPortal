"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Wordmark } from "@/components/brand/wordmark"
import Lenis from "lenis"
import { Rubik } from "next/font/google"
import "lenis/dist/lenis.css"
import { NetworkAssembly } from "./network-assembly"
import { NetworkDirectory } from "./network-directory"
import styles from "./landing.module.css"

// Wattle landing, round two. One story, in order: every network in one place → told the moment a site loses power →
// planned work days ahead → the whole group sees the same thing. Paper, ink and one gold; rounded type for titles;
// no cards. Scrolling is smoothed by Lenis; things have depth (the
// network map as an exploded 3D stack that assembles as you scroll, screens crossfading). All of it stops for
// prefers-reduced-motion, which shows the end state and stills instead of the clips.

// The app's type is SF Pro Rounded, which only Apple devices have. Everywhere else (Windows, Android, Chrome on a
// Mac) the rounded type falls back to Rubik. It isn't preloaded, so Safari, which has SF Pro Rounded, never fetches it.
const rubik = Rubik({ subsets: ["latin"], variable: "--font-rubik", display: "swap", preload: false })

const MAIL = "mailto:gridalert@arctiqservices.com.au"
const V = "/landing/v2"

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

// Apple's mark, as one path (Simple Icons, CC0).
const APPLE = "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"

/** The App Store button, greyed out until the app is live. Not a link yet, so nothing to click. */
function AppStoreSoon() {
  return (
    <span className={styles.store} role="link" aria-disabled="true" aria-label="Coming soon to the App Store">
      <svg viewBox="0 0 24 24" aria-hidden><path d={APPLE} fill="currentColor" /></svg>
      <span className={styles.storeText}><small>Coming soon to the</small><b>App Store</b></span>
    </span>
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

  // smooth scrolling, and the page's scroll as --sy for the hero's parallax
  useEffect(() => {
    if (still) return
    const lenis = new Lenis({ autoRaf: true, lerp: 0.085 })
    const el = root.current
    const put = () => el?.style.setProperty("--sy", lenis.scroll.toFixed(1))
    lenis.on("scroll", put)
    put()
    return () => lenis.destroy()
  }, [still])

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
    <main ref={root} className={`${styles.page} ${rubik.variable}`}>
      <div className={styles.wrap}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo} aria-label="Wattle home"><Wordmark height={28} /></Link>
          <Link href="/login" className={styles.signIn}>Sign in</Link>
        </nav>

        <section className={styles.hero}>
          <div className={styles.heroText} data-rise>
            <h1 className={styles.title}>Know the moment your sites lose power.</h1>
            <p className={styles.lede}>Every electricity network in Australia, watched in one place, for every clinic and pharmacy you run.</p>
            <div className={styles.ctas}>
              <AppStoreSoon />
              <a href={MAIL} className={styles.primary}>Get in touch</a>
            </div>
            <p className={styles.also}>
              For iPhone, iPad and Mac. Already with us? <Link href="/login">Sign in on the web</Link>
            </p>
          </div>
          <div className={styles.heroShot} data-rise>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${V}/wattle-head.png`} alt="" aria-hidden className={styles.head} />
            <Clip src={`${V}/alert-lockscreen.mp4`} poster={`${V}/alert-lockscreen.jpg`} still={still} eager
              alt="Wattle alerts arriving on an iPhone lock screen: a power outage near Bondi Junction Pharmacy, then power back" />
          </div>
        </section>
      </div>

      <NetworkAssembly still={still} wide={wide} />

      <div className={styles.wrap}>
        <NetworkDirectory wide={wide} />
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
