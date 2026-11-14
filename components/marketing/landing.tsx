"use client"

import Link from "next/link"
import { Wordmark } from "@/components/brand/wordmark"
import styles from "./landing.module.css"

// Wattle landing. Cream, ink and one gold; SF Pro Rounded for titles and buttons, SF Pro for text; no cards.
// Copy only says what the product does today. Things still being built sit under "On the way".

const steps = [
  {
    title: "Read",
    body: "Wattle reads the outage maps Australia's electricity distributors publish, every few minutes: faults, planned work under way, and planned work booked ahead.",
  },
  {
    title: "Match",
    body: "Each outage is checked against your sites' addresses, so you see how far it is from each clinic, not just which suburb it's in.",
  },
  {
    title: "See",
    body: "One map and three lists, unplanned, planned now and coming up, shared with everyone in your organisation.",
  },
]

const features = [
  ["A live outage map", "Outage areas drawn as the distributor publishes them, with your sites on top."],
  ["Distance to every site", "Which clinics are inside an outage, which are next to one, and how far away the rest are."],
  ["Planned work ahead", "Booked outages with their dates and times, so there's time to move appointments or stock."],
  ["Your team", "Invite people to your organisation as admins or members. Each person picks the outages they care about."],
  ["Bring your sites", "Add clinics one at a time or import a spreadsheet of addresses."],
  ["Take it with you", "Export what's affecting your sites for a report or a roster."],
]

export default function Landing() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo} aria-label="Wattle home">
          <Wordmark height={30} />
        </Link>
        <div className={styles.navRight}>
          <a href="#how" className={styles.navLink}>How it works</a>
          <a href="#features" className={styles.navLink}>What&apos;s in it</a>
          <Link href="/login" className={styles.signIn}>Sign in</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            An Arctiq product
          </span>
          <h1 className={styles.title}>Power outages near your clinics, as they happen.</h1>
          <p className={styles.lede}>
            Wattle watches the outage maps for you. It shows which of your clinics and pharmacies are in or near an
            outage right now, and which have planned work coming up, so you hear about it before the fridge alarm
            does.
          </p>
          <div className={styles.ctas}>
            <a href="mailto:gridalert@arctiqservices.com.au" className={styles.primary}>Get in touch</a>
            <Link href="/login" className={styles.secondary}>Sign in</Link>
          </div>
        </div>
        <div className={styles.heroMark} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wattle-mark.svg" alt="" />
        </div>
      </section>

      <section className={styles.section} id="how">
        <h2 className={styles.label}>How it works</h2>
        <ol className={styles.steps}>
          {steps.map((s, i) => (
            <li key={s.title} className={styles.step}>
              <span className={styles.stepNo}>{i + 1}</span>
              <div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepBody}>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className={styles.note}>
          Coverage depends on what each distributor publishes, and some publish more than others. Ask us about your
          area.
        </p>
      </section>

      <section className={styles.section} id="features">
        <h2 className={styles.label}>What&apos;s in it</h2>
        <dl className={styles.features}>
          {features.map(([t, b]) => (
            <div key={t} className={styles.feature}>
              <dt className={styles.featureTitle}>{t}</dt>
              <dd className={styles.featureBody}>{b}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.section}>
        <h2 className={styles.label}>On the way</h2>
        <div className={styles.soon}>
          <div className={styles.soonText}>
            <h3 className={styles.soonTitle}>Wattle for iPhone and Mac</h3>
            <p className={styles.stepBody}>
              The same account, in your pocket: your sites, the map and what&apos;s planned, with push alerts when an
              outage starts near a clinic, and a Monday email of the week&apos;s planned work.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.phone} src="/app-dashboard.png" alt="The Wattle iPhone app's dashboard with sample sites" />
        </div>
      </section>

      <section className={styles.final}>
        <h2 className={styles.finalTitle}>Running a group of clinics or pharmacies?</h2>
        <p className={styles.lede}>Talk to us about putting your sites on Wattle.</p>
        <div className={styles.ctas}>
          <a href="mailto:gridalert@arctiqservices.com.au" className={styles.primary}>Get in touch</a>
          <a href="https://arctiqservices.com.au" target="_blank" rel="noopener noreferrer" className={styles.secondary}>
            About Arctiq
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 Arctiq Services · Wattle · Sydney</span>
        <span>
          Another{" "}
          <a href="https://instagram.com/kieranjxn" target="_blank" rel="noopener noreferrer" className={styles.kez}>
            Kez Curation ↗
          </a>
        </span>
      </footer>
    </main>
  )
}
