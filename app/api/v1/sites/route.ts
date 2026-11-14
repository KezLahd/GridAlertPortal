import { NextResponse } from "next/server"
import { withKey } from "@/lib/api-auth"
import { sites } from "@/lib/wattle-data"

export const dynamic = "force-dynamic"

/** GET /api/v1/sites: every site the key's company watches. */
export async function GET(req: Request) {
  return withKey(req, async (owner) => NextResponse.json({ company: owner.companyName, sites: await sites(owner.companyId) }))
}
