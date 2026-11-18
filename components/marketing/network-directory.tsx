"use client"
// The fifteen networks, one by one: a flat map of their patches beside a list of who they are, where they run, how many
// customers they have and their website. Point at (or tap) a network in either and its patch lights up on the map while
// the rest go grey. This is where the details live that the map story above leaves out, so the eye there can stay on
// one logo at a time.

import { useState } from "react"
import { NET, netKey } from "@/components/wattle/networks"
import { NETS, NET_VIEW } from "./network-map-data"
import { CUSTOMERS, LIFT, Logo, STEPS, tint } from "./network-assembly"
import styles from "./network-directory.module.css"

// which company each area belongs to (CitiPower and Powercor are one)
const OWNER = NETS.map((_, i) => STEPS.findIndex((g) => g.includes(i)))

export function NetworkDirectory({ wide }: { wide: boolean }) {
  const [on, setOn] = useState(-1)
  const [held, setHeld] = useState(-1)
  const lit = on >= 0 ? on : held
  const toggle = (g: number) => setHeld((h) => (h === g ? -1 : g))

  return (
    <section className={styles.section} aria-labelledby="networks-title">
      <div className={styles.head}>
        <h2 id="networks-title" className={styles.title}>Fifteen networks. Wattle watches them all.</h2>
        <p className={styles.lede}>{wide ? "Point at one" : "Tap one"} to see the patch it looks after.</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.mapCol}>
          <svg className={styles.map} viewBox={`0 0 ${NET_VIEW.w} ${NET_VIEW.h}`} role="img" aria-label="Map of Australia's electricity networks"
            onMouseLeave={() => setOn(-1)}>
            {NETS.map((n, i) => {
              const g = OWNER[i]
              return (
                <path key={n.name} d={n.d}
                  className={`${styles.area} ${lit >= 0 && lit !== g ? styles.dim : ""} ${lit === g ? styles.lit : ""}`}
                  style={{ ["--c" as string]: tint(n.name), ["--cd" as string]: LIFT[n.name] ?? tint(n.name) }}
                  onMouseEnter={() => setOn(g)} onClick={() => toggle(g)} />
              )
            })}
          </svg>
        </div>

        <ul className={styles.list} onMouseLeave={() => setOn(-1)}>
          {STEPS.map((group, g) => {
            const key = netKey(NETS[group[0]].name)
            if (!key) return null
            const net = NET[key]
            return (
              <li key={key} className={`${styles.row} ${lit >= 0 && lit !== g ? styles.faded : ""}`}
                style={{ ["--c" as string]: tint(NETS[group[0]].name) }} onMouseEnter={() => setOn(g)}>
                <button type="button" className={styles.pick} onClick={() => toggle(g)} onFocus={() => setOn(g)} onBlur={() => setOn(-1)}
                  aria-pressed={held === g}>
                  <Logo k={key} h={30} w={220} />
                </button>
                <p className={styles.meta}>
                  <b>{net.states.join(" · ")}</b> {net.area}
                  {CUSTOMERS[key] && <> About {CUSTOMERS[key]} customers.</>}
                </p>
                <a className={styles.site} href={net.website} target="_blank" rel="noopener noreferrer">
                  {net.website.replace(/^https?:\/\/(www\.)?/, "")} ↗
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
