import { NextResponse } from "next/server"
import { companyForKey, keyFrom, type KeyOwner } from "@/lib/wattle-data"

/** Runs a /api/v1 handler for the company that owns the request's key, or answers 401. */
export async function withKey(req: Request, fn: (owner: KeyOwner, url: URL) => Promise<Response>) {
  const owner = await companyForKey(keyFrom(req))
  if (!owner) {
    return NextResponse.json({ error: "Missing or invalid key. Send it as 'Authorization: Bearer wtl_…'." }, { status: 401 })
  }
  try {
    return await fn(owner, new URL(req.url))
  } catch (e) {
    console.error("[api v1]", e)
    return NextResponse.json({ error: "Something went wrong reading the data." }, { status: 500 })
  }
}

