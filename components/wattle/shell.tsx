"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { usePortal } from "./data"

// The portal's frame: a cream rail on the left with the four places (like the iPhone app's tabs), which becomes a
// floating glass tab bar along the bottom on a phone.

const NAV = [
  { href: "/overview", label: "Overview", icon: <path d="M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-3H4zM14 4v3h6V4z" /> },
  { href: "/map", label: "Map", icon: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" /> },
  { href: "/sites", label: "Sites", icon: <path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6" />, count: true },
  { href: "/organisation", label: "Organisation", icon: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2" /></> },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const { data, me } = usePortal()
  const initials = me ? `${me.firstName[0] ?? ""}${me.lastName[0] ?? ""}`.toUpperCase() || "?" : ""
  return (
    <div className="wt">
      <aside className="rail">
        <Link href="/overview" className="brand" aria-label="Wattle">
          <span className="mk"><img src="/wattle-icon.svg" alt="" /></span>
          <img className="wm" src="/wattle-wordmark.svg" alt="Wattle" />
        </Link>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path?.startsWith(n.href) ? "on" : ""} aria-label={n.label}>
              <svg viewBox="0 0 24 24">{n.icon}</svg>
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
