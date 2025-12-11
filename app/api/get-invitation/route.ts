import { createClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const supabase = createClient()

    const { data: invitation, error } = await supabase
      .from("user_invitations")
      .select("*, companies(name)")
      .eq("invitation_token", token)
      .eq("status", "pending")
      .single()

    if (error || !invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation token" }, { status: 404 })
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 })
    }

    return NextResponse.json({ invitation })
  } catch (error: any) {
    console.error("[v0] Get invitation error:", error)
    return NextResponse.json({ error: error.message || "Failed to get invitation" }, { status: 500 })
  }
}
