"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Loading } from "@/components/wattle/shell"
import { plural, usePortal, type Site } from "@/components/wattle/data"
import { GlanceList } from "@/components/wattle/glance"
import { NET, NetLogo, netKey, type NetKey } from "@/components/wattle/networks"

// A network's page, like the app's: its logo, where it runs, your sites on it, what it has out and planned, and a way to
// its own website. Drawn in the network's colour. The map is its service area (public/network-areas.json, the same
// outlines as the main map) with your sites on it as gold and grey dots.

export default function NetworkPage() {
  const { key } = useParams<{ key: string }>()
  const router = useRouter()
  const { data, error } = usePortal()
  const k = netKey(key)

  const v = useMemo(() => {
    if (!data || !k) return null
    const sites = data.sites.filter((s) => netKey(s.provider) === k)
    const outs = data.outages.filter((o) => netKey(o.provider || o.site.provider) === k)
      .sort((a, b) => Number(b.status !== "Planned") - Number(a.status !== "Planned") || new Date(a.starts ?? 0).getTime() - new Date(b.starts ?? 0).getTime())
    const now = outs.filter((o) => o.status !== "Planned"), planned = outs.filter((o) => o.status === "Planned")
    return { sites, outs, now, planned, offIds: new Set(now.map((o) => o.site.id)) }
  }, [data, k])

  if (!k) return <main className="netp"><div className="empty">There&apos;s no network called {key}. <Link href="/overview">Back to the dashboard</Link></div></main>
  if (!data || !v) return <Loading error={error} />
  const n = NET[k]

  return (
    <main className="netp" style={{ ["--net" as string]: n.tint }}>
      <title>{`${n.name} · Wattle`}</title>
      <button className="back" onClick={() => (history.length > 1 ? router.back() : router.push("/overview"))}>
        <svg viewBox="0 0 12 12" aria-hidden><path d="M7.5 2.5 4 6l3.5 3.5" /></svg>Back
      </button>
      <div className="np-top">
        <div className="np-who">
          <h1><NetLogo k={k} h={44} /></h1>
          <div className="np-meta"><i />Distribution network{n.states.length > 0 && <span> · {n.states.join(", ")}</span>}</div>
          <p>{n.area}</p>
          <div className="dfigs np-figs">
            <div><b>{v.sites.length}</b><span>Your sites</span><small>on {n.name}&apos;s network</small></div>
            <div className={v.now.length ? "now" : ""}><b>{new Set(v.now.map((o) => o.site.id)).size}</b><span>{v.now.length > 0 && <i className="sw now" />}Off now</span><small>{v.now.length ? "at or near your sites" : "nothing of theirs is out"}</small></div>
            <div><b>{v.planned.length}</b><span>Planned</span><small>next 28 days</small></div>
          </div>
          <a className="btn np-visit" href={n.website} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 12 12" aria-hidden><path d="M4 8 8.5 3.5M4.5 3.5h4v4" /></svg>Visit {n.name}
          </a>
        </div>
        <AreaMap k={k} sites={v.sites} off={v.offIds} />
      </div>

      <section className="np-outs">
        <h2>Outages<span>{plural(v.outs.length, "outage")} at or near your sites</span></h2>
        {v.outs.length === 0 ? <div className="empty">Nothing from {n.name} at or near your sites.</div>
          : <GlanceList key={k} list={v.outs} at={data.at} limit={12} />}
      </section>
    </main>
  )
}

// ---------- the service area, drawn small ----------

type Ring = [number, number][]
let areas: Promise<{ type: string; features: { properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }[] }> | null = null
const loadAreas = () => (areas ??= fetch("/network-areas.json").then((r) => r.json()))

/** The network's area (CitiPower and Powercor together) washed in its colour, with your sites on it. */
function AreaMap({ k, sites, off }: { k: NetKey; sites: Site[]; off: Set<string> }) {
  const [polys, setPolys] = useState<Ring[][] | null>(null)
  useEffect(() => {
    let live = true
    loadAreas().then((fc) => {
      if (!live) return
      const out: Ring[][] = []
      for (const f of fc.features) {
        if (f.properties.kind === "edge" || netKey(String(f.properties.network)) !== k) continue
        const g = f.geometry
        const ps = (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []) as Ring[][]
        out.push(...ps)
      }
      setPolys(out)
    }).catch(() => setPolys([]))
    return () => { live = false }
  }, [k])

  const pins = sites.filter((s) => s.lat !== null && s.lng !== null)
  const view = useMemo(() => {
    const pts: [number, number][] = [...(polys ?? []).flatMap((p) => p[0]), ...pins.map((s) => [s.lng!, s.lat!] as [number, number])]
    if (!pts.length) return null
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    const kx = Math.cos(((y0 + y1) / 2) * Math.PI / 180)   // squash longitude so the shape isn't stretched
    const pad = Math.max((x1 - x0) * kx, y1 - y0, 0.05) * 0.06
    const W = (x1 - x0) * kx + pad * 2, H = y1 - y0 + pad * 2
    const P = ([x, y]: [number, number]) => `${((x - x0) * kx + pad).toFixed(4)},${(y1 - y + pad).toFixed(4)}`
    return { W, H, P, r: Math.max(W, H) / 110 }
  }, [polys, pins])

  if (!polys) return <div className="np-map wait" aria-hidden />
  if (!view) return <div className="np-map none">No area or sites to draw.</div>
  const { W, H, P, r } = view
  const path = polys.map((p) => p.map((ring) => `M${ring.map(P).join("L")}Z`).join("")).join("")
  return (
    <figure className="np-map">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Where ${NET[k].name} runs, with ${plural(pins.length, "site")} of yours`}>
        <path d={path} className="ar" fillRule="evenodd" vectorEffect="non-scaling-stroke" />
        {/* your sites: a quiet ring with power, solid gold with a bloom where it's off, drawn on top */}
        {pins.filter((s) => !off.has(s.id)).map((s) => { const [x, y] = P([s.lng!, s.lat!]).split(",").map(Number); return <circle key={s.id} cx={x} cy={y} r={r * 0.75} className="s" vectorEffect="non-scaling-stroke" /> })}
        {pins.filter((s) => off.has(s.id)).map((s) => { const [x, y] = P([s.lng!, s.lat!]).split(",").map(Number); return <g key={s.id}><circle cx={x} cy={y} r={r * 2.4} className="bl" /><circle cx={x} cy={y} r={r} className="o" /></g> })}
      </svg>
      <figcaption>{polys.length ? "Service area, approximate at the edges" : "Your sites"} · <Link href="/map">Open the map</Link></figcaption>
    </figure>
  )
}

