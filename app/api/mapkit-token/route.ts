import { NextResponse } from "next/server"
import { createPrivateKey, sign } from "crypto"

// Short-lived MapKit JS tokens, signed here with the MapKit key so the private key never reaches the browser.
// Needs three server-only env vars (Vercel → Settings → Environment Variables):
//   MAPKIT_TEAM_ID      the Apple Developer team ID
//   MAPKIT_KEY_ID       the Key ID of a key with "MapKit JS" enabled
//   MAPKIT_PRIVATE_KEY  the contents of that key's .p8 file (newlines as real newlines or as \n)
// Without them this returns 404 and the portal keeps using Google Maps.

export const dynamic = "force-dynamic"

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")

export async function GET(req: Request) {
  const team = process.env.MAPKIT_TEAM_ID
  const kid = process.env.MAPKIT_KEY_ID
  const pem = process.env.MAPKIT_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (!team || !kid || !pem) return NextResponse.json({ error: "MapKit not configured" }, { status: 404 })

  const now = Math.floor(Date.now() / 1000)
  const origin = req.headers.get("origin") ?? new URL(req.url).origin
  const header = { alg: "ES256", kid, typ: "JWT" }
  const payload = { iss: team, iat: now, exp: now + 30 * 60, origin }
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  try {
    const sig = sign("sha256", Buffer.from(input), { key: createPrivateKey(pem), dsaEncoding: "ieee-p1363" })
    return new NextResponse(`${input}.${b64url(sig)}`, {
      headers: { "content-type": "text/plain", "cache-control": "no-store" },
    })
  } catch {
    return NextResponse.json({ error: "MapKit key could not be read" }, { status: 500 })
  }
}
