import { withKey } from "@/lib/api-auth"
import { outagesResponse } from "@/lib/outages-response"

export const dynamic = "force-dynamic"

/** GET /api/v1/outages: see lib/outages-response.ts for the parameters. */
export async function GET(req: Request) {
  return withKey(req, (owner, u) => outagesResponse(owner.companyId, owner.companyName, u))
}
