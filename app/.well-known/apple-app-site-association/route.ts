// Apple's app-site association file: lets the Wattle app save and use passkeys for wattle.mjsons.net.
// Served as plain JSON at /.well-known/apple-app-site-association, with no redirect and no sign-in in front of it.

export const dynamic = "force-static"

export function GET() {
  return Response.json({ webcredentials: { apps: ["8QPPD49JQ5.com.kezlahd.wattle"] } })
}
