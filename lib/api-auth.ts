import { NextResponse } from "next/server"
import { keyed, keyFrom, type KeyOwner } from "@/lib/wattle-data"

/** Runs a /api/v1 handler for the company that owns the request's key, or answers 401. Every call is logged. */
export async function withKey(req: Request, fn: (owner: KeyOwner, url: URL) => Promise<Response>) {
  const url = new URL(req.url)
  return keyed(req, keyFrom(req), url.pathname, (owner) => fn(owner, url), () =>
    NextResponse.json({ error: "Missing or invalid key. Send it as 'Authorization: Bearer wtl_…'." }, { status: 401 }))
}
