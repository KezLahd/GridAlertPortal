import { NextResponse } from "next/server"
import { companyForKey, keyFrom, outages, sites, summary, when, type KeyOwner, type Outage, type Site } from "@/lib/wattle-data"

// The Claude connection: a read-only MCP server over Streamable HTTP, stateless, JSON responses.
// Add it in Claude as a custom connector with the URL https://<portal>/api/mcp/<key> (the key is made in the portal
// under Organisation → Connections). It can only read the key's company's sites and outages.

export const dynamic = "force-dynamic"

const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"]

const TOOLS = [
  {
    name: "get_summary",
    description: "A quick audit: how many sites are watched, how many have the power off right now, and how many have planned outages in the next 3, 7 and 28 days (with how many of the next week's run 4 hours or more).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "outages_now",
    description: "Sites with the power off right now: unplanned faults and planned work under way. 'At the site' means the outage covers the site's address; 'nearby' means it's close but may not reach it.",
    inputSchema: {
      type: "object",
      properties: {
        state: { type: "string", description: "Only sites in this state, e.g. NSW, VIC, QLD." },
        site: { type: "string", description: "Only sites whose name, code, suburb or postcode contains this." },
      },
    },
  },
  {
    name: "upcoming_outages",
    description: "Planned outages starting in the next N days, soonest first, with start and end in each site's local time and how many hours the power is off. Use min_hours 4 to find the ones where fridge stock may need moving.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "How far ahead to look, 1 to 120. Default 7." },
        state: { type: "string", description: "Only sites in this state." },
        site: { type: "string", description: "Only sites whose name, code, suburb or postcode contains this." },
        min_hours: { type: "number", description: "Only outages lasting at least this many hours." },
        at_site_only: { type: "boolean", description: "Leave out outages that are only near a site." },
      },
    },
  },
  {
    name: "list_sites",
    description: "The sites being watched, with address, state and electricity network.",
    inputSchema: {
      type: "object",
      properties: {
        state: { type: "string", description: "Only sites in this state." },
        search: { type: "string", description: "Only sites whose name, code, suburb or postcode contains this." },
      },
    },
  },
  {
    name: "export_link",
    description: "A download link for a spreadsheet (Excel or CSV) of outages, to open or forward by email. Give the link to the person as is.",
    inputSchema: {
      type: "object",
      properties: {
        when: { type: "string", enum: ["now", "upcoming", "all"], description: "Out now, upcoming, or both. Default upcoming." },
        days: { type: "number", description: "How far ahead, 1 to 120. Default 14." },
        format: { type: "string", enum: ["xlsx", "csv"], description: "Default xlsx (Excel)." },
        state: { type: "string" },
        min_hours: { type: "number" },
      },
    },
  },
]

const matches = (s: Site, q?: string) => {
  if (!q) return true
  const n = q.toLowerCase()
  return [s.name, s.code, s.number, s.suburb, s.postcode, s.address].some((v) => (v ?? "").toLowerCase().includes(n))
}

const MAX = 150

function table(list: Outage[]): string {
  if (!list.length) return "None."
  const rows = list.slice(0, MAX).map((o) =>
    `| ${o.site.name} | ${o.site.suburb ?? ""} ${o.site.state ?? ""} | ${o.status} | ${when(o.starts, o.site.state)} | ${when(o.ends, o.site.state) || "not given"} | ${o.hours ?? "?"} | ${o.atSite ? "at the site" : `nearby${o.distanceKm != null ? ` (${o.distanceKm.toFixed(1)} km)` : ""}`} | ${o.provider} | ${o.cause ?? ""} |`)
  const more = list.length > MAX ? `\n\n…and ${list.length - MAX} more. Use export_link for the full list.` : ""
  return `| Site | Where | Status | Starts | Ends | Hours | Reach | Network | Cause |\n|---|---|---|---|---|---|---|---|---|\n${rows.join("\n")}${more}`
}

async function call(name: string, a: any, owner: KeyOwner, origin: string, key: string): Promise<string> {
  const c = owner.companyId
  switch (name) {
    case "get_summary": {
      const s = await summary(c)
      return [
        `${owner.companyName}: ${s.sites} sites watched.`,
        `Power off now: ${s.outNow.sites} sites (${s.outNow.atSite} with the outage at the site itself).`,
        `Planned in the next 3 days: ${s.next3Days.outages} outages across ${s.next3Days.sites} sites.`,
        `Planned in the next 7 days: ${s.next7Days.outages} across ${s.next7Days.sites} sites, ${s.longOnes7Days} of them 4 hours or longer.`,
        `Planned in the next 28 days: ${s.next28Days.outages} across ${s.next28Days.sites} sites.`,
      ].join("\n")
    }
    case "outages_now": {
      const list = (await outages(c, { when: "now", state: a.state })).filter((o) => matches(o.site, a.site))
      return `${list.length} outages with the power off now.\n\n${table(list)}`
    }
    case "upcoming_outages": {
      const days = Math.min(Math.max(Number(a.days) || 7, 1), 120)
      const list = (await outages(c, { when: "upcoming", days, state: a.state, minHours: a.min_hours, atSiteOnly: !!a.at_site_only }))
        .filter((o) => matches(o.site, a.site))
      return `${list.length} planned outages starting in the next ${days} days (times are each site's local time).\n\n${table(list)}`
    }
    case "list_sites": {
      const list = (await sites(c)).filter((s) => (!a.state || (s.state ?? "").toUpperCase() === String(a.state).toUpperCase()) && matches(s, a.search))
      const rows = list.slice(0, 300).map((s) => `| ${s.name} | ${s.number ?? ""} | ${s.address} | ${s.provider ?? ""} |`)
      return `${list.length} sites.\n\n| Site | Site number | Address | Network |\n|---|---|---|---|\n${rows.join("\n")}${list.length > 300 ? `\n…and ${list.length - 300} more.` : ""}`
    }
    case "export_link": {
      const p = new URLSearchParams({ when: a.when ?? "upcoming", days: String(Math.min(Math.max(Number(a.days) || 14, 1), 120)), format: a.format === "csv" ? "csv" : "xlsx", key })
      if (a.state) p.set("state", a.state)
      if (a.min_hours) p.set("min_hours", String(a.min_hours))
      return `Download: ${origin}/api/v1/outages?${p}\n(This link carries the connection key, so share it only with people who should see this data.)`
    }
    default:
      throw Object.assign(new Error(`Unknown tool ${name}`), { code: -32602 })
  }
}

async function handle(msg: any, owner: KeyOwner, origin: string, key: string): Promise<any | null> {
  const { id, method, params } = msg ?? {}
  const reply = (result: any) => ({ jsonrpc: "2.0", id, result })
  if (id === undefined || id === null) return null           // a notification, nothing to say back
  switch (method) {
    case "initialize":
      return reply({
        protocolVersion: VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "wattle", title: "Wattle", version: "1.0.0" },
        instructions: `Read-only power outage data for ${owner.companyName}'s sites in Australia. Start with get_summary for an audit; use upcoming_outages with min_hours 4 to find outages long enough to put fridge stock at risk.`,
      })
    case "ping":
      return reply({})
    case "tools/list":
      return reply({ tools: TOOLS })
    case "tools/call":
      try {
        const text = await call(params?.name, params?.arguments ?? {}, owner, origin, key)
        return reply({ content: [{ type: "text", text }] })
      } catch (e: any) {
        if (e?.code === -32602) return { jsonrpc: "2.0", id, error: { code: -32602, message: e.message } }
        console.error("[mcp]", e)
        return reply({ content: [{ type: "text", text: "Couldn't read the outage data just now. Try again in a minute." }], isError: true })
      }
    default:
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } }
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key: pathKey } = await ctx.params
  const key = keyFrom(req, pathKey)
  const owner = await companyForKey(key)
  if (!owner || !key) return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Invalid or revoked key" } }, { status: 401 })
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 })
  }
  const origin = new URL(req.url).origin
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handle(m, owner, origin, key)))).filter(Boolean)
    return out.length ? NextResponse.json(out) : new NextResponse(null, { status: 202 })
  }
  const out = await handle(body, owner, origin, key)
  return out ? NextResponse.json(out) : new NextResponse(null, { status: 202 })
}

// No server-to-client stream and no sessions in this server.
export async function GET() {
  return new NextResponse("This is Wattle's Claude connection. Add this URL to Claude as a custom connector.", { status: 405, headers: { allow: "POST" } })
}
export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { allow: "POST" } })
}
