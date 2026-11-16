import { createClient } from "@/lib/supabase"
import { adminsOnly, caller, isAdmin } from "@/lib/session-auth"
import { NextResponse } from "next/server"
import { appLink, inviteEmail } from "@/lib/invite-email"

export async function POST(request: Request) {
  try {
    const supabase = createClient() // For email sending
    // only an admin can invite, and only into their own company, as themselves
    const me = await caller(request)
    if (!isAdmin(me)) return adminsOnly()
    const dbClient = me.db

    const {
      email,
      first_name,
      last_name,
      role,
      region_access,
      notify_providers,
      notify_outage_types,
    } = await request.json()
    const company_id = me.companyId
    const invited_by = me.userId
    if (!["admin", "manager", "member"].includes(role)) {
      return NextResponse.json({ error: "Unknown role" }, { status: 400 })
    }

    const { data: existingInvitation } = await dbClient
      .from("user_invitations")
      .select("*")
      .eq("email", email)
      .eq("company_id", company_id)
      .single()

    const invitationToken = crypto.randomUUID()
    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    let invitation

    if (existingInvitation) {
      // Update existing invitation
      const { data, error: updateError } = await dbClient
        .from("user_invitations")
        .update({
          first_name,
          last_name,
          role,
          region_access,
          notify_providers,
          notify_outage_types,
          invitation_token: invitationToken,
          invited_by,
          status: "pending",
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        })
        .eq("id", existingInvitation.id)
        .select()
        .single()

      if (updateError) {
        console.error("[v0] Error updating invitation:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }
      invitation = data
    } else {
      // Create new invitation
      const { data, error: invitationError } = await dbClient
        .from("user_invitations")
        .insert({
          email,
          first_name,
          last_name,
          company_id,
          role,
          region_access,
          notify_providers,
          notify_outage_types,
          invitation_token: invitationToken,
          invited_by,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (invitationError) {
        console.error("[v0] Error creating invitation:", invitationError)
        return NextResponse.json({ error: invitationError.message }, { status: 400 })
      }
      invitation = data
    }

    // Get company name and admin info for the email
    const { data: company } = await dbClient.from("companies").select("name").eq("id", company_id).single()

    const { data: admin } = await dbClient
      .from("user_profiles")
      .select("first_name, last_name")
      .eq("user_id", invited_by)
      .single()

    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL
    const normalizedAppUrl = (() => {
      if (envAppUrl && envAppUrl.startsWith("http")) return envAppUrl
      if (envAppUrl) return `http://${envAppUrl}`
      return "http://localhost:3000"
    })()
    const inviteUrl = `${normalizedAppUrl.replace(/\/$/, "")}/setup-account?token=${invitationToken}`

    const mail = inviteEmail({
      firstName: first_name, company: company?.name, inviteUrl, appUrl: appLink(),
      inviter: [admin?.first_name, admin?.last_name].filter(Boolean).join(" "),
    })

    // Send invitation email using Resend
    let emailSent = false
    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Wattle <gridalert@mjsons.net>",
          to: email,
          subject: `You've been invited to ${company?.name || "a company"}'s Wattle`,
          html: mail.html,
          text: mail.text,
        }),
      })

      if (emailResponse.ok) {
        emailSent = true
      } else {
        const error = await emailResponse.text()
        console.error("[v0] Error sending email:", error)
      }
    } catch (emailError) {
      console.error("[v0] Error sending email:", emailError)
    }

    return NextResponse.json({ success: true, invitation, emailSent })
  } catch (error: any) {
    console.error("[v0] Invite user error:", error)
    return NextResponse.json({ error: error.message || "Failed to invite user" }, { status: 500 })
  }
}
