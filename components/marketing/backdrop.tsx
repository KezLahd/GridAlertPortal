// Depth behind a section: a fine dot grid and a set of contour lines, each drifting at its own speed as the page
// scrolls (from --p, the section's progress, or --sy, the page's scroll), so the content in front reads as nearer.
// Both fade out towards their edges, so nothing ends on a hard line.

import styles from "./backdrop.module.css"

// wobbly rings, like the contour lines on a topographic map; fixed numbers so the server and browser draw the same
const RINGS = Array.from({ length: 11 }, (_, k) => {
  const r = 70 + k * 46
  const pts = Array.from({ length: 72 }, (_, j) => {
    const a = (j / 72) * Math.PI * 2
    const w = 1 + 0.07 * Math.sin(3 * a + k * 0.7) + 0.045 * Math.sin(5 * a - k * 1.3) + 0.03 * Math.sin(8 * a + k)
    return `${(600 + Math.cos(a) * r * w * 1.15).toFixed(1)} ${(600 + Math.sin(a) * r * w).toFixed(1)}`
  })
  return `M${pts.join("L")}Z`
})

export function Backdrop({ className = "", by = "p" }: { className?: string; by?: "p" | "sy" }) {
  return (
    <div className={`${styles.backdrop} ${by === "sy" ? styles.bySy : styles.byP} ${className}`} aria-hidden>
      <div className={styles.dots} />
      <svg className={styles.contours} viewBox="0 0 1200 1200" preserveAspectRatio="xMidYMid slice">
        {RINGS.map((d, i) => <path key={i} d={d} />)}
      </svg>
    </div>
  )
}
