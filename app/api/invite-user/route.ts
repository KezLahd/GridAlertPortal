import { createClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    const {
      email,
      first_name,
      last_name,
      role,
      region_access,
      notify_providers,
      notify_outage_types,
      company_id,
      invited_by,
    } = await request.json()

    const { data: existingInvitation } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("email", email)
      .eq("company_id", company_id)
      .single()

    const invitationToken = crypto.randomUUID()

    let invitation

    if (existingInvitation) {
      // Update existing invitation
      const { data, error: updateError } = await supabase
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
      const { data, error: invitationError } = await supabase
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
    const { data: company } = await supabase.from("companies").select("name").eq("id", company_id).single()

    const { data: admin } = await supabase
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

    // Send invitation email using Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "GridAlert <onboarding@resend.dev>",
        to: email,
        subject: `You've been invited to ${company?.name || "a company"}'s GridAlert portal`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Welcome to GridAlert!</h2>
            <p>Hi ${first_name},</p>
            <p>${admin?.first_name} ${admin?.last_name} has invited you to join <strong>${company?.name}</strong>'s GridAlert portal to view live outage data and receive notifications.</p>
            <p>To complete your account setup, please click the link below:</p>
            <p style="margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Account Setup</a>
            </p>
            <p>You'll need to:</p>
            <ul>
              <li>Set your password</li>
              <li>Add your mobile number (optional)</li>
              <li>Configure notification preferences</li>
            </ul>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>Best regards,<br/>The GridAlert Team</p>
          </div>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const error = await emailResponse.text()
      console.error("[v0] Error sending email:", error)
      // Don't fail the whole operation if email fails
    }

    return NextResponse.json({ success: true, invitation })
  } catch (error: any) {
    console.error("[v0] Invite user error:", error)
    return NextResponse.json({ error: error.message || "Failed to invite user" }, { status: 500 })
  }
}
