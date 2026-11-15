"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api"
import { googleMapsApiKey } from "@/lib/config"
import { WATTLE_MAP_STYLE, WATTLE_MAP_STYLE_DARK } from "@/lib/map-style"
import { Loading } from "@/components/wattle/shell"
import { checked, fmt, since, time, useDark, usePortal, type Site, type SiteState } from "@/components/wattle/data"

// Map: every site on an Apple-style Google map (light or dark to match the page). Solid gold = power off now, a gold
// ring = planned in the next 14 days (thicker for 4 hours or longer), grey = all clear. Close sites group into a dark
// circle with the count, a gold arc for the share running 4h+, and a gold badge for any that are off now. The list beside it follows the view.

const libraries: ("places" | "geometry" | "drawing")[] = ["places"]
const VIEWS: Record<string, [number, number, number, number]> = {
  Australia: [112.5, -44, 154, -10.5], Sydney: [150.55, -34.15, 151.45, -33.55], Melbourne: [144.6, -38.25, 145.6, -37.6],
  Brisbane: [152.8, -27.75, 153.35, -27.2], Adelaide: [138.4, -35.15, 138.9, -34.7], Perth: [115.65, -32.6, 116.1, -31.8],
  Canberra: [148.95, -35.45, 149.25, -35.2],
}
const COL = { now: "#F2B300", long: "#F2B300", soon: "#F2B300", clear: "#A8A196" }
const RANK = { now: 3, long: 2, soon: 1, clear: 0 }
type Pin = { s: Site & { lat: number; lng: number }; st: SiteState }

// Who looks after the power where. public/network-areas.json covers all of Australia: the networks' own outlines where
// we hold them, hand-traced areas (marked approx) for CitiPower, United Energy and Western Power, and the rest of each
// state for its remaining network. Coastlines and state borders: geoBoundaries (CC BY 4.0). A soft tint per network, a name label where it fits, and the name on hover or tap.
const NET_C: Record<string, string> = {
  "Ausgrid": "#3B7FC4", "Endeavour Energy": "#2E9E6B", "Essential Energy": "#8A6FD1", "Evoenergy": "#D9467A",
  "Energex": "#D9467A", "Ergon Energy": "#1F9DA3", "Jemena": "#C0563A", "CitiPower": "#D9467A", "AusNet Services": "#6C8A3A",
  "United Energy": "#3B7FC4", "Powercor": "#8A6FD1", "Western Power": "#3B7FC4", "Horizon Power": "#C0563A",
  "SA Power Networks": "#2E9E6B", "TasNetworks": "#1F9DA3", "Power and Water": "#6C8A3A",
}
type NetLabel = { name: string; at: [number, number]; z: number; approx: boolean }
function netLabel(name: string, dark: boolean, c?: string) {
  const w = Math.round(name.length * 6.6 + 22), h = 22
  return { url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="11" fill="${dark ? "#1D1A16" : "#FFFFFF"}" fill-opacity=".9" stroke="${c ?? (dark ? "#3A342B" : "#D9D2C3")}"/>${c ? `<circle cx="11" cy="11" r="3.5" fill="${c}"/>` : ""}<text x="${c ? 19 : 11}" y="15" font-family="ui-rounded,-apple-system,system-ui,sans-serif" font-weight="700" font-size="11" fill="${dark ? "#F3EEE4" : "#24211C"}">${name}</text></svg>`), w, h }
}

// Dots like the app's: off now is solid gold with a soft bloom, planned is a gold ring (thicker for 4 hours or more),
// all clear is a small grey dot.
const svgUrl = (svg: string) => "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg)
function dotIcon(k: keyof typeof COL, sel: boolean, dark: boolean) {
  const bg = dark ? "#12100D" : "#FFFFFF", edge = dark ? "#12100D" : "#FFFFFF"
  if (k === "clear") {
    const size = 14, c = 7
    return { url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${c}" cy="${c}" r="${sel ? 6 : 4.5}" fill="${dark ? "#6F685C" : COL.clear}" stroke="${edge}" stroke-width="1.5"/></svg>`), size, anchor: c }
  }
  if (k === "now") {
    const size = 44, c = 22, r = sel ? 9.5 : 8
    return { url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><radialGradient id="b"><stop offset="0" stop-color="#F2B300" stop-opacity=".55"/><stop offset="1" stop-color="#F2B300" stop-opacity="0"/></radialGradient></defs><circle cx="${c}" cy="${c}" r="21" fill="url(#b)"/><circle cx="${c}" cy="${c}" r="${r}" fill="#F2B300" stroke="${sel ? (dark ? "#F3EEE4" : "#24211C") : edge}" stroke-width="${sel ? 3 : 2}"/></svg>`), size, anchor: c }
  }
  const r = sel ? 9 : 7.5, w = k === "long" ? 3.4 : 2, size = r * 2 + 10, c = size / 2
  return { url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${c}" cy="${c}" r="${r + 1.5}" fill="${edge}" opacity=".9"/><circle cx="${c}" cy="${c}" r="${r - w / 2}" fill="${bg}" stroke="#F2B300" stroke-width="${w}"/>${sel ? `<circle cx="${c}" cy="${c}" r="2.6" fill="#F2B300"/>` : ""}</svg>`), size, anchor: c }
}
function clusterIcon(n: number, longShare: number, nNow: number, dark: boolean) {
  const r = Math.min(13 + Math.sqrt(n) * 3.2, 30), pad = 12, size = (r + pad) * 2, c = size / 2, rr = r - 3
  const a = longShare * Math.PI * 2
  const arc = longShare >= 1 ? `<circle cx="${c}" cy="${c}" r="${rr}" fill="none" stroke="#F2B300" stroke-width="3"/>`
    : longShare > 0 ? `<path d="M${c},${c - rr}A${rr},${rr} 0 ${a > Math.PI ? 1 : 0} 1 ${c + rr * Math.sin(a)},${c - rr * Math.cos(a)}" fill="none" stroke="#F2B300" stroke-width="3" stroke-linecap="round"/>` : ""
  const bx = c + r * 0.72, by = c - r * 0.72
  const disc = dark ? "#2F2A23" : "#24211C", txt = dark ? "#F3EEE4" : "#FBF8F2"
  const badge = nNow ? `<circle cx="${bx}" cy="${by}" r="9" fill="#F2B300" stroke="${dark ? "#12100D" : "#FFFFFF"}" stroke-width="2"/><text x="${bx}" y="${by + 4}" text-anchor="middle" font-family="ui-rounded,-apple-system,system-ui,sans-serif" font-weight="700" font-size="11" fill="#24211C">${nNow}</text>` : ""
  return { url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${c}" cy="${c}" r="${r + 5}" fill="${nNow ? "#F2B300" : disc}" opacity="${nNow ? ".22" : ".12"}"/><circle cx="${c}" cy="${c}" r="${r}" fill="${disc}"/>${arc}<text x="${c}" y="${c + 5}" text-anchor="middle" font-family="ui-rounded,-apple-system,system-ui,sans-serif" font-weight="700" font-size="${r > 20 ? 15 : 13}" fill="${txt}">${n}</text>${badge}</svg>`), size, anchor: c }
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
  const dark = useDark()
  const [nets, setNets] = useState(true)
  const netsLoaded = useRef(false)
  const [labels, setLabels] = useState<NetLabel[]>([])
  const [net, setNet] = useState<string | null>(null)

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

  // network areas: loaded once onto the map's data layer, tinted per network, highlighted on hover or tap
  useEffect(() => {
    if (!map || netsLoaded.current) return
    netsLoaded.current = true
    {
      fetch("/network-areas.json").then((r) => r.json()).then((fc) => {
        map.data.addGeoJson(fc)
        setLabels(fc.features.filter((f: any) => f.properties.label).map((f: any) => ({ name: f.properties.name, at: f.properties.label, z: f.properties.z, approx: f.properties.approx })))
      }).catch(() => {})
      const which = (f: google.maps.Data.Feature) => f.getProperty("kind") === "edge" ? `${f.getProperty("a")}|${f.getProperty("b")}` : String(f.getProperty("name"))
      map.data.addListener("mouseover", (e: google.maps.Data.MouseEvent) => setNet(which(e.feature)))
      map.data.addListener("mouseout", () => setNet(null))
      map.data.addListener("click", (e: google.maps.Data.MouseEvent) => { setSel(null); setNet(which(e.feature)) })
    }
  }, [map])
  useEffect(() => {
    if (!map) return
    map.data.setStyle((f) => {
      if (f.getProperty("kind") === "edge") {
        const hot = net === `${f.getProperty("a")}|${f.getProperty("b")}`
        return { visible: nets, fillColor: dark ? "#F3EEE4" : "#24211C", fillOpacity: hot ? 0.16 : 0.05, strokeWeight: 0, zIndex: 1 }
      }
      const n = String(f.getProperty("name")), c = NET_C[n] ?? "#888", hot = n === net
      return { visible: nets, fillColor: c, fillOpacity: hot ? 0.16 : 0.04, strokeColor: c, strokeOpacity: hot ? 0.9 : 0.5, strokeWeight: hot ? 2 : 1.2, zIndex: 0 }
    })
  }, [map, nets, net, dark])

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
            options={{ styles: dark ? WATTLE_MAP_STYLE_DARK : WATTLE_MAP_STYLE, backgroundColor: dark ? "#24252A" : "#F4F2EE", disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy", clickableIcons: false, minZoom: 3 }}
          >
            {on.clear && pins.filter((p) => p.st.k === "clear").map((p) => {
              const ic = dotIcon("clear", false, dark)
              return <Marker key={p.s.id} position={{ lat: p.s.lat, lng: p.s.lng }} title={p.s.name} onClick={() => setSel(p.s.id)}
                icon={{ url: ic.url, anchor: new google.maps.Point(ic.anchor, ic.anchor) }} zIndex={1} />
            })}
            {clusters.map((b) => {
              if (b.length === 1) {
                const p = b[0], ic = dotIcon(p.st.k, sel === p.s.id, dark)
                return <Marker key={p.s.id} position={{ lat: p.s.lat, lng: p.s.lng }} title={p.s.name} onClick={() => setSel(p.s.id)}
                  icon={{ url: ic.url, anchor: new google.maps.Point(ic.anchor, ic.anchor) }} zIndex={10 + RANK[p.st.k]} />
              }
              const lat = b.reduce((a, p) => a + p.s.lat, 0) / b.length, lng = b.reduce((a, p) => a + p.s.lng, 0) / b.length
              const ic = clusterIcon(b.length, b.filter((p) => p.st.k === "long").length / b.length, b.filter((p) => p.st.k === "now").length, dark)
              return <Marker key={b.map((p) => p.s.id).join()} position={{ lat, lng }} zIndex={20}
                title={`${b.length} sites`} icon={{ url: ic.url, anchor: new google.maps.Point(ic.anchor, ic.anchor) }}
                onClick={() => {
                  const bb = new google.maps.LatLngBounds()
                  b.forEach((p) => bb.extend({ lat: p.s.lat, lng: p.s.lng }))
                  map?.fitBounds(bb, 80)
                }} />
            })}
            {nets && labels.filter((l) => zoom >= l.z && zoom <= 10).map((l) => {
              const ic = netLabel(l.name, dark, NET_C[l.name])
              return <Marker key={`net-${l.name}`} position={{ lat: l.at[0], lng: l.at[1] }} clickable={false} zIndex={2}
                icon={{ url: ic.url, anchor: new google.maps.Point(ic.w / 2, ic.h / 2) }} />
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
          {nets && <small className="src">Network areas are a guide; the shaded edges could be either network. Coastlines: geoBoundaries, CC BY 4.0.</small>}
        </div>
        <div className="mp-net">
          <button className={`glass ${nets ? "on" : ""}`} onClick={() => { setNets(!nets); setNet(null) }}><i />Network areas</button>
          {nets && net && (net.includes("|")
            ? <span className="glass"><i style={{ background: NET_C[net.split("|")[0]] }} /><i style={{ background: NET_C[net.split("|")[1]], marginLeft: -4 }} />Could be {net.split("|")[0]} or {net.split("|")[1]}. The border here isn&apos;t certain; each site&apos;s details show its real network.</span>
            : <span className="glass"><i style={{ background: NET_C[net] }} />{net} looks after the power here{labels.find((l) => l.name === net)?.approx ? " (area approximate)" : ""}</span>)}
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
