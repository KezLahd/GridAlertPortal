import { createServiceClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const dbClient = createServiceClient() // Use service client to bypass RLS

    const { poiIds, companyId } = await request.json()

    if (!poiIds || !Array.isArray(poiIds) || poiIds.length === 0) {
      return NextResponse.json({ error: "No POI IDs provided" }, { status: 400 })
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 })
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

