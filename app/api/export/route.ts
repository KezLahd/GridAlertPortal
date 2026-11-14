import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { outagesResponse } from "@/lib/outages-response"

// The portal's own "sites affected" export, for any signed-in member of a company: same parameters as
// /api/v1/outages, authorised by the member's session token instead of a key.

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const db = createServiceClient()
  const { data: u } = await db.auth.getUser(token)
  if (!u?.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const { data: p } = await db.from("user_profiles").select("company_id, companies(name)").eq("user_id", u.user.id).maybeSingle()
  if (!p?.company_id) return NextResponse.json({ error: "Not part of an organisation yet." }, { status: 403 })
  try {
    return await outagesResponse(p.company_id, (p as any).companies?.name ?? "", new URL(req.url))
  } catch (e) {
    console.error("[export]", e)
    return NextResponse.json({ error: "Couldn't build the export." }, { status: 500 })
  }
}
