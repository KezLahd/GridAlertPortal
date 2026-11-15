"use client"

import { useEffect, useRef, useState } from "react"

// A pull-down like the Mac's: a quiet field (small label over the current choice, chevron at the end) that opens a
// menu of options with ticks and counts. Used for the map's filters instead of rows of pills.

export function Pick({ label, value, active, wide, children }: {
  label: string; value: string; active?: boolean; wide?: boolean; children: (close: () => void) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); ref.current?.querySelector<HTMLButtonElement>(".pkb")?.focus() }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>(".pko") ?? [])]
        const i = items.indexOf(document.activeElement as HTMLButtonElement)
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus()
        e.preventDefault()
      }
    }
    document.addEventListener("pointerdown", out)
    document.addEventListener("keydown", key)
    ref.current?.querySelector<HTMLButtonElement>(".pko.on, .pko")?.focus()
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", key) }
  }, [open])
  return (
    <div className={`pk${open ? " open" : ""}${active ? " act" : ""}${wide ? " wide" : ""}`} ref={ref}>
      <button className="pkb" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <small>{label}</small>
        <span>{value}</span>
        <svg viewBox="0 0 12 12" aria-hidden><path d="M3 4.5 6 7.5 9 4.5" /></svg>
      </button>
      {open && <div className="pkm glass" role="menu">{children(() => setOpen(false))}</div>}
    </div>
  )
}

/** One choice in a Pick menu. `check` options stay open when clicked (several can be on); radio ones close it. */
export function Opt({ on, n, check, sw, hint, onPick, children }: {
  on: boolean; n?: number; check?: boolean; sw?: React.ReactNode; hint?: string; onPick: () => void; children: React.ReactNode
}) {
  return (
    <button className={`pko${on ? " on" : ""}`} role={check ? "menuitemcheckbox" : "menuitemradio"} aria-checked={on} onClick={onPick}>
      <i className={check ? "bx" : "tk"} aria-hidden />
      {sw}
      <span>{children}{hint && <small>{hint}</small>}</span>
      {n !== undefined && <em>{n}</em>}
    </button>
  )
}

export const Sep = () => <hr className="pks" />
