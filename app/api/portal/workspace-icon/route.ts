import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { adminsOnly, caller, isAdmin, signInFirst } from "@/lib/session-auth"

// The workspace photo, done the app's way: the browser crops it to a 512 px square JPEG; this saves it under a new
// name in the company's folder of the private workspace-icons bucket, points logo_path at it and deletes the old one.
// DELETE takes the photo away, so the letters show again. Admins only.

export const dynamic = "force-dynamic"
const BUCKET = "workspace-icons"
const MAX = 2 * 1024 * 1024

async function current(me: NonNullable<Awaited<ReturnType<typeof caller>>>) {
  const { data } = await me.db.from("companies").select("logo_path").eq("id", me.companyId).maybeSingle()
  const p = (data as any)?.logo_path as string | null | undefined
  return p && p.startsWith(`${me.companyId}/`) ? p : null
}

export async function POST(req: Request) {
  const me = await caller(req)
  if (!me) return signInFirst()
  if (!isAdmin(me)) return adminsOnly()
  const type = req.headers.get("content-type") ?? ""
  if (type !== "image/jpeg" && type !== "image/png") return NextResponse.json({ error: "Send a JPEG or PNG." }, { status: 415 })
  const body = Buffer.from(await req.arrayBuffer())
  if (!body.length || body.length > MAX) return NextResponse.json({ error: "The photo needs to be under 2 MB." }, { status: 413 })

  const old = await current(me)
  const path = `${me.companyId}/icon-${randomBytes(4).toString("hex")}.${type === "image/png" ? "png" : "jpg"}`
  const up = await me.db.storage.from(BUCKET).upload(path, body, { contentType: type, upsert: false })
  if (up.error) return NextResponse.json({ error: "Couldn't save the photo." }, { status: 500 })
  const { error } = await me.db.from("companies").update({ logo_path: path }).eq("id", me.companyId)
  if (error) {
    await me.db.storage.from(BUCKET).remove([path])
    return NextResponse.json({ error: "Couldn't save the photo." }, { status: 500 })
  }
  if (old) await me.db.storage.from(BUCKET).remove([old])
  const { data: signed } = await me.db.storage.from(BUCKET).createSignedUrl(path, 3600)
  return NextResponse.json({ ok: true, url: signed?.signedUrl ?? null })
}

export async function DELETE(req: Request) {
  const me = await caller(req)
  if (!me) return signInFirst()
  if (!isAdmin(me)) return adminsOnly()
  const old = await current(me)
  const { error } = await me.db.from("companies").update({ logo_path: null }).eq("id", me.companyId)
  if (error) return NextResponse.json({ error: "Couldn't remove the photo." }, { status: 500 })
  if (old) await me.db.storage.from(BUCKET).remove([old])
  return NextResponse.json({ ok: true })
}
