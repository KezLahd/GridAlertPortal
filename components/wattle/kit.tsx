"use client"

import { useEffect, useRef, useState } from "react"

// The app's own controls, for the web: the gold toggle, round page buttons, the round glass menu button, the dot map
// of Australia from Organisation's cover, and the "Powered by ArctIQ" line at the foot of a page.

/** Sites, Networks and Team: a gold glass thumb that slides in a glass track, each label with its count. */
export function GoldToggle<V extends string>({ value, options, onChange, label }: {
  value: V; options: { label: string; count?: number; value: V }[]; onChange: (v: V) => void; label: string
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className="gtg" role="tablist" aria-label={label} style={{ ["--n" as string]: options.length, ["--i" as string]: i }}>
      <i className="gtg-th" aria-hidden />
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}{o.count !== undefined && <small>{o.count}</small>}
        </button>
      ))}
    </div>
  )
}

export const PER = 25
export const slice = <T,>(l: T[], page: number) => l.slice(page * PER, (page + 1) * PER)

/** First and back, the pages round the one you're on (in a gold circle), then on and last; and what's showing. */
export function Pager({ page, total, noun, go }: { page: number; total: number; noun: string; go: (p: number) => void }) {
  const pages = Math.ceil(total / PER)
  if (pages <= 1) return null
  const p = Math.min(page, pages - 1)
  const from = Math.max(0, Math.min(p - 2, pages - 5)), nums = Array.from({ length: Math.min(5, pages) }, (_, k) => from + k)
  const arrow = (to: number, label: string, d: string) => (
    <button className="pg-a" disabled={to < 0 || to >= pages || to === p} onClick={() => go(to)} aria-label={label}>
      <svg viewBox="0 0 16 16" aria-hidden><path d={d} /></svg>
    </button>
  )
  return (
    <nav className="pg" aria-label={`Pages of ${noun}`}>
      <div className="pg-b">
        {arrow(0, "First page", "M8.5 4 4.5 8l4 4M12.5 4l-4 4 4 4")}
        {arrow(p - 1, "Previous page", "M10 4 6 8l4 4")}
        {nums.map((n) => <button key={n} className={`pg-n${n === p ? " on" : ""}`} aria-current={n === p ? "page" : undefined} onClick={() => go(n)}>{n + 1}</button>)}
        {arrow(p + 1, "Next page", "m6 4 4 4-4 4")}
        {arrow(pages - 1, "Last page", "m3.5 4 4 4-4 4M7.5 4l4 4-4 4")}
      </div>
      <div className="pg-s">Showing {p * PER + 1}–{Math.min((p + 1) * PER, total)} of {total} {noun}</div>
    </nav>
  )
}

/** A round glass button that opens a menu under it (the list's filters). Its icon turns gold while a filter is on. */
export function RoundMenu({ label, active, children }: { label: string; active?: boolean; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("pointerdown", out)
    document.addEventListener("keydown", key)
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", key) }
  }, [open])
  return (
    <div className="rmenu" ref={ref}>
      <button className={`rb glassy${active ? " act" : ""}`} aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 20 20" aria-hidden><path d="M4 6.5h12M6.5 10h7M9 13.5h2" /></svg>
      </button>
      {open && <div className="pkm rmenu-m" role="menu">{children(() => setOpen(false))}</div>}
    </div>
  )
}

/** A small heading inside a menu, like the app's picker titles. */
export const MenuHead = ({ children }: { children: React.ReactNode }) => <div className="pkh">{children}</div>

/** The foot of Dashboard, Planned and Organisation: "Powered by" and ArctIQ's wordmark, linking to their site. */
export function PoweredBy() {
  return (
    <a className="pby" href="https://arctiqservices.com.au" target="_blank" rel="noopener" aria-label="Powered by ArctIQ">
      <span>Powered by</span>
      <span className="aq" aria-hidden>
        <b>Arct</b><em>IQ<svg viewBox="0 0 10 10"><path d="M0 6.9A3.1 3.1 0 0 1 3.1 10M0 4.3A5.7 5.7 0 0 1 5.7 10M0 1.7A8.3 8.3 0 0 1 8.3 10" /></svg></em>
      </span>
    </a>
  )
}

// ---------- the dot map ----------

const MAINLAND: [number, number][] = [[113.6, -22.0], [114.2, -26.3], [115.0, -30.0], [115.7, -33.5], [115.0, -34.3], [117.9, -35.1], [120, -33.9], [123.5, -33.9], [126, -32.3], [129, -31.6], [131.1, -31.5], [134.2, -32.8], [135.9, -34.8], [137.7, -33.0], [137.8, -35.6], [139.6, -36.2], [140.6, -38.0], [143.5, -38.8], [145, -38.4], [146.3, -39.1], [147.9, -37.9], [149.9, -37.5], [150.1, -36.2], [151.2, -33.9], [152.5, -32.4], [153.6, -28.2], [153.1, -25.3], [151.0, -23.5], [149.3, -21.5], [146.3, -19.0], [145.4, -16.4], [145.3, -14.9], [143.8, -14.0], [143.5, -12.5], [142.5, -10.7], [141.6, -12.7], [141.6, -15.0], [141.2, -17.0], [140.0, -17.7], [137.7, -16.2], [135.9, -15.0], [136.8, -12.2], [136.0, -11.9], [132.6, -11.5], [131.0, -12.2], [129.6, -14.9], [128.3, -14.9], [127.0, -13.8], [125.1, -14.6], [123.6, -16.3], [122.2, -18.0], [121.0, -19.5], [119.0, -20.0], [116.7, -20.6], [114.6, -21.8]]
const TASMANIA: [number, number][] = [[144.6, -40.7], [148.3, -40.9], [148.3, -42.2], [147.0, -43.6], [145.2, -42.2]]
const inside = (x: number, y: number, poly: [number, number][]) => {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
const land = (lon: number, lat: number) => inside(lon, lat, MAINLAND) || inside(lon, lat, TASMANIA)

/** Australia as a grid of faint dots; a dot glows gold where you have a site, brighter where one is without power.
 *  The sites bloom in west to east when the page opens (all at once with Reduce Motion on). */
export function AusDots({ sites }: { sites: { lat: number; lng: number; out: boolean }[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = sites.map((s) => `${s.lat.toFixed(2)},${s.lng.toFixed(2)},${+s.out}`).join("|")
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext("2d")!
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    const t0 = performance.now()
    let raf = 0
    const draw = (now: number) => {
      const lit = still ? 1 : Math.min(1, (now - t0 - 250) / 1600)
      const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const foot = 14, H = h - foot
      const lonSpan = 154.5 - 112.5, latSpan = 44 - 10.3
      const k = Math.min(H / latSpan, w / lonSpan), x0 = (w - lonSpan * k) / 2, y0 = (H - latSpan * k) / 2
      const step = 7, cols = Math.floor(w / step), rows = Math.floor(H / step)
      const at = new Map<number, boolean>()
      for (const s of sites) {
        const i = Math.floor((x0 + (s.lng - 112.5) * k) / step), j = Math.floor((y0 + (-10.3 - s.lat) * k) / step)
        if (i < 0 || j < 0 || i >= cols || j >= rows) continue
        at.set(j * 1000 + i, (at.get(j * 1000 + i) ?? false) || s.out)
      }
      ctx.fillStyle = "rgba(255,255,255,.2)"
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const px = (i + 0.5) * step, py = (j + 0.5) * step
        if (at.has(j * 1000 + i) || land((px - x0) / k + 112.5, -10.3 - (py - y0) / k)) { ctx.beginPath(); ctx.arc(px, py, 1.3, 0, 7); ctx.fill() }
      }
      for (const [key, out] of at) {
        const i = key % 1000, j = Math.floor(key / 1000), px = (i + 0.5) * step, py = (j + 0.5) * step
        const jit = ((i * 73856093) ^ (j * 19349663)) & 1023
        const delay = ((i / Math.max(cols, 1)) * 0.8 + (jit / 1023) * 0.2) * 0.58
        const a = Math.max(0, Math.min(1, (lit - delay) / 0.42))
        if (a <= 0) continue
        const swell = 1 + 0.9 * Math.sin(a * Math.PI)
        ctx.fillStyle = `rgba(242,179,0,${(out ? 0.35 : 0.2) * (0.4 + 0.6 * a)})`
        ctx.beginPath(); ctx.arc(px, py, (out ? 11 : 6.5) * swell, 0, 7); ctx.fill()
        ctx.fillStyle = out ? "#FFE9A8" : "#F2B300"
        ctx.beginPath(); ctx.arc(px, py, (out ? 3 : 2.5) * (1 + 0.35 * Math.sin(a * Math.PI)), 0, 7); ctx.fill()
      }
      if (lit < 1) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw) })
    ro.observe(cv)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return <canvas ref={ref} className="ausdots" aria-hidden />
}
