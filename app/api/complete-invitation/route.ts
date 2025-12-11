import { createClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    const { token, password, mobile, notify_channels } = await request.json()

    const { data: invitation, error: invitationError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("invitation_token", token)
      .eq("status", "pending")
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation token" }, { status: 400 })
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 })
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invitation.email,
      password: password,
    })

    if (authError || !authData.user) {
      console.error("[v0] Error creating auth user:", authError)
      return NextResponse.json({ error: authError?.message || "Failed to create account" }, { status: 400 })
    }

    const { error: profileError } = await supabase.from("user_profiles").insert({
      user_id: authData.user.id,
      first_name: invitation.first_name,
      last_name: invitation.last_name,
      email: invitation.email,
      mobile,
      company_id: invitation.company_id,
      role: invitation.role,
      region_access: invitation.region_access,
      notify_providers: invitation.notify_providers,
      notify_outage_types: invitation.notify_outage_types,
      notify_channels: notify_channels || ["email"],
    })

    if (profileError) {
      console.error("[v0] Error creating profile:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from("user_invitations")
      .update({
        status: "accepted",
      })
      .eq("invitation_token", token)

    if (updateError) {
      console.error("[v0] Error updating invitation:", updateError)
    }

    // Auto sign-in the user
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password: password,
    })

    if (signInError) {
      console.error("[v0] Error signing in:", signInError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Complete invitation error:", error)
    return NextResponse.json({ error: error.message || "Failed to complete setup" }, { status: 500 })
  }
}
