"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Wordmark } from "@/components/brand/wordmark"
import { DesktopInput } from "@/components/desktop-input"

export const dynamic = "force-dynamic"

// Wattle is invite-only. Someone signed in without an organisation lands here: either they use an admin's
// invitation (the link in the email), or they enter an access code from Wattle (WATTLE-XXXX-XXXX). The code is
// checked with check_access_code, then redeem_access_code makes their organisation (or their own account, for a
// one-person code) with them as its admin, and the plan that comes with the code. Same look as sign-in: no card.

type Code = { plan: "seed" | "bloom" | "gold"; site_limit: number; kind: "organisation" | "individual" | "either"; comped: boolean; plan_days: number | null }

const PLAN: Record<Code["plan"], string> = { seed: "Wattle Seed", bloom: "Bloom", gold: "Gold" }

const letters = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean)
  return (w.length > 1 ? w.slice(0, 2).map((x) => x[0]).join("") : (w[0] ?? "").slice(0, 2)).toUpperCase()
}

const friendly = (e: { code?: string; message?: string } | null) =>
  e?.code === "54000" ? "Too many tries. Try again in an hour."
    : e?.code === "22023" || e?.code === "42501" ? e.message ?? "That didn't work."
    : "Something went wrong. Try again."

const btn = "w-full h-12 rounded-full font-rounded text-base font-semibold text-[#24211C] bg-[#F2B300] hover:bg-[#F5C023] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"

export default function Join() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [code, setCode] = useState("")
  const [found, setFound] = useState<Code | null>(null)
  const [solo, setSolo] = useState(false)
  const [name, setName] = useState("")
  const [first, setFirst] = useState("")
  const [last, setLast] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // signed out → sign in; already in an organisation → the portal
  useEffect(() => {
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) { router.replace("/login"); return }
      const { data: p } = await supabase.from("user_profiles").select("company_id, first_name, last_name").eq("user_id", u.user.id).maybeSingle()
      if (p?.company_id) { router.replace("/overview"); return }
      setFirst(p?.first_name ?? "")
      setLast(p?.last_name ?? "")
      setReady(true)
    })()
  }, [router])

  const check = async (e: React.FormEvent) => {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    if (!c) return
    setBusy(true); setError(null)
    const { data, error } = await supabase.rpc("check_access_code", { p_code: c } as any)
    setBusy(false)
    if (error) { setError(friendly(error)); return }
    const row = (Array.isArray(data) ? data[0] : data) as Code | undefined
    if (!row) { setError("That code doesn't work. Check it against the one you were sent."); return }
    setFound(row)
    setSolo(row.kind === "individual")
  }

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!found) return
    const title = solo ? `${first} ${last}`.trim() : name.trim()
    if (!title) { setError(solo ? "Add your name." : "Give your organisation a name."); return }
    setBusy(true); setError(null)
    const { data, error } = await supabase.rpc("redeem_access_code", {
      p_code: code.trim().toUpperCase(), p_name: title, p_individual: solo,
      p_first: first, p_last: last, p_letters: letters(title), p_bg: "#F2B300", p_fg: "#24211C",
    } as any)
    if (error || !data) {
      setBusy(false)
      setError(error ? friendly(error) : "That code doesn't work any more. It may have been used or switched off.")
      return
    }
    router.replace("/overview")
  }

  const plan = found && (
    <p className="mt-1 text-sm text-[#6F685C]">
      {PLAN[found.plan]}, up to {found.site_limit.toLocaleString("en-AU")} {found.site_limit === 1 ? "site" : "sites"}
      {found.comped ? ", on us" : found.plan_days ? `, for ${found.plan_days} days` : ""}.
    </p>
  )

  return (
    <main className="min-h-mobile w-full bg-[#FBF8F2] px-6 py-10 md:py-16">
      <div className="mx-auto w-full max-w-[420px]">
        <Link href="/" aria-label="Wattle home" className="inline-flex text-[#24211C] hover:text-[#24211C]">
          <Wordmark height={44} />
        </Link>
        {!ready ? null : !found ? (
          <form className="mt-10" onSubmit={check}>
            <h1 className="font-rounded text-2xl font-bold text-[#24211C]">Join Wattle</h1>
            <p className="mt-1 mb-6 text-sm leading-relaxed text-[#6F685C]">
              Wattle is invite-only. If someone in your organisation invited you, use the link in their email.
              Otherwise, enter the access code you were given.
            </p>
            <DesktopInput label="Access code" placeholder="WATTLE-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            {error && <p role="alert" className="mt-3 text-sm text-[#B4471F]">{error}</p>}
            <button type="submit" className={`${btn} mt-6`} disabled={busy || code.trim().length < 8}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : "Continue"}
            </button>
            <p className="mt-8 text-center text-sm text-[#6F685C]">
              No code? <a className="font-semibold text-[#24211C] underline decoration-[#F2B300] underline-offset-4" href="mailto:gridalert@arctiqservices.com.au">Get in touch</a>
            </p>
          </form>
        ) : (
          <form className="mt-10" onSubmit={redeem}>
            <h1 className="font-rounded text-2xl font-bold text-[#24211C]">{solo ? "Set up your account" : "Name your organisation"}</h1>
            {plan}
            {found.kind === "either" && (
              <div className="mt-6 inline-flex rounded-full bg-[#EFE9DD] p-1 text-sm font-semibold font-rounded" role="radiogroup">
                {[{ v: false, l: "An organisation" }, { v: true, l: "Just me" }].map((o) => (
                  <button key={o.l} type="button" role="radio" aria-checked={solo === o.v} onClick={() => setSolo(o.v)}
                    className={`rounded-full px-4 py-1.5 ${solo === o.v ? "bg-white text-[#24211C] shadow-sm" : "text-[#6F685C]"}`}>{o.l}</button>
                ))}
              </div>
            )}
            <div className="mt-6 space-y-4">
              {!solo && <DesktopInput label="Organisation name" placeholder="" value={name} onChange={(e) => setName(e.target.value)} />}
              <DesktopInput label="First name" placeholder="" value={first} onChange={(e) => setFirst(e.target.value)} />
              <DesktopInput label="Last name" placeholder="" value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
            {!solo && <p className="mt-3 text-sm text-[#6F685C]">You&apos;ll be its admin, and can invite your team from Organisation.</p>}
            {error && <p role="alert" className="mt-3 text-sm text-[#B4471F]">{error}</p>}
            <button type="submit" className={`${btn} mt-6`} disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</> : solo ? "Start using Wattle" : "Create organisation"}
            </button>
            <button type="button" className="mt-4 w-full text-center text-sm text-[#6F685C]" onClick={() => { setFound(null); setError(null) }}>
              Use a different code
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
