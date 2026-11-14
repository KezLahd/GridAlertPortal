"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api"
import { googleMapsApiKey } from "@/lib/config"
import { WATTLE_MAP_STYLE } from "@/lib/map-style"
import { Loading } from "@/components/wattle/shell"
import { checked, fmt, since, time, usePortal, type Site, type SiteState } from "@/components/wattle/data"

// Map: every site on the warm Google map. Orange = power off now, gold = planned for 4 hours or longer in the next
// 14 days, pale gold = shorter, stone = all clear. Close sites group into an ink circle with the count, a gold arc for
// the share running 4h+, and an orange badge for any that are off now. The list beside it follows the view.

const libraries: ("places" | "geometry" | "drawing")[] = ["places"]
const VIEWS: Record<string, [number, number, number, number]> = {
  Australia: [112.5, -44, 154, -10.5], Sydney: [150.55, -34.15, 151.45, -33.55], Melbourne: [144.6, -38.25, 145.6, -37.6],
  Brisbane: [152.8, -27.75, 153.35, -27.2], Adelaide: [138.4, -35.15, 138.9, -34.7], Perth: [115.65, -32.6, 116.1, -31.8],
  Canberra: [148.95, -35.45, 149.25, -35.2],
}
const COL = { now: "#E0660A", long: "#F2B300", soon: "#FBE7A6", clear: "#CFC6B5" }
const RANK = { now: 3, long: 2, soon: 1, clear: 0 }
type Pin = { s: Site & { lat: number; lng: number }; st: SiteState }

const svgUrl = (svg: string) => "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg)
function dotIcon(k: keyof typeof COL, sel: boolean) {
  const r = k === "clear" ? 5 : sel ? 9 : 7, size = k === "now" ? 34 : r * 2 + 8, c = size / 2
  const halo = k === "now" ? `<circle cx="${c}" cy="${c}" r="15" fill="#E0660A" opacity=".18"/>` : ""
  const ring = k === "soon" ? `stroke="#F2B300"` : `stroke="${sel ? "#24211C" : "#FBF8F2"}"`
  return { url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${halo}<circle cx="${c}" cy="${c}" r="${r}" fill="${COL[k]}" ${ring} stroke-width="${sel ? 3 : 2}"/></svg>`), size, anchor: c }
}
function clusterIcon(n: number, longShare: number, nNow: number) {
  const r = Math.min(13 + Math.sqrt(n) * 3.2, 30), pad = 12, size = (r + pad) * 2, c = size / 2, rr = r - 3
  const a = longShare * Math.PI * 2
  const arc = longShare >= 1 ? `<circle cx="${c}" cy="${c}" r="${rr}" fill="none" stroke="#F2B300" stroke-width="3"/>`
    : longShare > 0 ? `<path d="M${c},${c - rr}A${rr},${rr} 0 ${a > Math.PI ? 1 : 0} 1 ${c + rr * Math.sin(a)},${c - rr * Math.cos(a)}" fill="none" stroke="#F2B300" stroke-width="3" stroke-linecap="round"/>` : ""
  const bx = c + r * 0.72, by = c - r * 0.72
  const badge = nNow ? `<circle cx="${bx}" cy="${by}" r="9" fill="#E0660A" stroke="#FBF8F2" stroke-width="2"/><text x="${bx}" y="${by + 4}" text-anchor="middle" font-family="ui-rounded,-apple-system,system-ui,sans-serif" font-weight="700" font-size="11" fill="#fff">${nNow}</text>` : ""
  return { url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${c}" cy="${c}" r="${r + 5}" fill="#24211C" opacity=".1"/><circle cx="${c}" cy="${c}" r="${r}" fill="#24211C"/>${arc}<text x="${c}" y="${c + 5}" text-anchor="middle" font-family="ui-rounded,-apple-system,system-ui,sans-serif" font-weight="700" font-size="${r > 20 ? 15 : 13}" fill="#FBF8F2">${n}</text>${badge}</svg>`), size, anchor: c }
}

export default function MapPage() {
  const { data, error, stateOf } = usePortal()
  const { isLoaded, loadError } = useJsApiLoader({ id: "google-map-script", googleMapsApiKey, libraries })
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [view, setView] = useState<string>("Australia")
  const [zoom, setZoom] = useState(4)
  const [bounds, setBounds] = useState<google.maps.LatLngBounds | null>(null)
  const [on, setOn] = useState({ now: true, plan: true, clear: true })
  const [sel, setSel] = useState<string | null>(null)

  const pins = useMemo<Pin[]>(() => (data?.sites ?? [])
    .filter((s): s is Pin["s"] => s.lat !== null && s.lng !== null)
    .map((s) => ({ s, st: stateOf(s.id) })), [data, stateOf])
  const noPin = (data?.sites.length ?? 0) - pins.length

  const fit = useCallback((v: string, m = map) => {
    if (!m) return
    const [w, s, e, n] = VIEWS[v]
    m.fitBounds({ west: w, south: s, east: e, north: n }, 24)
  }, [map])
  useEffect(() => {
    if (!map) return
    const want = new URLSearchParams(location.search).get("site")
    const p = want ? pins.find((x) => x.s.id === want) : null
    if (p) { setView(""); setSel(p.s.id); map.setCenter({ lat: p.s.lat, lng: p.s.lng }); map.setZoom(14); return }
    fit(innerWidth < 820 ? "Sydney" : "Australia")
    if (innerWidth < 820) setView("Sydney")
  }, [map, pins.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = (p: Pin) => p.st.k === "now" ? on.now : p.st.k === "clear" ? on.clear : on.plan
  const inBounds = (p: Pin) => !bounds || bounds.contains({ lat: p.s.lat, lng: p.s.lng })

  // group close outages on screen: cells of ~46px at this zoom
  const clusters = useMemo(() => {
    const cell = (360 / 2 ** zoom) * (46 / 256)
    const bins = new Map<string, Pin[]>()
    for (const p of pins) {
      if (p.st.k === "clear" || !shown(p)) continue
      const key = `${Math.round(p.s.lat / cell)}:${Math.round(p.s.lng / cell)}`
      bins.set(key, [...(bins.get(key) ?? []), p])
    }
    return [...bins.values()]
  }, [pins, zoom, on]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <Loading error={error} />
  const here = pins.filter(inBounds)
  const count = (k: "now" | "plan" | "clear") => here.filter((p) => k === "plan" ? p.st.k === "long" || p.st.k === "soon" : p.st.k === k).length
  const list = here.filter((p) => p.st.k !== "clear" && shown(p))
    .sort((a, b) => (a.st.k === "now" ? 0 : 1) - (b.st.k === "now" ? 0 : 1) || new Date(a.st.o?.starts ?? 0).getTime() - new Date(b.st.o?.starts ?? 0).getTime())
  const selPin = pins.find((p) => p.s.id === sel)
  const choose = (p: Pin) => {
    setSel(p.s.id)
    if (map && (map.getZoom() ?? 0) < 11) { map.setZoom(13) }
    map?.panTo({ lat: p.s.lat, lng: p.s.lng })
  }

  return (
    <main className="mp">
      <title>Map · Wattle</title>
      <section className="mp-side">
        <div className="mp-head">
          <div className="eyebrow"><i className="dot" />Live · checked {checked(data.at)}</div>
          <h1>Map</h1>
          <div className="chips">
            {Object.keys(VIEWS).map((v) => {
              const [w, s, e, n] = VIEWS[v]
              const c = pins.filter((p) => p.st.k !== "clear" && p.s.lng >= w && p.s.lng <= e && p.s.lat >= s && p.s.lat <= n).length
              return <button key={v} className={`chip ${v === view ? "on" : ""}`} onClick={() => { setView(v); setSel(null); fit(v) }}>{v}{v === "Australia" ? "" : ` · ${c}`}</button>
            })}
          </div>
          <div className="layers">
            {([["now", "Off now", "now"], ["plan", "Next 14 days", "long"], ["clear", "All clear", "clear"]] as const).map(([k, l, sw]) => (
              <button key={k} className={`layer ${on[k] ? "" : "off"}`} onClick={() => setOn((o) => ({ ...o, [k]: !o[k] }))}>
                <div className="k"><i className={`sw ${sw}`} />{l}</div><div className="v">{count(k)}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="mp-list">
          {list.length === 0 && <div className="lh">Nothing in this part of the map</div>}
          {(["now", "plan"] as const).map((g) => {
            const l = list.filter((p) => (p.st.k === "now") === (g === "now"))
            if (!l.length) return null
            return (
              <div key={g}>
                <div className="lh">{g === "now" ? "Off now" : "Planned, next 14 days"}<span>{l.length}</span></div>
                {l.slice(0, 120).map((p) => {
                  const o = p.st.o!
                  return (
                    <button key={p.s.id} className={`it ${sel === p.s.id ? "sel" : ""}`} onClick={() => choose(p)}>
                      <i className={`sw ${p.st.k}`} />
                      <div style={{ minWidth: 0 }}><b>{p.s.name}</b><span>{p.s.suburb} {p.s.state} · {o.provider}</span></div>
                      {p.st.k === "now" ? <em className="now">Off now</em> : <em>{fmt(o.starts!, o.site.state, { weekday: "short", day: "numeric" })} · {o.hours ?? "?"} h</em>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </section>

      <section className="mp-map">
        {loadError && <div className="loading">The map couldn't load.</div>}
        {isLoaded && (
          <GoogleMap
            mapContainerClassName="gm"
            onLoad={(m) => setMap(m)}
            onIdle={() => { if (map) { setZoom(map.getZoom() ?? 4); setBounds(map.getBounds() ?? null) } }}
            onClick={() => setSel(null)}
            options={{ styles: WATTLE_MAP_STYLE, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy", clickableIcons: false, minZoom: 3 }}
          >
            {on.clear && pins.filter((p) => p.st.k === "clear").map((p) => {
              const ic = dotIcon("clear", false)
              return <Marker key={p.s.id} position={{ lat: p.s.lat, lng: p.s.lng }} title={p.s.name} onClick={() => setSel(p.s.id)}
                icon={{ url: ic.url, anchor: new google.maps.Point(ic.anchor, ic.anchor) }} zIndex={1} />
            })}
            {clusters.map((b) => {
              if (b.length === 1) {
                const p = b[0], ic = dotIcon(p.st.k, sel === p.s.id)
                return <Marker key={p.s.id} position={{ lat: p.s.lat, lng: p.s.lng }} title={p.s.name} onClick={() => setSel(p.s.id)}
                  icon={{ url: ic.url, anchor: new google.maps.Point(ic.anchor, ic.anchor) }} zIndex={10 + RANK[p.st.k]} />
              }
              const lat = b.reduce((a, p) => a + p.s.lat, 0) / b.length, lng = b.reduce((a, p) => a + p.s.lng, 0) / b.length
              const ic = clusterIcon(b.length, b.filter((p) => p.st.k === "long").length / b.length, b.filter((p) => p.st.k === "now").length)
              return <Marker key={b.map((p) => p.s.id).join()} position={{ lat, lng }} zIndex={20}
                title={`${b.length} sites`} icon={{ url: ic.url, anchor: new google.maps.Point(ic.anchor, ic.anchor) }}
                onClick={() => {
                  const bb = new google.maps.LatLngBounds()
                  b.forEach((p) => bb.extend({ lat: p.s.lat, lng: p.s.lng }))
                  map?.fitBounds(bb, 80)
                }} />
            })}
            {selPin && (
              <InfoWindow position={{ lat: selPin.s.lat, lng: selPin.s.lng }} onCloseClick={() => setSel(null)} options={{ pixelOffset: new google.maps.Size(0, -10) }}>
                <div className="mp-pop">
                  <b>{selPin.s.name}</b>
                  <div className="m">{selPin.s.address}</div>
                  <div className="m">{line(selPin.st, data.at)}</div>
                  {selPin.st.k === "long" && <span className="tag">Check fridge stock</span>}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}
        <div className="mp-legend glass">
          <span><i className="sw now" />Off now</span>
          <span><i className="sw long" />Planned, 4 hours or longer</span>
          <span><i className="sw soon" />Planned, shorter</span>
          <span><i className="sw clear" />All clear</span>
        </div>
        {noPin > 0 && <div className="mp-note glass">{noPin} sites have no map pin<Link href="/sites?tab=fix">Fix in Sites</Link></div>}
      </section>
    </main>
  )
}

function line(st: SiteState, at: string) {
  const o = st.o
  if (!o) return "No outages in the next 14 days"
  if (st.k === "now") return `${o.kind === "unplanned" ? "Fault" : "Planned work"} · ${since(o, at)} · ${o.ends ? "back " + time(o.ends, o.site.state) : "no restore time yet"}`
  return `${fmt(o.starts!, o.site.state, { weekday: "short", day: "numeric", month: "short" })} · ${time(o.starts!, o.site.state)} for ${o.hours ?? "?"} h · ${o.atSite ? "at the site" : "nearby"}`
}
