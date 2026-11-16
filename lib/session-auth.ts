import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"

// Who is calling a portal API route: their own session token (sent as `Authorization: Bearer …`) is checked with
// Supabase, then their profile gives the company and role. Routes use these, never ids from the request body.

export interface Caller {
  db: ReturnType<typeof createServiceClient>
  userId: string
  companyId: string
  companyName: string
  role: string
}

export async function caller(req: Request): Promise<Caller | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null
  const db = createServiceClient()
  // the token is checked here against Supabase's public signing keys (fetched once and cached), not with a call to
  // Supabase on every request; it still has to be signed by the project and not expired
  const { data: c, error } = await db.auth.getClaims(token)
  const userId = !error && typeof c?.claims?.sub === "string" ? c.claims.sub : null
  if (!userId) return null
  const { data: p } = await db.from("user_profiles").select("company_id, role, companies(name)").eq("user_id", userId).maybeSingle()
  if (!p?.company_id) return null
  return { db, userId, companyId: p.company_id, companyName: (p as any).companies?.name ?? "", role: String(p.role ?? "").toLowerCase() }
}

export const isAdmin = (c: Caller | null): c is Caller => !!c && c.role === "admin"

export const signInFirst = () => NextResponse.json({ error: "Sign in first." }, { status: 401 })
export const adminsOnly = () => NextResponse.json({ error: "Only company admins can do that." }, { status: 403 })
