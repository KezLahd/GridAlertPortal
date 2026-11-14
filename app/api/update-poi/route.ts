import { adminsOnly, caller, isAdmin } from "@/lib/session-auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // admins of the site's own company only; the company comes from the caller, not the request
    const me = await caller(request)
    if (!isAdmin(me)) return adminsOnly()
    const dbClient = me.db
    const companyId = me.companyId

    const { locationId, locationData: raw } = await request.json()
    // these say which company and row the site is, so they can't be changed from here
    const { id: _id, company_id: _c, created_at: _ca, geom: _g, ...locationData } = (raw ?? {}) as Record<string, unknown>

    if (!locationId) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 })
    }

    if (!raw || Object.keys(locationData).length === 0) {
      return NextResponse.json({ error: "Location data is required" }, { status: 400 })
    }

    // Update POI with company_id check for security
    const { error: updateError, data } = await dbClient
      .from("locations")
      .update(locationData)
      .eq("id", locationId)
      .eq("company_id", companyId)
      .select("id, institutionstatus, pharmacyid, sitekeyaccess")

    if (updateError) {
      console.error("Error updating POI:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No rows were updated. Location may not exist or you don't have permission." }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      updatedLocation: data[0]
    })
  } catch (error: any) {
    console.error("Update POI error:", error)
    return NextResponse.json({ error: error.message || "Failed to update POI" }, { status: 500 })
  }
}

