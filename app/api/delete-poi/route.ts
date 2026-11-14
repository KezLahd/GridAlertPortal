import { adminsOnly, caller, isAdmin } from "@/lib/session-auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // admins of the sites' own company only; the company comes from the caller, not the request
    const me = await caller(request)
    if (!isAdmin(me)) return adminsOnly()
    const dbClient = me.db
    const companyId = me.companyId

    const { poiIds } = await request.json()

    if (!poiIds || !Array.isArray(poiIds) || poiIds.length === 0) {
      return NextResponse.json({ error: "No POI IDs provided" }, { status: 400 })
    }

    // Delete POIs with company_id check for security
    const { error: deleteError, data } = await dbClient
      .from("locations")
      .delete()
      .in("id", poiIds)
      .eq("company_id", companyId)
      .select()

    if (deleteError) {
      console.error("Error deleting POIs:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: data?.length || 0,
      deletedIds: data?.map(row => row.id) || []
    })
  } catch (error: any) {
    console.error("Delete POI error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete POIs" }, { status: 500 })
  }
}

