import { NextResponse } from "next/server"
import { withKey } from "@/lib/api-auth"
import { summary } from "@/lib/wattle-data"

export const dynamic = "force-dynamic"

/** GET /api/v1/summary: counts for an audit at a glance. */
export async function GET(req: Request) {
  return withKey(req, async (owner) =>
    NextResponse.json({ company: owner.companyName, at: new Date().toISOString(), ...(await summary(owner.companyId)) }))
}
