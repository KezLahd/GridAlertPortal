import { createServiceClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Feed health for GridAlert operators: each provider's freshness and block state, recent collection attempts,
// and the office runner's heartbeat. Only users in gridalert.platform_admins may read it.
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const db = createServiceClient()
  const { data: auth, error: authError } = await db.auth.getUser(token)
  if (authError || !auth?.user) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const { data: admin } = await db.from("platform_admins").select("user_id").eq("user_id", auth.user.id).maybeSingle()
  if (!admin) return NextResponse.json({ error: "Not an operator" }, { status: 403 })

  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const [health, runs, office] = await Promise.all([
    db.rpc("provider_health"),
    db
      .from("scraper_runs")
      .select("id, provider, source, host, started_at, outcome, http_status, items, detail")
      .neq("outcome", "ok")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(100),
    db
      .from("scraper_runs")
      .select("host, started_at")
      .eq("source", "office")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const failed = [health, runs, office].find((r) => r.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    providers: health.data ?? [],
    problems: runs.data ?? [],
    office: office.data ?? null,
  })
}
