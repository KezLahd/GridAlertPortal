"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { usePortal } from "./data"

// The portal's frame: a rail on the left with the four places and the app's own tab icons, which becomes a floating
// glass tab bar along the bottom on a phone. Light or dark follows the device, like the app. The Aurora, gold light
// drifting behind each page's title, is the same one as in the app.

// The four icons are the app's own tab icons (dots like a wattle flower), plus Sites drawn the same way.
const C = (cx: number, cy: number, r: number) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" />
const line = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const
const NAV = [
  { href: "/overview", label: "Dashboard", icon: <>{[[14, 14, 3.1], [14, 6.6, 2.35], [19.7, 4.13, 1.45], [20.41, 10.3, 2.35], [25.4, 14, 1.45], [20.41, 17.7, 2.35], [19.7, 23.87, 1.45], [14, 21.4, 2.35], [8.3, 23.87, 1.45], [7.59, 17.7, 2.35], [2.6, 14, 1.45], [7.59, 10.3, 2.35], [8.3, 4.13, 1.45]].map(([x, y, r]) => C(x, y, r))}</> },
  { href: "/map", label: "Map", icon: <><path {...line} d="M14 25.2C14 25.2 6 18 6 11.8a8 8 0 0 1 16 0C22 18 14 25.2 14 25.2Z" />{C(14, 11.8, 3)}</> },
  { href: "/sites", label: "Sites", icon: <><path {...line} d="M11 7h12M11 14h12M11 21h8" />{C(5.6, 7, 2.3)}{C(5.6, 14, 1.6)}{C(5.6, 21, 1.6)}</>, count: true },
  { href: "/organisation", label: "Organisation", icon: <><path {...line} d="M7 24.5V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v17.5M3.8 24.5h20.4M12 24.5v-3a2 2 0 0 1 4 0v3" />{C(11.3, 9.4, 1.45)}{C(16.7, 9.4, 1.45)}{C(11.3, 14.4, 1.45)}{C(16.7, 14.4, 1.45)}</> },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const { data, me } = usePortal()
  const initials = me ? `${me.firstName[0] ?? ""}${me.lastName[0] ?? ""}`.toUpperCase() || "?" : ""
  return (
    <div className="wt">
      <Aurora />
      <aside className="rail">
        <Link href="/overview" className="brand" aria-label="Wattle">
          <span className="mk"><img src="/wattle-mark-small.svg" alt="" /></span>
          <img className="wm" src="/wattle-wordmark.svg" alt="Wattle" />
        </Link>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path?.startsWith(n.href) ? "on" : ""} aria-label={n.label}>
              <svg viewBox="0 0 28 28" aria-hidden>{n.icon}</svg>
              <span className="l">{n.label}</span>
              {n.count && data && <span className="n">{data.summary.sites}</span>}
            </Link>
          ))}
        </nav>
        <div className="foot">
          <div className="av">{initials}</div>
          <div style={{ minWidth: 0 }}><b>{me?.firstName}</b><br />{data?.company}</div>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }}>Sign out</button>
        </div>
      </aside>
      {children}
    </div>
  )
}

export function Loading({ error }: { error?: string | null }) {
  return <main><div className="loading">{error ?? "Loading your sites…"}</div></main>
}

/** Gold curtains of light behind the page title, ported from the app's AuroraView. Still when Reduce Motion is on. */
function Aurora() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext("2d")!
    const dark = matchMedia("(prefers-color-scheme: dark)"), still = matchMedia("(prefers-reduced-motion: reduce)")
    let raf = 0, last = 0
    const bands = [[0.62, 0, 0.1, "242,179,0"], [0.7, 2.1, 0.07, "201,118,26"], [0.78, 4.2, 0.05, "242,179,0"]] as const
    const draw = (now: number) => {
      raf = still.matches ? 0 : requestAnimationFrame(draw)
      if (now - last < 33 && raf) return
      last = now
      const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = dark.matches ? "lighter" : "source-over"
      const t = still.matches ? 0 : now / 1000
      bands.forEach(([base, ph, a0, rgb], k) => {
        const a = a0 * (dark.matches ? 1.2 : 1.5)
        for (let x = -4; x <= w + 4; x += 3) {
          const y = h * base + 18 * Math.sin(x * 0.012 + t * 0.35 + ph) + 6 * Math.sin(x * 0.031 - t * 0.2 + ph)
          const len = 60 + 24 * Math.sin(x * 0.05 + t * 0.6 + k)
          const g = ctx.createLinearGradient(0, y - len, 0, y)
          g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.8, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`)
          ctx.fillStyle = g
          ctx.fillRect(x, y - len, 3.2, len)
        }
      })
    }
    raf = requestAnimationFrame(draw)
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(draw) }
    document.addEventListener("visibilitychange", vis)
    dark.addEventListener("change", vis); still.addEventListener("change", vis)
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", vis); dark.removeEventListener("change", vis); still.removeEventListener("change", vis) }
  }, [])
  return <canvas ref={ref} className="aurora" aria-hidden />
}
