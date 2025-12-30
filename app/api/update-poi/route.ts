import { createServiceClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const dbClient = createServiceClient() // Use service client to bypass RLS

    const { locationId, companyId, locationData } = await request.json()

    if (!locationId) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 })
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 })
    }

    if (!locationData) {
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

