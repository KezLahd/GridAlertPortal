"use client"

import Link from "next/link"
import { useEffect } from "react"
import styles from "./landing.module.css"

export default function Landing() {
  // Darken body + html while landing is mounted, so the dark theme covers
  // scrollbar tracks and anything underneath.
  useEffect(() => {
    const body = document.body
    const html = document.documentElement
    const prevBody = body.style.backgroundColor
    const prevHtml = html.style.backgroundColor
    body.style.backgroundColor = "#0F0F10"
    html.style.backgroundColor = "#0F0F10"
    return () => {
      body.style.backgroundColor = prevBody
      html.style.backgroundColor = prevHtml
    }
  }, [])

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden />
      <div className={styles.spotlight} aria-hidden />

      <div className={styles.content}>
        {/* ─── Nav ────────────────────────────────── */}
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo}>
            GridAlert<span className={styles.logoDot} />
          </Link>
          <div className={styles.navRight}>
            <a href="#how" className={styles.navLink}>
              How it works
            </a>
            <a href="#features" className={styles.navLink}>
              Features
            </a>
            <Link href="/login" className={styles.signInBtn}>
              Sign in <span className={styles.arrow}>→</span>
            </Link>
          </div>
        </nav>

        {/* ─── Hero ───────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroEyebrow}>
              <span className={styles.pill}>
                <span className={styles.pillDot} />
                An Arctiq product
              </span>
            </div>

            <h1 className={styles.heroTitle}>
              Know before<br />
              the <span className={styles.gradientText}>lights</span> go out.
            </h1>

            <p className={styles.heroTag}>
              Real-time electricity outage alerts for clinics, cold storage, and
              every other asset you can&apos;t afford to lose. Every major
              Australian distributor, one map, one feed.
            </p>

            <div className={styles.ctas}>
              <a href="#contact" className={styles.btnPrimary}>
                Request a demo <span className={styles.arrow}>→</span>
              </a>
              <a href="#how" className={styles.btnGhost}>
                See how it works
              </a>
            </div>
          </div>

          <div className={styles.heroRight}>
            <svg
              className={styles.bolt}
              viewBox="0 0 200 280"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <defs>
                <linearGradient id="glBolt" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFD500" />
                  <stop offset="50%" stopColor="#FF9A00" />
                  <stop offset="100%" stopColor="#FF6A00" />
                </linearGradient>
              </defs>
              <path
                d="M 120 0 L 30 150 L 90 150 L 60 280 L 200 110 L 100 110 L 140 0 Z"
                fill="url(#glBolt)"
                stroke="#FFD500"
                strokeWidth="2"
                strokeOpacity="0.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </section>

        {/* ─── Problem ────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionNo}>01 / The problem</div>
            <h2 className={styles.sectionTitle}>
              The grid doesn&apos;t <em>tell you</em> until it&apos;s too late.
            </h2>
          </div>
          <div className={styles.problemGrid}>
            <div />
            <p className={styles.problemText}>
              Medical clinics, cold-chain warehouses, and critical infrastructure
              operators all share the same problem: when a planned or unplanned
              outage hits, they usually find out <strong>after</strong> the power
              goes out. That&apos;s a problem measured in spoiled vaccines,
              missed appointments, and insurance claims.
              <br /><br />
              Distributors publish the data. It&apos;s just buried in 13 different
              portals with 13 different shapes. GridAlert is the one place that
              reads all of them, mapped to <strong>your</strong> sites, pushed to
              you before the event.
            </p>
          </div>
        </section>

        {/* ─── How it works ────────────────────────── */}
        <section className={styles.section} id="how">
          <div className={styles.sectionHead}>
            <div className={styles.sectionNo}>02 / How it works</div>
            <h2 className={styles.sectionTitle}>
              Four things happen, <em>always</em>.
            </h2>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <h3 className={styles.stepTitle}>Pull</h3>
              <p className={styles.stepBody}>
                Every major Australian distributor&apos;s outage feed — planned
                and unplanned — ingested continuously.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <h3 className={styles.stepTitle}>Normalise</h3>
              <p className={styles.stepBody}>
                13 provider formats become one clean consolidated table.
                Geocoded, de-duplicated, shape-aware.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <h3 className={styles.stepTitle}>Match</h3>
              <p className={styles.stepBody}>
                Every outage is checked against your registered sites in real
                time using PostGIS geospatial queries.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>4</div>
              <h3 className={styles.stepTitle}>Alert</h3>
              <p className={styles.stepBody}>
                Email or SMS to the right person before the outage lands. Lead
                time measured in hours, not minutes.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Features ───────────────────────────── */}
        <section className={styles.section} id="features">
          <div className={styles.sectionHead}>
            <div className={styles.sectionNo}>03 / What&apos;s in it</div>
            <h2 className={styles.sectionTitle}>
              Built for operators, <em>not hobbyists</em>.
            </h2>
          </div>
          <div className={styles.features}>
            <article className={styles.feature}>
              <span className={styles.featureNo}>01</span>
              <h3 className={styles.featureTitle}>Live outage map</h3>
              <p className={styles.featureBody}>
                Every current and forecast outage, clustered by region, with a
                per-outage detail drawer.
              </p>
            </article>
            <article className={styles.feature}>
              <span className={styles.featureNo}>02</span>
              <h3 className={styles.featureTitle}>Your sites, ranked</h3>
              <p className={styles.featureBody}>
                Register the assets that matter. Each one gets a live risk score
                based on proximity to active and forecast outages.
              </p>
            </article>
            <article className={styles.feature}>
              <span className={styles.featureNo}>03</span>
              <h3 className={styles.featureTitle}>Teams &amp; roles</h3>
              <p className={styles.featureBody}>
                Multi-user companies with role-based access. Invite your ops
                lead, compliance officer, and night-shift manager separately.
              </p>
            </article>
            <article className={styles.feature}>
              <span className={styles.featureNo}>04</span>
              <h3 className={styles.featureTitle}>Forecast windows</h3>
              <p className={styles.featureBody}>
                Planned outages come with real lead time — hours to days — so
                your team has a chance to prepare, not react.
              </p>
            </article>
            <article className={styles.feature}>
              <span className={styles.featureNo}>05</span>
              <h3 className={styles.featureTitle}>Email &amp; SMS</h3>
              <p className={styles.featureBody}>
                Alerts go to the people who need them, on the channel they
                actually check. Configured per site, per role.
              </p>
            </article>
            <article className={styles.feature}>
              <span className={styles.featureNo}>06</span>
              <h3 className={styles.featureTitle}>Mobile-first</h3>
              <p className={styles.featureBody}>
                Half our users log in from the ute. The portal is built for one
                hand and a cracked screen.
              </p>
            </article>
          </div>
        </section>

        {/* ─── Final CTA ──────────────────────────── */}
        <section className={styles.finalCta} id="contact">
          <h2 className={styles.finalTitle}>
            Power events cost money. <em>Know about them first.</em>
          </h2>
          <p className={styles.finalTag}>
            Talk to us about a pilot for your network of sites.
          </p>
          <div className={styles.ctas} style={{ justifyContent: "center" }}>
            <a href="mailto:gridalert@arctiqservices.com.au" className={styles.btnPrimary}>
              Get in touch <span className={styles.arrow}>→</span>
            </a>
            <a
              href="https://arctiqservices.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnGhost}
            >
              About Arctiq
            </a>
          </div>
        </section>

        {/* ─── Footer ─────────────────────────────── */}
        <footer className={styles.footer}>
          <span>© 2026 Arctiq Services · GridAlert</span>
          <span>Sydney, Australia</span>
        </footer>
      </div>
    </main>
  )
}
