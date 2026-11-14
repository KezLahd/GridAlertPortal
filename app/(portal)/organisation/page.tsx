"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ConnectionsPanel } from "@/components/connections-panel"
import { InviteUserDialog } from "@/components/invite-user-dialog"
import { Loading } from "@/components/wattle/shell"
import { useToast } from "@/components/wattle/site-dialogs"
import { fmt, headers, plural, usePortal } from "@/components/wattle/data"

// Organisation: who's in the company, your own audit emails and alerts, and (for admins) connections and invites.
// Settings sit in labelled rows on hairlines. Older settings (company details, icons, member edits) stay on /profile.

interface Person { id: string; firstName: string; lastName: string; role: string; status: string; regions: string[]; types: string[]; channels: string[]; audits: string[]; isMe: boolean }
interface People { company: { name: string; logo_letters: string | null } | null; meId: string; role: string; people: Person[] }

const TYPES = [["unplanned", "Faults", "Power off without warning"], ["planned", "Planned work under way", "When planned work starts"], ["future", "Planned work coming up", "When the network announces it"]] as const
const DAY = 86400_000

export default function Organisation() {
  const { data, error } = usePortal()
  const [p, setP] = useState<People | null>(null)
  const [invite, setInvite] = useState(false)
  const { show, toast } = useToast()

  const load = useCallback(async () => {
    const res = await fetch("/api/portal/people", { headers: await headers(), cache: "no-store" })
    if (res.ok) setP(await res.json())
  }, [])
  useEffect(() => { load() }, [load])

  const me = p?.people.find((x) => x.isMe)
  const admin = p?.role === "admin"

  const save = async (patch: Partial<Pick<Person, "types" | "channels" | "audits">>) => {
    if (!p || !me) return
    setP({ ...p, people: p.people.map((x) => (x.isMe ? { ...x, ...patch } : x)) })
    const res = await fetch("/api/portal/people", { method: "PATCH", headers: await headers(), body: JSON.stringify(patch) })
    if (!res.ok) { show("Couldn't save that. Try again."); load() } else show("Saved")
  }
  const flip = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const mail = useMemo(() => {
    if (!data) return null
    const now = new Date(data.at).getTime()
    const in3 = data.outages.filter((o) => o.status === "Planned" && o.starts && new Date(o.starts).getTime() - now < 3 * DAY)
    const sites = (l: typeof in3) => new Set(l.map((o) => o.site.id)).size
    const byDay = new Map<string, typeof in3>()
    for (const o of in3) {
      const k = fmt(o.starts!, o.site.state, { weekday: "long", day: "numeric", month: "short" })
      byDay.set(k, [...(byDay.get(k) ?? []), o])
    }
    return { in3, all: sites(in3), long: sites(in3.filter((o) => (o.hours ?? 0) >= 4)), byDay: [...byDay], off: sites(data.outages.filter((o) => o.status !== "Planned")), tomorrow: new Date(now + DAY) }
  }, [data])

  if (!data || !p || !mail) return <Loading error={error} />
  const letters = p.company?.logo_letters || (p.company?.name ?? data.company).split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <main className="org">
      <title>Organisation · Wattle</title>
      <div className="top">
        <div className="co"><div className="lg">{letters}</div><div><div className="eyebrow">Organisation · {plural(data.summary.sites, "site")}</div><h1 style={{ marginTop: 2 }}>{p.company?.name ?? data.company}</h1></div></div>
        <div className="actions"><Link className="btn" href="/profile">More settings</Link></div>
      </div>

      <section className="blk first">
        <div className="lab"><h2>People</h2><p>Admins can add sites, invite people and make connections. Members see everything and can export.</p></div>
        <div>
          {p.people.map((x) => (
            <div className="ppl" key={x.id}>
              <div className={`av ${x.role === "admin" ? "" : "m"}`}>{`${x.firstName[0] ?? ""}${x.lastName[0] ?? ""}`.toUpperCase() || "?"}</div>
              <div style={{ minWidth: 0 }}>
                <b>{x.firstName} {x.lastName}</b>{x.isMe && <span className="you">You</span>}
                <div className="sub">{alertLine(x)}{x.status !== "active" ? ` · ${x.status}` : ""}</div>
              </div>
              <div className="role h-s">{x.role === "admin" ? "Admin" : "Member"}</div>
              <div className="sub h-s">{x.regions.length >= 8 || !x.regions.length ? "All states" : x.regions.join(", ")}</div>
            </div>
          ))}
          {admin && <div className="addrow"><button className="btn gold" onClick={() => setInvite(true)}>+ Invite someone</button></div>}
        </div>
      </section>

      <section className="blk">
        <div className="lab"><h2>Audit emails<span className="new">New</span></h2><p>A morning summary of what&apos;s about to lose power, with the spreadsheet attached, so stock can be moved before it happens.</p></div>
        <div className="aud">
          <div>
            <div className="opt"><div><b>Daily, 7:00 am</b><span>Outages in the next 3 days, and anything off now</span></div>
              <button className={`tg ${me?.audits.includes("daily") ? "on" : ""}`} aria-label="Daily audit email" onClick={() => me && save({ audits: flip(me.audits, "daily") })} /></div>
            <div className="opt"><div><b>Weekly, Monday 7:00 am</b><span>Everything planned for the next 14 days</span></div>
              <button className={`tg ${me?.audits.includes("weekly") ? "on" : ""}`} aria-label="Weekly audit email" onClick={() => me && save({ audits: flip(me.audits, "weekly") })} /></div>
            <p className="optnote">Each email comes with an Excel file of every site affected, in each site&apos;s local time. We&apos;re switching sending on soon; your choice is saved now.</p>
          </div>
          <div className="mail">
            <div className="mh">What tomorrow&apos;s daily email would say</div>
            <div className="subj">{plural(mail.all, "site")} lose power in the next 3 days, {mail.long} for 4 hours or more</div>
            <div className="from">Wattle · {fmt(mail.tomorrow, "NSW", { weekday: "short", day: "numeric", month: "short" })}, 7:00 am</div>
            {mail.byDay.map(([d, l]) => <div className="ln" key={d}><span>{d}</span><b>{plural(new Set(l.map((o) => o.site.id)).size, "site")}</b></div>)}
            {mail.off > 0 && <div className="ln"><span>Off right now</span><b>{plural(mail.off, "site")}</b></div>}
            <div className="file"><i>XLSX</i><div><b style={{ color: "var(--ink)", fontWeight: 600 }}>wattle-next-3-days.xlsx</b><br />{plural(mail.in3.length, "row")} · site, times, hours, fridge check</div></div>
          </div>
        </div>
      </section>

      <section className="blk">
        <div className="lab"><h2>Your alerts</h2><p>What you hear about the moment it changes, for the sites in your states.</p></div>
        <div>
          {TYPES.map(([k, l, s]) => (
            <div className="opt" key={k}><div><b>{l}</b><span>{s}</span></div>
              <button className={`tg ${me?.types.includes(k) ? "on" : ""}`} aria-label={l} onClick={() => me && save({ types: flip(me.types, k) })} /></div>
          ))}
          <div className="opt"><div><b>By email</b></div><button className={`tg ${me?.channels.includes("email") ? "on" : ""}`} aria-label="Email" onClick={() => me && save({ channels: flip(me.channels, "email") })} /></div>
          <div className="opt"><div><b>By text</b><span>To the mobile on your profile</span></div><button className={`tg ${me?.channels.includes("sms") ? "on" : ""}`} aria-label="Text" onClick={() => me && save({ channels: flip(me.channels, "sms") })} /></div>
        </div>
      </section>

      {admin && (
        <section className="blk">
          <div className="lab"><h2>Connections</h2><p>Read-only links that let Claude or another app see your outages. Each one can be turned off at any time.</p></div>
          <div><ConnectionsPanel bare /></div>
        </section>
      )}

      {admin && (
        <InviteUserDialog open={invite} onOpenChange={setInvite} companyId={data.companyId} adminId={data.userId}
          onInvite={async (d) => {
            const res = await fetch("/api/invite-user", { method: "POST", headers: await headers(), body: JSON.stringify(d) })
            const j = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(j.error || "Couldn't send the invite.")
            show(j.emailSent ? `Invite sent to ${d.email}` : "Invite made, but the email didn't send")
            load()
          }} />
      )}
      {toast}
    </main>
  )
}

function alertLine(x: Person) {
  const by = [x.channels.includes("email") && "Email", x.channels.includes("sms") && "text"].filter(Boolean).join(" and ") || "No alerts"
  const what = x.types.length === 3 ? "all outages" : x.types.length === 0 ? "nothing chosen yet" : x.types.map((t) => ({ unplanned: "faults", planned: "planned under way", future: "planned coming up" }[t] ?? t)).join(", ")
  return `${by} · ${what}`
}
