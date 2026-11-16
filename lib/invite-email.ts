// The invite email: a two-step welcome. Set up your account on the web (the 7-day link), then get Wattle on your iPhone
// or Mac and sign in with the same email. The app link comes from WATTLE_APP_LINK (the public TestFlight link for now,
// the App Store link later), so it can change without a code change; with no link set, step 2 just says where to look.

const esc = (s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))

// single quotes inside: these go into style="…" attributes
const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro', 'Helvetica Neue', Arial, sans-serif`
const ROUNDED = `ui-rounded, 'SF Pro Rounded', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif`
const INK = "#24211C", SOFT = "#5E574B", FAINT = "#8A8170", GOLD = "#F2B300"

export function appLink() {
  const l = (process.env.WATTLE_APP_LINK ?? "").trim()
  return /^https:\/\//.test(l) ? l : null
}

export function inviteEmail(o: { firstName?: string | null; inviter?: string | null; company?: string | null; inviteUrl: string; appUrl?: string | null }) {
  const company = esc(o.company || "your company")
  const who = o.inviter?.trim() ? `${esc(o.inviter.trim())} has` : "You've been"
  const button = (href: string, label: string, gold: boolean) =>
    `<a href="${esc(href)}" style="display:inline-block;padding:12px 22px;border-radius:999px;font-family:${ROUNDED};font-weight:600;font-size:15px;text-decoration:none;${gold ? `background:${GOLD};color:${INK};` : `border:1.5px solid ${INK};color:${INK};`}">${label}</a>`
  const step = (n: number, title: string, body: string) => `
    <tr>
      <td valign="top" style="width:36px;padding:0 0 28px 0;">
        <div style="width:26px;height:26px;border-radius:13px;background:${GOLD};color:${INK};font-family:${ROUNDED};font-weight:700;font-size:14px;line-height:26px;text-align:center;">${n}</div>
      </td>
      <td valign="top" style="padding:2px 0 28px 0;font-family:${FONT};">
        <div style="font-family:${ROUNDED};font-weight:700;font-size:17px;color:${INK};margin:0 0 6px 0;">${title}</div>
        ${body}
      </td>
    </tr>`
  const p = (t: string) => `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.5;color:${SOFT};">${t}</p>`

  const html = `
  <div style="background:#FBF8F1;padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;font-family:${FONT};color:${INK};">
      <div style="font-family:${ROUNDED};font-weight:700;font-size:22px;color:${INK};margin:0 0 24px 0;"><img src="https://wattle.mjsons.net/apple-icon.png" width="32" height="32" alt="" style="vertical-align:middle;border-radius:8px;margin-right:8px;" />Wattle</div>
      <h1 style="font-family:${ROUNDED};font-weight:700;font-size:26px;line-height:1.2;margin:0 0 12px 0;color:${INK};">Welcome to Wattle${o.firstName ? `, ${esc(o.firstName)}` : ""}</h1>
      ${p(`${who} invited you to ${company}&rsquo;s Wattle, which watches the power at your clinics and pharmacies and tells you when an outage is coming or under way.`)}
      <p style="margin:0 0 28px 0;font-size:15px;line-height:1.5;color:${SOFT};">Two steps and you&rsquo;re in.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        ${step(1, "Set up your account", `
          ${p("Choose your password and how you&rsquo;d like to hear about outages.")}
          <div style="margin:4px 0 0 0;">${button(o.inviteUrl, "Set up your account", true)}</div>
          <p style="margin:10px 0 0 0;font-size:13px;color:${FAINT};">This link works for 7 days.</p>`)}
        ${step(2, "Get Wattle on your iPhone or Mac", `
          ${p("Then sign in to the app with the same email. It&rsquo;s where outage alerts arrive, the moment the network posts them.")}
          ${o.appUrl
            ? `<div style="margin:4px 0 0 0;">${button(o.appUrl, "Get Wattle", false)}</div>`
            : p(`${o.inviter?.trim() ? esc(o.inviter.trim()) : "Your admin"} will send you the link to the app.`)}
          <p style="margin:14px 0 0 0;font-size:14px;line-height:1.5;color:${SOFT};"><strong style="color:${INK};">Tip:</strong> when the app offers a passkey, say yes. Wattle asks you to sign in again after a day away, and a passkey does that in a second with Face ID or Touch ID.</p>`)}
      </table>
      <p style="margin:8px 0 0 0;font-size:13px;line-height:1.5;color:${FAINT};">If you weren&rsquo;t expecting this, you can ignore it and nothing will happen.</p>
    </div>
  </div>`

  const text = [
    `Welcome to Wattle${o.firstName ? `, ${o.firstName}` : ""}`,
    "",
    `${o.inviter?.trim() ? `${o.inviter.trim()} has` : "You've been"} invited you to ${o.company || "your company"}'s Wattle.`,
    "",
    "1. Set up your account (the link works for 7 days):",
    o.inviteUrl,
    "",
    "2. Get Wattle on your iPhone or Mac and sign in with the same email.",
    o.appUrl ?? `${o.inviter?.trim() || "Your admin"} will send you the link to the app.`,
    "",
    "Tip: when the app offers a passkey, say yes. Wattle asks you to sign in again after a day away, and a passkey does that in a second.",
  ].join("\n")

  return { html, text }
}
