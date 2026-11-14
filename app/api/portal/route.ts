import { NextResponse } from "next/server"
import { caller, signInFirst } from "@/lib/session-auth"
import { outages, sites, summaryOf } from "@/lib/wattle-data"

// Everything the portal's Overview, Map and Sites pages show for the signed-in member's company, in one call:
// every site (with its map pin), the outages now and in the next 28 days, and the headline numbers.

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const me = await caller(req)
  if (!me) return signInFirst()
  try {
    const [all, list] = await Promise.all([sites(me.companyId), outages(me.companyId, { when: "all", days: 28 })])
    return NextResponse.json({
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
