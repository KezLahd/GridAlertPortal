"use client"

// While data is on its way. Kez hates grey skeleton bars, so the placeholders are made of the app's own dots: rows of
// faint dots that light up gold in a slow wave, shaped like the rows they stand in for, and a breathing dot where a
// number will go. Still when Reduce Motion is on.

/** A breathing dot where a number will appear. */
export const Wait = () => <i className="wait" aria-hidden />

/** Rows of dots shaped like list rows: a ring where the time ring goes, then a name line and a detail line. */
export function GhostRows({ rows = 5, ring = true, label }: { rows?: number; ring?: boolean; label?: string }) {
  return (
    <div className="ghost" role="status" aria-label={label ?? "Loading"}>
      {Array.from({ length: rows }, (_, r) => {
        const a = [13, 9, 15, 11, 12, 8][r % 6], b = [21, 17, 24, 19, 16, 22][r % 6]
        const at = (j: number) => ({ animationDelay: `${r * 140 + j * 40}ms` })
        return (
          <div className="gr" key={r}>
            {ring && <i className="gring" style={at(0)} />}
            <div>
              <div className="gl">{Array.from({ length: a }, (_, j) => <i key={j} style={at(j)} />)}</div>
              <div className="gl sm">{Array.from({ length: b }, (_, j) => <i key={j} style={at(j + 3)} />)}</div>
            </div>
          </div>
        )
      })}
      {label && <div className="gnote">{label}</div>}
    </div>
  )
}
