"use client"

import Link from "next/link"

// The distribution networks as the app has them: each one's own brand colour (read off its website, Nov 2026), its
// logo cut into an icon mark and a wordmark (public/networks, the same files the app bundles), where it runs and its
// website. A network's name anywhere in the portal is a link to its page, with a dot in its colour.

export type NetKey =
  | "ausgrid" | "endeavour" | "essential" | "energex" | "ergon" | "citipowercor" | "unitedenergy" | "jemena" | "ausnet"
  | "sapower" | "tasnetworks" | "wpower" | "evoenergy" | "horizonpower" | "powerwater"

/** The key for a provider as the data names it ("SAPower", "United Energy", "Essential Energy", "Powercor"…). */
export function netKey(p: string | null | undefined): NetKey | null {
  const k = (p ?? "").toLowerCase().replace(/[^a-z]/g, "")
  const alias: Record<string, NetKey> = {
    essentialenergy: "essential", endeavourenergy: "endeavour", ergonenergy: "ergon", citipower: "citipowercor", powercor: "citipowercor",
    citipowerandpowercor: "citipowercor", ausnetservices: "ausnet", sapowernetworks: "sapower", westernpower: "wpower",
    horizon: "horizonpower", powerandwater: "powerwater",
  }
  const key = (alias[k] ?? k) as NetKey
  return key in NET ? key : null
}

type Tone = "colour" | "dark" | "light"
interface Net {
  name: string
  /** the colour Wattle draws the network in: the one you'd know it by, and one that holds up on cream and in dark mode */
  tint: string
  website: string
  area: string
  states: string[]
  /** logo parts: width over height, and what colour the art is (a navy wordmark turns to ink in dark mode) */
  icon?: [number, Tone]
  word?: [number, Tone]
}

export const NET: Record<NetKey, Net> = {
  ausgrid: { name: "Ausgrid", tint: "#008BC0", website: "https://www.ausgrid.com.au", area: "Sydney, the Central Coast and the Hunter.", states: ["NSW"], icon: [1.025, "colour"], word: [3.335, "dark"] },
  endeavour: { name: "Endeavour Energy", tint: "#00A98E", website: "https://www.endeavourenergy.com.au", area: "Greater Western Sydney, the Blue Mountains, Southern Highlands, Illawarra and South Coast.", states: ["NSW"], icon: [1.416, "colour"], word: [2.671, "dark"] },
  essential: { name: "Essential Energy", tint: "#FF5300", website: "https://www.essentialenergy.com.au", area: "Regional, rural and remote New South Wales, and parts of southern Queensland.", states: ["NSW", "QLD"], icon: [0.9, "colour"], word: [2.317, "dark"] },
  energex: { name: "Energex", tint: "#1596D1", website: "https://www.energex.com.au", area: "South East Queensland, from the Gold Coast to the Sunshine Coast.", states: ["QLD"], icon: [1.716, "colour"], word: [5.28, "dark"] },
  ergon: { name: "Ergon Energy", tint: "#028E6B", website: "https://www.ergon.com.au", area: "Regional Queensland, outside the south east.", states: ["QLD"], icon: [1.562, "colour"], word: [2.702, "dark"] },
  citipowercor: { name: "CitiPower Powercor", tint: "#0979BF", website: "https://www.powercor.com.au", area: "CitiPower runs Melbourne's CBD and inner suburbs; Powercor runs Melbourne's west and western Victoria.", states: ["VIC"], word: [4.709, "colour"] },
  unitedenergy: { name: "United Energy", tint: "#ED1164", website: "https://www.unitedenergy.com.au", area: "Melbourne's south east and the Mornington Peninsula.", states: ["VIC"], icon: [0.971, "colour"], word: [1.939, "dark"] },
  jemena: { name: "Jemena", tint: "#26A6D7", website: "https://www.jemena.com.au", area: "Melbourne's north west.", states: ["VIC"], icon: [0.97, "colour"], word: [3.973, "dark"] },
  ausnet: { name: "AusNet Services", tint: "#4574BF", website: "https://www.ausnetservices.com.au", area: "Eastern Victoria and Melbourne's north and east.", states: ["VIC"], word: [4.473, "dark"] },
  sapower: { name: "SA Power Networks", tint: "#FA7909", website: "https://www.sapowernetworks.com.au", area: "All of South Australia.", states: ["SA"], icon: [0.785, "colour"], word: [1.513, "dark"] },
  tasnetworks: { name: "TasNetworks", tint: "#26A9E0", website: "https://www.tasnetworks.com.au", area: "All of Tasmania.", states: ["TAS"], icon: [2.541, "colour"], word: [7.294, "light"] },
  wpower: { name: "Western Power", tint: "#F36C12", website: "https://www.westernpower.com.au", area: "Perth and the south west of Western Australia.", states: ["WA"], icon: [1.634, "light"], word: [1.623, "light"] },
  evoenergy: { name: "Evoenergy", tint: "#FF671F", website: "https://www.evoenergy.com.au", area: "The Australian Capital Territory.", states: ["ACT"], word: [6.217, "colour"] },
  horizonpower: { name: "Horizon Power", tint: "#C54630", website: "https://www.horizonpower.com.au", area: "Regional Western Australia, outside the south west.", states: ["WA"], word: [2.751, "dark"] },
  powerwater: { name: "Power and Water", tint: "#6E7F3A", website: "https://www.powerwater.com.au", area: "The Northern Territory.", states: ["NT"] },
}

const PLAIN = "#8A8170"
export const netTint = (p: string | null | undefined) => { const k = netKey(p); return k ? NET[k].tint : PLAIN }
export const netName = (p: string | null | undefined) => { const k = netKey(p); return k ? NET[k].name : p || "Network not set" }

/** A network's name as a link to its page, with a dot in its colour. `tinted` colours the name too. */
export function NetLink({ p, tinted = true, dot = true }: { p: string | null | undefined; tinted?: boolean; dot?: boolean }) {
  const k = netKey(p)
  if (!k) return <span className="nl">{p || "Network not set"}</span>
  const c = NET[k].tint
  return (
    <Link href={`/networks/${k}`} className={`nl${tinted ? " t" : ""}`} style={{ ["--net" as string]: c }} onClick={(e) => e.stopPropagation()}>
      {dot && <i />}{NET[k].name}
    </Link>
  )
}

/** The network's own logo: icon mark and wordmark side by side (or whichever it has), its name in type if neither. */
export function NetLogo({ k, h = 28 }: { k: NetKey; h?: number }) {
  const n = NET[k]
  if (!n.icon && !n.word) return <span className="nlogo-t" style={{ fontSize: h * 0.7, color: n.tint }}>{n.name}</span>
  const part = (which: "icon" | "word", [aspect, tone]: [number, Tone], height: number) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/networks/${k}-${which}.png`} alt={which === "word" || !n.word ? n.name : ""} className={`tone-${tone}`} style={{ height, width: height * aspect }} />
  )
  // a one-line wordmark sits at about cap height beside the icon; a stacked one takes the icon's full height
  const wordH = n.word && n.icon && n.word[0] > 2.5 ? h * 0.62 : h
  return (
    <span className="nlogo" role="img" aria-label={n.name}>
      {n.icon && part("icon", n.icon, h)}
      {n.word && part("word", n.word, wordH)}
    </span>
  )
}
