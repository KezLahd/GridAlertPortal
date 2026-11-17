"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Settings as GearIcon } from "lucide-react"
import { ConnectionsPanel } from "@/components/connections-panel"
import { InviteUserDialog } from "@/components/invite-user-dialog"
import { Loading } from "@/components/wattle/shell"
import { useSiteDialogs, useToast } from "@/components/wattle/site-dialogs"
import { fmt, headers, plural, usePortal, type Site } from "@/components/wattle/data"
import { NET, netKey, netName, type NetKey } from "@/components/wattle/networks"
import { Opt, Sep } from "@/components/wattle/pick"
import { AusDots, GoldToggle, MenuHead, Pager, Plus, PoweredBy, RoundMenu, SearchBar, slice } from "@/components/wattle/kit"

// Organisation, as the app has it: a cover in the workspace's colour with every site lit on a dot map of Australia,
// the workspace icon on its edge, then Sites, Networks and Team on a gold toggle, each with its own search, filters and
// pages. As you scroll, the icon and name fold into a slim bar at the top and the toggle docks under it. Your own
// alerts, audit emails and connections are behind the gear (or your initials), as the app's Settings are.

interface Person { id: string; firstName: string; lastName: string; role: string; status: string; regions: string[]; types: string[]; channels: string[]; audits: string[]; digest: boolean; isMe: boolean; iconBg?: string | null; iconFg?: string | null }
interface People { company: { name: string; logo_letters: string | null; logo_bg_color?: string | null; logo_text_color?: string | null; logo_url?: string | null } | null; meId: string; role: string; people: Person[] }

type Tab = "sites" | "networks" | "team"
type Show = "all" | "out" | "planned" | "clear"
type Sort = "number" | "state" | "name" | "status"
const TYPES = [["unplanned", "Faults", "Power off without warning"], ["planned", "Planned work under way", "When planned work starts"], ["future", "Planned work coming up", "When the network announces it"]] as const
const ORDER = ["NSW", "ACT", "VIC", "QLD", "SA", "WA", "TAS", "NT"]
const STATE: Record<string, string> = { NSW: "New South Wales", ACT: "ACT", VIC: "Victoria", QLD: "Queensland", SA: "South Australia", WA: "Western Australia", TAS: "Tasmania", NT: "Northern Territory" }
const RANK = { now: 0, long: 2, soon: 2, clear: 3 } as const
const DAY = 86400_000
/** the slim bar's height; the toggle docks right under it */
const BAR = 60

export default function Organisation() {
  const { data, error, stateOf, me: who } = usePortal()
  const [p, setP] = useState<People | null>(null)
  const [tab, setTab] = useState<Tab>("sites")
  const [sheet, setSheet] = useState(false)
  const [invite, setInvite] = useState(false)
  const { show, toast } = useToast()
  const { openAdd, dialogs } = useSiteDialogs(show)

  const [sq, setSq] = useState(""), [shw, setShw] = useState<Show>("all"), [sort, setSort] = useState<Sort>("number")
  const [st, setSt] = useState<string | null>(null), [net, setNet] = useState<NetKey | null>(null), [sp, setSp] = useState(0)
  const [nq, setNq] = useState(""), [byName, setByName] = useState(false), [np, setNp] = useState(0)
  const [tq, setTq] = useState(""), [role, setRole] = useState<"all" | "admin" | "member">("all"), [tp, setTp] = useState(0)
  useEffect(() => setSp(0), [sq, shw, sort, st, net])
  useEffect(() => setNp(0), [nq, byName])
  useEffect(() => setTp(0), [tq, role])

  const load = useCallback(async () => {
    const res = await fetch("/api/portal/people", { headers: await headers(), cache: "no-store" })
    if (res.ok) setP(await res.json())
  }, [])
  useEffect(() => { load() }, [load])

  // ---------- the fold: --t runs 0 to 1 over 80px once the name nears the top; the toggle docks when it reaches the bar
  const mainRef = useRef<HTMLElement>(null), idRef = useRef<HTMLDivElement>(null), tabRef = useRef<HTMLDivElement>(null)
  const ready = !!(data && p)
  const [frame, setFrame] = useState<Element | null>(null)
  // wide screens: the search docks beside the toggle, and rows spread into columns
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const m = matchMedia("(min-width: 1180px)")
    const on = () => setWide(m.matches)
    on(); m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [])
  useEffect(() => { setFrame(document.querySelector(".wt")) }, [])
  useEffect(() => {
    if (!sheet) return
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(false) }
    addEventListener("keydown", key)
    return () => removeEventListener("keydown", key)
  }, [sheet])
  useEffect(() => {
    if (!ready) return
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const m = mainRef.current, id = idRef.current, tb = tabRef.current
        if (!m || !id || !tb) return
        // the name sits 44 under the top of the row: it starts folding 140 from the top and is in the bar by 60
        const t = Math.min(1, Math.max(0, (140 - (id.getBoundingClientRect().top + 44)) / 80))
        m.style.setProperty("--t", t.toFixed(3))
        m.classList.toggle("folded", t > 0.6)
        m.classList.toggle("docked", tb.getBoundingClientRect().top <= BAR + 0.5)
      })
    }
    on()
    addEventListener("scroll", on, { passive: true }); addEventListener("resize", on)
    return () => { cancelAnimationFrame(raf); removeEventListener("scroll", on); removeEventListener("resize", on) }
  }, [ready])
  // a new tab or page starts at the toggle, not wherever the last list left you
  const toTop = () => {
    const tb = tabRef.current
    if (tb && tb.getBoundingClientRect().top <= BAR + 0.5) scrollTo({ top: scrollY + tb.parentElement!.getBoundingClientRect().top - BAR + 1 })
  }

  const me = p?.people.find((x) => x.isMe)
  const admin = p?.role === "admin"
  const weekly = !!(me?.digest && me.channels.includes("email"))
  const save = async (patch: Partial<Pick<Person, "types" | "channels" | "audits" | "digest">>) => {
    if (!p || !me) return
    const local = patch.digest ? { ...patch, channels: me.channels.includes("email") ? me.channels : [...me.channels, "email"] } : patch
    setP({ ...p, people: p.people.map((x) => (x.isMe ? { ...x, ...local } : x)) })
    const res = await fetch("/api/portal/people", { method: "PATCH", headers: await headers(), body: JSON.stringify(patch) })
    if (!res.ok) { show("Couldn't save that. Try again."); load() } else show("Saved")
  }
  const flip = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  // ---------- the lists
  const sites = useMemo(() => (data?.sites ?? []).map((s) => ({ s, k: stateOf(s.id).k })), [data, stateOf])
  const byNet = useMemo(() => {
    const m = new Map<NetKey, number>()
    for (const { s } of sites) { const k = netKey(s.provider); if (k) m.set(k, (m.get(k) ?? 0) + 1) }
    return m
  }, [sites])
  const states = useMemo(() => [...new Set(sites.map(({ s }) => (s.state ?? "").toUpperCase()).filter((x) => STATE[x]))].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)), [sites])

  const siteList = useMemo(() => {
    const q = sq.trim().toLowerCase().replace(/^#/, "")
    const num = (s: Site) => { const n = parseInt((s.code ?? "").replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : Infinity }
    const stI = (s: Site) => { const i = ORDER.indexOf((s.state ?? "").toUpperCase()); return i < 0 ? 99 : i }
    return sites.filter(({ s, k }) => {
      if (shw === "out" && k !== "now") return false
      if (shw === "planned" && k !== "long" && k !== "soon") return false
      if (shw === "clear" && k !== "clear") return false
      if (st && (s.state ?? "").toUpperCase() !== st) return false
      if (net && netKey(s.provider) !== net) return false
      if (!q) return true
      const n = (s.number ?? "").toLowerCase().replace(/^#/, ""), c = (s.code ?? "").toLowerCase()
      return n.startsWith(q) || c.startsWith(q) || [s.name, s.suburb, s.postcode, s.address].some((v) => v?.toLowerCase().includes(q))
    }).sort((a, b) => {
      const name = a.s.name.localeCompare(b.s.name)
      if (sort === "state") return stI(a.s) - stI(b.s) || RANK[a.k] - RANK[b.k] || name
      if (sort === "name") return name
      if (sort === "status") return RANK[a.k] - RANK[b.k] || name
      return num(a.s) - num(b.s) || name
    })
  }, [sites, sq, shw, sort, st, net])

  const netList = useMemo(() => {
    const q = nq.trim().toLowerCase()
    const yours = [...byNet].sort((a, b) => (byName ? 0 : b[1] - a[1]) || NET[a[0]].name.localeCompare(NET[b[0]].name))
    const rest = (Object.keys(NET) as NetKey[]).filter((k) => !byNet.has(k)).sort((a, b) => NET[a].name.localeCompare(NET[b].name)).map((k) => [k, 0] as [NetKey, number])
    return [...yours, ...rest].filter(([k]) => !q || NET[k].name.toLowerCase().includes(q) || k.includes(q))
  }, [byNet, nq, byName])

  const team = useMemo(() => {
    const q = tq.trim().toLowerCase()
    return (p?.people ?? []).filter((x) => (role === "all" || (role === "admin") === (x.role === "admin")) && (!q || `${x.firstName} ${x.lastName}`.toLowerCase().includes(q)))
  }, [p, tq, role])

  const mail = useMemo(() => {
    if (!data) return null
    const now = new Date(data.at).getTime()
    const in3 = data.outages.filter((o) => o.status === "Planned" && o.starts && new Date(o.starts).getTime() - now < 3 * DAY)
    const n = (l: typeof in3) => new Set(l.map((o) => o.site.id)).size
    const byDay = new Map<string, typeof in3>()
    for (const o of in3) { const k = fmt(o.starts!, o.site.state, { weekday: "long", day: "numeric", month: "short" }); byDay.set(k, [...(byDay.get(k) ?? []), o]) }
    return { rows: in3.length, all: n(in3), long: n(in3.filter((o) => (o.hours ?? 0) >= 4)), byDay: [...byDay], off: n(data.outages.filter((o) => o.status !== "Planned")), tomorrow: new Date(now + DAY) }
  }, [data])

  if (!data || !p || !mail) return <Loading error={error} />

  const coName = p.company?.name ?? data.company
  const letters = (p.company?.logo_letters || coName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2)).toUpperCase().slice(0, 3)
  const out = sites.filter((x) => x.k === "now").length
  const facts = [plural(sites.length, "site"), plural(states.length, "state"), plural(p.people.length, "person", "people")].join(" · ")
  const myInitials = `${who?.firstName?.[0] ?? me?.firstName[0] ?? ""}${who?.lastName?.[0] ?? me?.lastName[0] ?? ""}`.toUpperCase() || "?"
  const cover = coverColour(p.company?.logo_bg_color, p.company?.logo_text_color)
  const icon = (size: number) => <WorkspaceIcon letters={letters} bg={p.company?.logo_bg_color} fg={p.company?.logo_text_color} photo={p.company?.logo_url} size={size} />
  const pick = (t: Tab) => { setTab(t); toTop() }
  const turn = (set: (n: number) => void) => (n: number) => { set(n); toTop() }

  const search = tab === "sites" ? (
      <Search value={sq} onChange={setSq} placeholder="Site number, name or suburb"
        add={admin ? { label: "Add site", onClick: openAdd } : undefined}
        menu={<RoundMenu label="Filter and sort sites" active={shw !== "all" || sort !== "number" || !!st || !!net}>{(close) => <>
          <MenuHead>Show</MenuHead>
          {([["all", "All sites"], ["out", "Without power"], ["planned", "Planned outage"], ["clear", "All clear"]] as const).map(([k, l]) =>
            <Opt key={k} on={shw === k} onPick={() => { setShw(k); close() }}>{l}</Opt>)}
          <Sep /><MenuHead>Sort by</MenuHead>
          {([["number", "Site number"], ["state", "State"], ["name", "Name"], ["status", "Status"]] as const).map(([k, l]) =>
            <Opt key={k} on={sort === k} onPick={() => { setSort(k); close() }}>{l}</Opt>)}
          <Sep /><MenuHead>State</MenuHead>
          <Opt on={!st} onPick={() => { setSt(null); close() }}>All states</Opt>
          {states.map((x) => <Opt key={x} on={st === x} n={sites.filter(({ s }) => (s.state ?? "").toUpperCase() === x).length} onPick={() => { setSt(x); close() }}>{STATE[x]}</Opt>)}
          <Sep /><MenuHead>Network</MenuHead>
          <Opt on={!net} onPick={() => { setNet(null); close() }}>All networks</Opt>
          {[...byNet].sort((a, b) => b[1] - a[1] || NET[a[0]].name.localeCompare(NET[b[0]].name)).map(([k, n]) =>
            <Opt key={k} on={net === k} n={n} onPick={() => { setNet(k); close() }}>{NET[k].name}</Opt>)}
          {(shw !== "all" || sort !== "number" || st || net) && <><Sep /><Opt on={false} onPick={() => { setShw("all"); setSort("number"); setSt(null); setNet(null); close() }}>Reset</Opt></>}
        </>}</RoundMenu>} />
  ) : tab === "networks" ? (
      <Search value={nq} onChange={setNq} placeholder="Network"
        menu={<RoundMenu label="Sort networks" active={byName}>{(close) => <>
          <MenuHead>Sort by</MenuHead>
          <Opt on={!byName} onPick={() => { setByName(false); close() }}>Most sites</Opt>
          <Opt on={byName} onPick={() => { setByName(true); close() }}>Name</Opt>
        </>}</RoundMenu>} />
  ) : (
      <Search value={tq} onChange={setTq} placeholder="Name"
        add={admin ? { label: "Invite someone", onClick: () => setInvite(true) } : undefined}
        menu={<RoundMenu label="Show" active={role !== "all"}>{(close) => <>
          <MenuHead>Show</MenuHead>
          {([["all", "Everyone"], ["admin", "Admins"], ["member", "Members"]] as const).map(([k, l]) =>
            <Opt key={k} on={role === k} onPick={() => { setRole(k); close() }}>{l}</Opt>)}
        </>}</RoundMenu>} />
  )

  return (
    <main className="org" ref={mainRef}>
      <title>Organisation · Wattle</title>

      {/* the slim bar: you, the workspace, Settings; it comes in as the name folds up into it */}
      <div className="ob-pin">
        <div className="ob">
          <button className="ob-me" onClick={() => setSheet(true)} aria-label="Your settings" tabIndex={-1}>{myInitials}</button>
          <div className="ob-t" aria-hidden>{icon(26)}<span>{coName}</span></div>
          <button className="rb glassy" onClick={() => setSheet(true)} aria-label="Settings" tabIndex={-1}><Gear /></button>
        </div>
      </div>

      <div className="oc" style={{ ["--cov" as string]: cover }}>
        <AusDots sites={sites.filter(({ s }) => s.lat !== null && s.lng !== null).map(({ s, k }) => ({ lat: s.lat!, lng: s.lng!, out: k === "now" }))} />
        <div className="oc-row">
          <button className="ob-me big" onClick={() => setSheet(true)} aria-label="Your settings">{myInitials}</button>
          <button className="rb glassy dark" onClick={() => setSheet(true)} aria-label="Settings"><Gear /></button>
        </div>
      </div>

      <div className="ocol">
        <div className="oid" ref={idRef}>
          <div className="oid-ic">{icon(88)}</div>
          <div className="oid-tx">
            <h1>{coName}</h1>
            <div className="oid-f">{facts}</div>
            {out > 0 && <div className="oid-out">{out} without power right now</div>}
          </div>
        </div>
      </div>

      <div className="otab">
        <div className="ocol" ref={tabRef}>
          <GoldToggle label="Organisation lists" value={tab} onChange={pick} options={[
            { label: "Sites", count: sites.length, value: "sites" },
            { label: "Networks", count: Object.keys(NET).length, value: "networks" },
            { label: "Team", count: p.people.length, value: "team" },
          ]} />
          {wide && search}
        </div>
      </div>

      <div className="ocol olist">
        {tab === "sites" && <>
          {!wide && search}
          {siteList.length === 0 ? <NoMatch noun="sites" onReset={() => { setSq(""); setShw("all"); setSort("number"); setSt(null); setNet(null) }} /> : <>
            {siteList.length !== sites.length && <div className="ocount">{siteList.length} of {sites.length} sites</div>}
            {wide && <div className="ohd" aria-hidden><span>Site</span><span>Address</span><span>Network</span></div>}
            <div className="orows" role="list">
              {slice(siteList, sp).map(({ s, k }, i, page) => {
                const S = (s.state ?? "").toUpperCase()
                const head = sort === "state" && (i === 0 || (page[i - 1].s.state ?? "").toUpperCase() !== S)
                return <div key={s.id} role="listitem" className={head ? "ogrp" : undefined}>
                  {head && <div className="osh"><span>{STATE[S] ?? "Other"}</span><span>{siteList.filter((x) => (x.s.state ?? "").toUpperCase() === S).length}</span></div>}
                  <Link className="orow" href={`/sites?site=${s.id}`}>
                    <i className={`od ${k}`} aria-label={k === "now" ? "Without power" : k === "clear" ? "All clear" : "Planned outage"} />
                    <span className="orow-tx">
                      <b>{s.number && <em>{s.number}</em>}{s.name}</b>
                      <span className="orow-m"><span className="ad">{tidy(s.address)}</span>{netKey(s.provider) && <span className="nt">{netName(s.provider)}</span>}</span>
                    </span>
                    <Chev />
                  </Link>
                </div>
              })}
            </div>
            <Pager page={sp} total={siteList.length} noun="sites" go={turn(setSp)} />
          </>}
        </>}

        {tab === "networks" && <>
          {!wide && search}
          {netList.length === 0 ? <NoMatch noun="networks" onReset={() => { setNq(""); setByName(false) }} /> : <>
            <div className="orows net" role="list">
              {slice(netList, np).map(([k, n]) => (
                <Link key={k} role="listitem" className="orow" href={`/networks/${k}`}>
                  <NetTile k={k} />
                  <span className="orow-tx"><b>{NET[k].name}</b></span>
                  <span className="orow-n">{n === 0 ? "No sites" : plural(n, "site")}</span>
                  <Chev />
                </Link>
              ))}
            </div>
            <Pager page={np} total={netList.length} noun="networks" go={turn(setNp)} />
          </>}
        </>}

        {tab === "team" && <>
          {!wide && search}
          {team.length === 0 ? <NoMatch noun="people" onReset={() => { setTq(""); setRole("all") }} /> : <>
            <div className="orows team" role="list">
              {slice(team, tp).map((x) => (
                <div key={x.id} role="listitem" className="orow still">
                  <span className="obadge" style={{ background: hex(x.iconBg) || undefined, color: hex(x.iconFg) || undefined }}>{`${x.firstName[0] ?? ""}${x.lastName[0] ?? ""}`.toUpperCase() || "?"}</span>
                  <span className="orow-tx">
                    <b>{x.firstName} {x.lastName}{x.isMe && <small> (you)</small>}</b>
                    <span>{x.regions.length >= 8 || !x.regions.length ? "All states" : x.regions.join(", ")}{x.status !== "active" ? ` · ${x.status === "invited" ? "Invited" : x.status}` : ""}</span>
                  </span>
                  <span className={`orole${x.role === "admin" ? " a" : ""}`}>{x.role === "admin" ? "Admin" : "Member"}</span>
                </div>
              ))}
            </div>
            <Pager page={tp} total={team.length} noun="people" go={turn(setTp)} />
          </>}
        </>}
      </div>

      <PoweredBy />

      {/* Settings, as the app's sheet: your alerts, the audit emails and (for admins) connections. It's put on the
          portal's frame rather than in the page, so the scrim covers the sidebar too */}
      {frame && createPortal(<>
      {sheet && <div className="osh-scrim" onClick={() => setSheet(false)} />}
      <aside className={`osheet${sheet ? " open" : ""}`} aria-hidden={!sheet} aria-label="Settings" inert={!sheet}>
        <div className="osheet-h">
          <h2>Settings</h2>
          <button className="rb glassy" onClick={() => setSheet(false)} aria-label="Close settings"><svg viewBox="0 0 20 20" aria-hidden><path d="m6 6 8 8M14 6l-8 8" /></svg></button>
        </div>
        <div className="osheet-b">
          {admin && <PhotoPicker icon={icon(56)} has={!!p.company?.logo_url} done={load} />}
          <div className="olab">Your alerts</div>
          <p className="onote">What you hear about the moment it changes, for the sites in your states.</p>
          {TYPES.map(([k, l, s]) => <Toggle key={k} label={l} sub={s} on={!!me?.types.includes(k)} onClick={() => me && save({ types: flip(me.types, k) })} />)}
          <Toggle label="By email" on={!!me?.channels.includes("email")} onClick={() => me && save({ channels: flip(me.channels, "email") })} />
          <Toggle label="By text" sub="To the mobile on your profile" on={!!me?.channels.includes("sms")} onClick={() => me && save({ channels: flip(me.channels, "sms") })} />

          <div className="olab">Audit emails</div>
          <Toggle label="Daily, 7:00 am" sub="Outages in the next 3 days, and anything off now" on={!!me?.audits.includes("daily")} onClick={() => me && save({ audits: flip(me.audits, "daily") })} />
          <Toggle label="Weekly, Monday 7:00 am" sub="Email me a summary of planned outages near my sites" on={weekly} onClick={() => me && save({ digest: !weekly })} />
          <p className="onote">Both are off unless you turn them on. The weekly summary is sending now; the daily email is coming soon.</p>
          <div className="omail">
            <div className="omail-h">What tomorrow&apos;s daily email would say</div>
            <b>{plural(mail.all, "site")} lose power in the next 3 days, {mail.long} for 4 hours or more</b>
            <span>Wattle · {fmt(mail.tomorrow, "NSW", { weekday: "short", day: "numeric", month: "short" })}, 7:00 am · wattle-next-3-days.xlsx, {plural(mail.rows, "row")}</span>
            {mail.byDay.map(([d, l]) => <div className="omail-l" key={d}><span>{d}</span><b>{plural(new Set(l.map((o) => o.site.id)).size, "site")}</b></div>)}
            {mail.off > 0 && <div className="omail-l"><span>Off right now</span><b>{plural(mail.off, "site")}</b></div>}
          </div>

          {admin && <>
            <div className="olab">Connections</div>
            <p className="onote">Read-only links that let Claude or another app see your outages. Each one can be turned off at any time.</p>
            <ConnectionsPanel bare />
          </>}

          <div className="olab">More</div>
          <Link className="omore" href="/profile">Company details, icons and people <Chev /></Link>
        </div>
      </aside>
      </>, frame)}

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
      {dialogs}
      {toast}
    </main>
  )
}

// ---------- pieces ----------

function Search({ value, onChange, placeholder, menu, add }: {
  value: string; onChange: (v: string) => void; placeholder: string; menu: React.ReactNode; add?: { label: string; onClick: () => void }
}) {
  return (
    <div className="osr">
      <SearchBar value={value} onChange={onChange} placeholder={placeholder} />
      {menu}
      {add && <button className="rb gold" onClick={add.onClick} aria-label={add.label} title={add.label}><Plus /></button>}
    </div>
  )
}

function NoMatch({ noun, onReset }: { noun: string; onReset: () => void }) {
  return <div className="onone"><b>No {noun}</b><span>Nothing matches that search or filter.</span><button onClick={onReset}>Show all</button></div>
}

function Toggle({ label, sub, on, onClick }: { label: string; sub?: string; on: boolean; onClick: () => void }) {
  return (
    <div className="opt"><div><b>{label}</b>{sub && <span>{sub}</span>}</div>
      <button className={`tg ${on ? "on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={onClick} /></div>
  )
}

/** Admins set the workspace photo here, as in the app: cropped to the middle square, 512 px, JPEG. */
function PhotoPicker({ icon, has, done }: { icon: React.ReactNode; has: boolean; done: () => void }) {
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null)
  const send = async (init: RequestInit) => {
    setBusy(true); setErr(null)
    const res = await fetch("/api/portal/workspace-icon", { ...init, headers: { ...(await headers()), ...(init.headers ?? {}) } })
    if (!res.ok) setErr((await res.json().catch(() => null))?.error ?? "That didn't work. Try again.")
    else await done()
    setBusy(false)
  }
  const pick = async (f: File | undefined) => {
    if (!f) return
    try {
      const img = await createImageBitmap(f)
      const side = Math.min(img.width, img.height), c = document.createElement("canvas")
      c.width = c.height = 512
      c.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 512, 512)
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85))
      if (blob) await send({ method: "POST", body: blob, headers: { "content-type": "image/jpeg" } })
    } catch { setErr("That file isn't a photo Wattle can read.") }
    if (file.current) file.current.value = ""
  }
  return <>
    <div className="olab">Workspace icon</div>
    <div className="ophoto">
      {icon}
      <div>
        <button className="ophoto-b" disabled={busy} onClick={() => file.current?.click()}>{busy ? "Saving…" : has ? "Change photo" : "Choose photo"}</button>
        {has && !busy && <button className="ophoto-b soft" onClick={() => send({ method: "DELETE" })}>Remove photo</button>}
        <span>{err ?? "Shown for everyone in your workspace, in the app and here. Without one, your letters show."}</span>
      </div>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/heic" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  </>
}

/** The workspace's letters on its colour, lit from above like an app icon. */
function WorkspaceIcon({ letters, bg, fg, photo, size }: { letters: string; bg?: string | null; fg?: string | null; photo?: string | null; size: number }) {
  const b = hex(bg) ?? "#24211C", f = hex(fg) ?? "#F2B300"
  const [broken, setBroken] = useState(false)
  // the photo the app set fills the same rounded square, with a fine rim; the letters stay as the fallback
  if (photo && !broken) return (
    <span className="wsi wsi-ph" style={{ width: size, height: size, borderRadius: size * 0.27 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt="" onError={() => setBroken(true)} />
    </span>
  )
  return (
    <span className="wsi" style={{ width: size, height: size, borderRadius: size * 0.27, ["--b" as string]: b, color: f, fontSize: size * ({ 1: 0.58, 2: 0.44, 3: 0.33 }[letters.length] ?? 0.4) }}>
      {letters}
    </span>
  )
}

/** A network's own icon mark on a small white tile, or its first letter in its colour when it has none. */
function NetTile({ k }: { k: NetKey }) {
  const n = NET[k]
  return (
    <span className="ntile" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {n.icon && n.icon[1] !== "light" ? <img src={`/networks/${k}-icon.png`} alt="" /> : <b style={{ color: n.tint }}>{n.name[0]}</b>}
    </span>
  )
}

const Gear = () => <GearIcon className="gear" strokeWidth={1.9} aria-hidden />
const Chev = () => <svg className="chev" viewBox="0 0 10 16" aria-hidden><path d="m2.5 2.5 5 5.5-5 5.5" /></svg>

/** An address without the "NULL" and empty parts some imports leave in it. */
const tidy = (a?: string | null) => (a ?? "").split(",").map((x) => x.trim()).filter((x) => x && x.toUpperCase() !== "NULL").join(", ")
const hex = (s?: string | null) => { const h = (s ?? "").trim().replace(/^#/, ""); return /^[0-9a-f]{6}$/i.test(h) ? `#${h}` : null }
/** The darker of the icon's two colours, so the cover is deep enough for the lit sites to read on it. */
function coverColour(bg?: string | null, fg?: string | null) {
  const lum = (s: string | null) => { if (!s) return null; const v = parseInt(s.slice(1), 16); return 0.2126 * (v >> 16 & 255) + 0.7152 * (v >> 8 & 255) + 0.0722 * (v & 255) }
  const b = hex(bg), f = hex(fg)
  return ((lum(b) ?? 0) <= (lum(f) ?? 255) ? b : f) ?? "#1F5C66"
}
