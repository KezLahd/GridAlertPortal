"use client"

import Link from "next/link"
import { Wordmark } from "@/components/brand/wordmark"
import styles from "./landing.module.css"

// Wattle landing. Paper, ink and one gold; SF Pro Rounded for titles, SF Pro for text; no cards, figures as type.
// The app is coming to the App Store (iPhone, iPad and Mac); until then this page shows it off with real screens
// (sample sites), and the web portal is for people already on Wattle.

const MAIL = "mailto:gridalert@arctiqservices.com.au"

/** A screen from the app, in a phone's rounded shape with a soft gold bloom behind it. `dark` swaps in the dark one. */
function Screen({ src, dark, alt, tilt, eager }: { src: string; dark?: string; alt: string; tilt?: "l" | "r"; eager?: boolean }) {
  return (
    <div className={`${styles.screen} ${tilt === "l" ? styles.tiltL : tilt === "r" ? styles.tiltR : ""}`}>
      <span className={styles.bloom} aria-hidden />
      <picture>
        {dark && <source srcSet={dark} media="(prefers-color-scheme: dark)" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={600} height={1304} loading={eager ? "eager" : "lazy"} />
      </picture>
    </div>
  )
}

const features: { id: string; kicker: string; title: string; body: string; points: string[]; src: string; dark?: string; alt: string }[] = [
  {
    id: "dashboard", kicker: "Dashboard", title: "Every site, at a glance.",
    body: "A light bulb with a wattle sprig inside it shows how many of your sites have power. Under it, where the outages are by state, and what's off now with a timeline of when each site is due back.",
    points: ["Off now and coming up this week", "Outages by state on a map of Australia", "When each site gets power back"],
    src: "/landing/dashboard-dark.jpg", dark: "/landing/dashboard-light.jpg", alt: "The Wattle dashboard: a light bulb with a wattle sprig inside, two sites out in Victoria",
  },
  {
    id: "map", kicker: "Map", title: "See the outage, and your clinic inside it.",
    body: "Every site on one map with the outage areas the networks publish drawn over the top, so you can see whether a clinic is inside an outage or just next to one.",
    points: ["Outage areas as the network draws them", "Network boundaries, state by state", "Search for any site, suburb or postcode"],
    src: "/landing/map.jpg", alt: "The Wattle map: an outage area over South Yarra with two sample clinics",
  },
  {
    id: "planned", kicker: "Planned", title: "Know about planned work days ahead.",
    body: "A calendar of the outages the networks have booked at your sites, so there's time to move appointments or stock. What's under way now sits underneath, with its start and finish times.",
    points: ["A month calendar, with each booked day marked", "How long each outage runs", "Under way now, with times"],
    src: "/landing/planned.jpg", alt: "The Planned screen: four outages this week on a November calendar",
  },
  {
    id: "organisation", kicker: "Organisation", title: "Your sites, your networks, your team.",
    body: "Everything about your group in one place, under a dotted map of Australia lit up where your sites are. Add clinics, see which networks supply them, and invite the people who need to know.",
    points: ["Sites, networks and team, a tap apart", "A map lit up where your sites are", "Admins and members, each with their own alerts"],
    src: "/landing/organisation.jpg", dark: "/landing/organisation-dark.jpg", alt: "The Organisation screen for a sample group of 13 sites",
  },
]

export default function Landing() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo} aria-label="Wattle home"><Wordmark height={30} /></Link>
        <div className={styles.navRight}>
          <a href="#features" className={styles.navLink}>Features</a>
          <a href="#alerts" className={styles.navLink}>Alerts</a>
          <Link href="/login" className={styles.signIn}>Sign in</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.soonPill}><i className={styles.dot} aria-hidden />Coming soon to the App Store</span>
          <h1 className={styles.title}>Know when the power goes out at your clinics.</h1>
          <p className={styles.lede}>
            Wattle watches Australia&apos;s electricity networks for every clinic and pharmacy you run. It tells you
            when an outage reaches one, and about planned work before it starts, so you hear about it before the
            fridge alarm does.
          </p>
          <p className={styles.devices}>For iPhone, iPad and Mac</p>
          <div className={styles.ctas}>
            <a href={MAIL} className={styles.primary}>Get in touch</a>
            <Link href="/login" className={styles.secondary}>Sign in to the web portal</Link>
          </div>
        </div>
        <div className={styles.heroShot}>
          <Screen src="/landing/dashboard-light.jpg" dark="/landing/dashboard-dark.jpg" alt="The Wattle app's dashboard on an iPhone" eager />
        </div>
      </section>

      <section className={styles.figures} aria-label="What Wattle watches">
        <div><b>15</b><span>electricity networks, read every few minutes</span></div>
        <div><b>3</b><span>kinds of outage: faults, planned work under way, and work booked ahead</span></div>
        <div><b>1</b><span>place to see all of it, for everyone in your group</span></div>
      </section>

      <div id="features">
        {features.map((f, i) => (
          <section key={f.id} id={f.id} className={`${styles.feature} ${i % 2 ? styles.flip : ""}`}>
            <div className={styles.featureText}>
              <span className={styles.kicker}>{f.kicker}</span>
              <h2 className={styles.featureTitle}>{f.title}</h2>
              <p className={styles.featureBody}>{f.body}</p>
              <ul className={styles.points}>{f.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
            <Screen src={f.src} dark={f.dark} alt={f.alt} tilt={i % 2 ? "l" : "r"} />
          </section>
        ))}
      </div>

      <section id="alerts" className={styles.alerts}>
        <span className={styles.kicker}>Sign-in and alerts</span>
        <h2 className={styles.featureTitle}>Quick to get in. Told the moment it matters.</h2>
        <dl className={styles.alertList}>
          <div><dt>Passkeys with Face ID</dt><dd>Sign in with a glance, with no password to remember or reset.</dd></div>
          <div><dt>Alerts for faults</dt><dd>A push notification when the network reports the power off at one of your sites.</dd></div>
          <div><dt>Alerts for planned work</dt><dd>When the network announces booked work, and again when it starts.</dd></div>
          <div><dt>How Close</dt><dd>Choose how close an outage has to be to a site before Wattle tells you.</dd></div>
        </dl>
      </section>

      <section className={`${styles.feature} ${styles.flip}`} id="devices">
        <div className={styles.featureText}>
          <span className={styles.kicker}>Look and devices</span>
          <h2 className={styles.featureTitle}>Light by day, dark by night. On your Mac too.</h2>
          <p className={styles.featureBody}>
            Wattle can follow your iPhone between light and dark, or stay the way you like it. It&apos;s built for
            iPhone and iPad, with a native Mac app for the desk, all on the same account.
          </p>
          <ul className={styles.points}>
            <li>Light, dark, or automatic</li>
            <li>iPhone, iPad and a native Mac app</li>
            <li>The web portal, from any computer</li>
          </ul>
        </div>
        <Screen src="/landing/settings-appearance.jpg" alt="The Appearance setting: Auto, Light and Dark" tilt="l" />
      </section>

      <section className={styles.final}>
        <span className={styles.soonPill}><i className={styles.dot} aria-hidden />Coming soon to the App Store</span>
        <h2 className={styles.finalTitle}>Running a group of clinics or pharmacies?</h2>
        <p className={styles.lede}>Talk to us about putting your sites on Wattle.</p>
        <div className={styles.ctas}>
          <a href={MAIL} className={styles.primary}>Get in touch</a>
          <Link href="/login" className={styles.secondary}>Sign in</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 Arctiq Services · Wattle · Sydney</span>
        <a href="https://arctiqservices.com.au" target="_blank" rel="noopener noreferrer" className={styles.pby}>
          Powered by <span className={styles.aq}><b>Arct</b><em>IQ</em></span>
        </a>
        <span>
          Another{" "}
          <a href="https://instagram.com/kieranjxn" target="_blank" rel="noopener noreferrer" className={styles.kez}>Kez Curation ↗</a>
        </span>
      </footer>
    </main>
  )
}
