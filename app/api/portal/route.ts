import { NextResponse } from "next/server"
import { caller, noOrganisation, signedInUser, signInFirst } from "@/lib/session-auth"
import { outages, sites, summaryOf } from "@/lib/wattle-data"

// Everything the portal's Overview, Map and Sites pages show for the signed-in member's company, in one call:
// every site (with its map pin), the outages now and in the next 28 days, and the headline numbers.
// Runs in Sydney (vercel.json) next to the database.

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const me = await caller(req)
  if (!me) return (await signedInUser(req)) ? noOrganisation() : signInFirst()
  try {
    // ?part=sites: just the sites, so the map can put pins down while the outages are still on their way
    const part = new URL(req.url).searchParams.get("part")
    const sitesP = sites(me.companyId) // asked once, shared with the outages query, which runs alongside it
    const [all, list] = await Promise.all([sitesP, part === "sites" ? [] : outages(me.companyId, { when: "all", days: 28 }, sitesP)])
    return NextResponse.json({
      partial: part === "sites",
      company: me.companyName,
      companyId: me.companyId,
      userId: me.userId,
      role: me.role,
      at: new Date().toISOString(),
      summary: summaryOf(all, list),
      sites: all,
      outages: list,
    })
  } catch (e) {
    console.error("[portal]", e)
    return NextResponse.json({ error: "Couldn't load your sites." }, { status: 500 })
  }
}
