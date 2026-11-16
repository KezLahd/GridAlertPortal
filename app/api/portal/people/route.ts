import { NextResponse } from "next/server"
import { caller, signInFirst } from "@/lib/session-auth"

// The Organisation page: who's in the company (names and roles, no contact details), and the caller's own
// alert and audit-email choices, which only they can change here.

export const dynamic = "force-dynamic"

const TYPES = ["unplanned", "planned", "future"]
const CHANNELS = ["email", "sms"]
const AUDITS = ["daily", "weekly"]

export async function GET(req: Request) {
  const me = await caller(req)
  if (!me) return signInFirst()
  const { data, error } = await me.db.from("user_profiles")
    .select("user_id, first_name, last_name, role, status, region_access, notify_outage_types, notify_channels, audit_emails, email_digest_opt_in_at, icon_letters, icon_bg_color, icon_text_color")
    .eq("company_id", me.companyId).order("first_name")
  if (error) return NextResponse.json({ error: "Couldn't load the people in your organisation." }, { status: 500 })
  const { data: co } = await me.db.from("companies").select("id, name, logo_letters, logo_bg_color, logo_text_color").eq("id", me.companyId).maybeSingle()
  return NextResponse.json({
    company: co,
    meId: me.userId,
    role: me.role,
    people: (data ?? []).map((p: any) => ({
      id: p.user_id,
      firstName: p.first_name ?? "",
      lastName: p.last_name ?? "",
      role: String(p.role ?? "member").toLowerCase(),
      status: p.status ?? "active",
      regions: p.region_access ?? [],
      types: p.notify_outage_types ?? [],
      channels: p.notify_channels ?? [],
      audits: p.audit_emails ?? [],
      // the weekly summary is opt-in: on only once you've ticked it (only your own is shown)
      digest: p.user_id === me.userId && !!p.email_digest_opt_in_at,
      letters: p.icon_letters ?? null,
      isMe: p.user_id === me.userId,
    })),
  })
}

/** Change your own alert types, channels and audit emails, and opt in or out of the weekly summary. */
export async function PATCH(req: Request) {
  const me = await caller(req)
  if (!me) return signInFirst()
  const body = await req.json().catch(() => ({}))
  const only = (v: unknown, allowed: string[]) =>
    Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && allowed.includes(x)))] : undefined
  const update: Record<string, string[] | string | null> = {}
  const t = only(body.types, TYPES), c = only(body.channels, CHANNELS), a = only(body.audits, AUDITS)
  if (t) update.notify_outage_types = t
  if (c) update.notify_channels = c
  if (a) update.audit_emails = a
  // the weekly summary (Mondays 7 am): ticking it stamps when you opted in and makes sure email is one of your channels;
  // unticking clears the stamp. The Notifier sends it only to people with the stamp and email on.
  if (typeof body.digest === "boolean") {
    const { data: cur } = await me.db.from("user_profiles").select("notify_channels, audit_emails").eq("user_id", me.userId).maybeSingle()
    const ch: string[] = (update.notify_channels as string[] | undefined) ?? cur?.notify_channels ?? []
    const au: string[] = (update.audit_emails as string[] | undefined) ?? cur?.audit_emails ?? []
    update.email_digest_opt_in_at = body.digest ? new Date().toISOString() : null
    if (body.digest && !ch.includes("email")) update.notify_channels = [...ch, "email"]
    update.audit_emails = body.digest ? [...new Set([...au, "weekly"])] : au.filter((x) => x !== "weekly")
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to change." }, { status: 400 })
  const { error } = await me.db.from("user_profiles").update(update).eq("user_id", me.userId)
  if (error) return NextResponse.json({ error: "Couldn't save that." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
