"use client"

// Apple MapKit JS version of the portal map, the same props as the Google one in map.tsx. It's used when
// NEXT_PUBLIC_MAP_PROVIDER=apple and /api/mapkit-token can sign tokens (see that route for the env vars).
// Pins: unplanned gold, planned under way ink with a gold glyph, planned ahead stone; your sites ink.

import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    mapkit?: any
    __wattleMapkit?: Promise<any>
  }
}

type LatLng = { lat: number; lng: number }

interface PoiLocation {
  id: string
  poi_name: string
  latitude: number | string
  longitude: number | string
  street_address?: string
  city?: string
  state?: string
  postcode?: string
  provider?: string | null
}

export interface AppleMapProps {
  outages: any[]
  outageType: "unplanned" | "planned" | "future"
  searchQuery?: string
  selectedOutageId?: string | number | null
  selectedPoiId?: string | null
  companyCenter?: LatLng | null
  companyLocation?: { lat: number; lng: number; name?: string; userCount?: number } | null
  poiLocations?: PoiLocation[]
  showPoiMarkers?: boolean
  showPolygons?: boolean
  showServiceAreas?: boolean
  serviceAreas?: Array<{ provider: string; geojson: any; feature_id?: number; color_hex?: string }>
}

const GOLD = "#F2B300"
const INK = "#24211C"
const STONE = "#9C9588"
const SYDNEY: LatLng = { lat: -33.8688, lng: 151.2093 }

const pinStyle = {
  unplanned: { color: GOLD, glyphColor: INK },
  planned: { color: INK, glyphColor: GOLD },
  future: { color: STONE, glyphColor: "#FFFFFF" },
} as const

/** Loads MapKit JS once and initialises it with tokens from our own route. */
function loadMapkit(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  if (window.__wattleMapkit) return window.__wattleMapkit
  window.__wattleMapkit = new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.core.js"
    s.crossOrigin = "anonymous"
    s.async = true
    s.dataset.libraries = "map,annotations,overlays,services"
    s.dataset.callback = "__wattleMapkitReady"
    ;(window as any).__wattleMapkitReady = () => {
      const mk = window.mapkit
      mk.init({
        authorizationCallback: (done: (t: string) => void) => {
          fetch("/api/mapkit-token", { cache: "no-store" })
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`token ${r.status}`))))
            .then(done)
            .catch(reject)
        },
        language: "en-AU",
      })
      resolve(mk)
    }
    s.onerror = () => reject(new Error("MapKit JS failed to load"))
    document.head.appendChild(s)
  })
  return window.__wattleMapkit
}

const num = (v: any) => (typeof v === "string" ? Number.parseFloat(v) : Number(v))
const outageId = (o: any) => String(o.incident_id || o.webid || o.id || o.event_id || o.outage_id || "")

/** GeoJSON Polygon / MultiPolygon / Feature(Collection) → rings of {lat,lng}. */
function rings(geo: any): LatLng[][] {
  if (!geo) return []
  let g = geo
  if (typeof g === "string") {
    try { g = JSON.parse(g) } catch { return [] }
  }
  const ring = (cs: any[]) => cs.filter((c) => Array.isArray(c) && c.length >= 2).map((c) => ({ lat: Number(c[1]), lng: Number(c[0]) }))
  switch (g.type) {
    case "FeatureCollection": return (g.features || []).flatMap((f: any) => rings(f))
    case "Feature": return rings(g.geometry)
    case "Polygon": return g.coordinates?.[0] ? [ring(g.coordinates[0])] : []
    case "MultiPolygon": return (g.coordinates || []).map((p: any) => ring(p[0] || []))
    case "GeometryCollection": return (g.geometries || []).flatMap((x: any) => rings(x))
    default: return []
  }
}

const when = (v: any) => {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
}

export default function AppleMap(props: AppleMapProps) {
  const {
    outages, outageType, searchQuery = "", selectedOutageId, selectedPoiId, companyCenter, companyLocation,
    poiLocations = [], showPoiMarkers = false, showPolygons = false, showServiceAreas = false, serviceAreas = [],
  } = props
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const byId = useRef<Record<string, any>>({})
  const [mk, setMk] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // create the map once
  useEffect(() => {
    let alive = true
    loadMapkit()
      .then((m) => {
        if (!alive || !el.current || map.current) return
        const c = companyCenter ?? SYDNEY
        map.current = new m.Map(el.current, {
          center: new m.Coordinate(c.lat, c.lng),
          showsPointsOfInterest: false,
          showsCompass: m.FeatureVisibility.Adaptive,
          showsZoomControl: true,
          showsMapTypeControl: false,
          colorScheme: m.Map.ColorSchemes.Light,
          tintColor: GOLD,
          isRotationEnabled: false,
        })
        map.current.cameraDistance = 60000
        setMk(m)
      })
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
      map.current?.destroy?.()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // annotations and overlays follow the data
  useEffect(() => {
    const m = map.current
    if (!mk || !m) return
    m.removeAnnotations(m.annotations)
    m.removeOverlays(m.overlays)
    byId.current = {}

    const q = searchQuery.trim().toLowerCase()
    const shown = outages.filter((o) => {
      if (Number.isNaN(num(o.latitude)) || Number.isNaN(num(o.longitude))) return false
      if (!q) return true
      return [o.area_suburb, o.streets_affected, o.cause, o.reason, o.status, o.provider, o.state]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    })

    const style = pinStyle[outageType]
    const annotations = shown.map((o) => {
      const start = when(o.start_date_time || o.start_time)
      const end = when(o.estimated_finish_time || o.end_date_time)
      const a = new mk.MarkerAnnotation(new mk.Coordinate(num(o.latitude), num(o.longitude)), {
        title: o.area_suburb || o.geocoded_address || o.provider || "Outage",
        subtitle: [o.provider, o.reason || o.cause, start && end ? `${start} – ${end}` : start || (end && `Back ${end}`),
                   o.customers_affected ? `${o.customers_affected} customers` : null].filter(Boolean).join(" · "),
        color: style.color,
        glyphColor: style.glyphColor,
        glyphText: "",
        clusteringIdentifier: "outages",
        displayPriority: 500,
      })
      byId.current[`o:${outageId(o)}`] = a
      return a
    })

    if (showPoiMarkers) {
      for (const p of poiLocations) {
        const lat = num(p.latitude), lng = num(p.longitude)
        if (Number.isNaN(lat) || Number.isNaN(lng)) continue
        const a = new mk.MarkerAnnotation(new mk.Coordinate(lat, lng), {
          title: p.poi_name,
          subtitle: [p.street_address, p.city, p.state].filter(Boolean).join(", "),
          color: INK,
          glyphColor: GOLD,
          glyphText: "●",
          displayPriority: 1000,
        })
        byId.current[`p:${p.id}`] = a
        annotations.push(a)
      }
    }
    if (companyLocation) {
      annotations.push(new mk.MarkerAnnotation(new mk.Coordinate(companyLocation.lat, companyLocation.lng), {
        title: companyLocation.name || "Head office",
        subtitle: companyLocation.userCount ? `${companyLocation.userCount} people` : undefined,
        color: INK, glyphColor: "#F3EEE4", glyphText: "★", displayPriority: 1000,
      }))
    }
    m.addAnnotations(annotations)

    const overlays: any[] = []
    if (showPolygons) {
      for (const o of shown) {
        for (const r of rings(o.polygon_geojson)) {
          if (r.length < 3) continue
          overlays.push(new mk.PolygonOverlay(r.map((c) => new mk.Coordinate(c.lat, c.lng)), {
            style: new mk.Style({ fillColor: style.color, fillOpacity: outageType === "unplanned" ? 0.28 : 0.16,
                                  strokeColor: outageType === "future" ? STONE : "#C98F00", lineWidth: 1.5,
                                  lineDash: outageType === "unplanned" ? [] : [5, 4] }),
          }))
        }
      }
    }
    if (showServiceAreas) {
      for (const area of serviceAreas) {
        const color = area.color_hex || STONE
        for (const r of rings(area.geojson)) {
          if (r.length < 3) continue
          overlays.push(new mk.PolygonOverlay(r.map((c) => new mk.Coordinate(c.lat, c.lng)), {
            style: new mk.Style({ fillColor: color, fillOpacity: 0.08, strokeColor: color, strokeOpacity: 0.6, lineWidth: 1 }),
          }))
        }
      }
    }
    if (overlays.length) m.addOverlays(overlays)
  }, [mk, outages, outageType, searchQuery, poiLocations, showPoiMarkers, showPolygons, showServiceAreas, serviceAreas, companyLocation])

  // follow the company centre
  useEffect(() => {
    if (!mk || !map.current || !companyCenter) return
    map.current.setCenterAnimated(new mk.Coordinate(companyCenter.lat, companyCenter.lng))
  }, [mk, companyCenter])

  // selection from the list or search
  useEffect(() => {
    if (!mk || !map.current) return
    const key = selectedPoiId ? `p:${selectedPoiId}` : selectedOutageId != null ? `o:${selectedOutageId}` : null
    const a = key ? byId.current[key] : null
    if (!a) return
    const span = selectedPoiId ? 0.01 : 0.2
    map.current.setRegionAnimated(new mk.CoordinateRegion(a.coordinate, new mk.CoordinateSpan(span, span)))
    map.current.selectedAnnotation = a
  }, [mk, selectedOutageId, selectedPoiId, outages, poiLocations])

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F3EEE3] p-6 text-center text-sm text-[#6F685C]">
        The map couldn&apos;t load ({error}). Check the MapKit key settings.
      </div>
    )
  }
  return <div ref={el} className="h-full w-full" aria-label="Map of outages and your sites" />
}
