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

/** The signed-in user's id from their session token, whether or not they're in an organisation yet. */
export async function signedInUser(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null
  // the token is checked here against Supabase's public signing keys (fetched once and cached), not with a call to
  // Supabase on every request; it still has to be signed by the project and not expired
  const { data: c, error } = await createServiceClient().auth.getClaims(token)
  return !error && typeof c?.claims?.sub === "string" ? c.claims.sub : null
}

export async function caller(req: Request): Promise<Caller | null> {
  const userId = await signedInUser(req)
  if (!userId) return null
  const db = createServiceClient()
  const { data: p } = await db.from("user_profiles").select("company_id, role, companies(name)").eq("user_id", userId).maybeSingle()
  if (!p?.company_id) return null
  return { db, userId, companyId: p.company_id, companyName: (p as any).companies?.name ?? "", role: String(p.role ?? "").toLowerCase() }
}

export const isAdmin = (c: Caller | null): c is Caller => !!c && c.role === "admin"

/** Signed in, but not in an organisation yet: the portal sends them to /join for an access code. */
export const noOrganisation = () => NextResponse.json({ error: "You're not in an organisation yet.", noOrg: true }, { status: 403 })

export const signInFirst = () => NextResponse.json({ error: "Sign in first." }, { status: 401 })
export const adminsOnly = () => NextResponse.json({ error: "Only company admins can do that." }, { status: 403 })
