import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { newKey } from "@/lib/wattle-data"

// Organisation → Connections: company admins list, make and revoke read-only keys for the Claude connection and the
// data API. The caller sends their own session token; we check it and their role here, then use the service key.

export const dynamic = "force-dynamic"

async function admin(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null
  const db = createServiceClient()
  const { data: u } = await db.auth.getUser(token)
  if (!u?.user) return null
  const { data: p } = await db.from("user_profiles").select("company_id, role").eq("user_id", u.user.id).maybeSingle()
  if (!p?.company_id || !["admin", "owner"].includes(String(p.role ?? "").toLowerCase())) return null
  return { db, userId: u.user.id, companyId: p.company_id as string }
}

const denied = () => NextResponse.json({ error: "Only company admins can manage connections." }, { status: 403 })

export async function GET(req: Request) {
  const a = await admin(req)
  if (!a) return denied()
  const { data, error } = await a.db.from("api_keys").select("id, name, key_prefix, created_at, last_used_at, revoked_at")
    .eq("company_id", a.companyId).order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data })
}

/** Makes a key. The full key is in this response only; we keep just its hash. */
export async function POST(req: Request) {
  const a = await admin(req)
  if (!a) return denied()
  const { name } = await req.json().catch(() => ({}))
  const label = String(name ?? "").trim().slice(0, 60) || "Claude connection"
  const k = newKey()
  const { data, error } = await a.db.from("api_keys")
    .insert({ company_id: a.companyId, name: label, key_hash: k.hash, key_prefix: k.prefix, created_by: a.userId })
    .select("id, name, key_prefix, created_at").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const origin = new URL(req.url).origin
  return NextResponse.json({ ...data, key: k.key, connectorUrl: `${origin}/api/mcp/${k.key}` })
}

export async function DELETE(req: Request) {
  const a = await admin(req)
  if (!a) return denied()
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Which key?" }, { status: 400 })
  const { error } = await a.db.from("api_keys").update({ revoked_at: new Date().toISOString() })
    .eq("id", id).eq("company_id", a.companyId).is("revoked_at", null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
