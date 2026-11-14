"use client"

// Organisation → Connections (admins only): read-only keys for the Claude connection and the data API.
// A new key is shown once, with the connector URL ready to paste into Claude.

import { useCallback, useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase"

interface KeyRow { id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null }

const day = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "never"

async function call(method: string, path: string, body?: any) {
  const { data } = await getSupabaseClient().auth.getSession()
  const r = await fetch(path, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json.error || `Request failed (${r.status})`)
  return json
}

export function ConnectionsPanel({ bare = false }: { bare?: boolean } = {}) {
  const [keys, setKeys] = useState<KeyRow[]>([])
  const [name, setName] = useState("")
  const [fresh, setFresh] = useState<{ name: string; connectorUrl: string; key: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setKeys((await call("GET", "/api/connections")).keys ?? []) } catch (e: any) { setError(e.message) }
  }, [])
  useEffect(() => { void load() }, [load])

  const make = async () => {
    setBusy(true); setError(null)
    try {
      const k = await call("POST", "/api/connections", { name: name || "Claude connection" })
      setFresh({ name: k.name, connectorUrl: k.connectorUrl, key: k.key })
      setName("")
      await load()
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  const revoke = async (k: KeyRow) => {
    if (!confirm(`Turn off "${k.name}"? Anything using it stops working straight away.`)) return
    try { await call("DELETE", `/api/connections?id=${k.id}`); await load() } catch (e: any) { setError(e.message) }
  }

  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1600)
  }

  const live = keys.filter((k) => !k.revoked_at)

  return (
    <section className={bare ? "" : "border-t border-[#E6DFD1] pt-8 mt-8"}>
      {!bare && <>
      <h2 className="text-xl font-bold text-[#24211C]" style={{ fontFamily: "var(--font-rounded)" }}>Connections</h2>
      <p className="mt-1 max-w-2xl text-sm text-[#6F685C]">
        Read-only keys for connecting Claude, or another system, to your sites and outages. A key can only read this
        organisation&apos;s data and can be turned off at any time.
      </p>
      </>}

      {fresh && (
        <div className="mt-5 max-w-3xl border-l-2 border-[#F2B300] pl-4">
          <p className="text-sm font-semibold text-[#24211C]">&ldquo;{fresh.name}&rdquo; is ready. Copy it now, it won&apos;t be shown again.</p>
          <p className="mt-3 text-xs uppercase tracking-wide text-[#6F685C]">Claude connector URL</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="block flex-1 truncate rounded-md bg-[#F3EEE3] px-3 py-2 text-xs text-[#24211C]">{fresh.connectorUrl}</code>
            <button onClick={() => copy(fresh.connectorUrl, "url")} className="rounded-full border border-[#E6DFD1] px-3 py-1.5 text-sm font-semibold text-[#24211C] hover:border-[#24211C]">
              {copied === "url" ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#6F685C]">
            In Claude: Settings → Connectors → Add custom connector, name it Wattle, paste this URL. For other systems,
            send the key as <code>Authorization: Bearer …</code> to <code>/api/v1/outages</code>.
          </p>
          <button onClick={() => copy(fresh.key, "key")} className="mt-2 text-xs font-semibold text-[#8A6400] hover:underline">
            {copied === "key" ? "Key copied" : "Copy the key on its own"}
          </button>
        </div>
      )}

      <div className="mt-5 flex max-w-xl gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Who or what it's for, e.g. Dad's Claude"
          className="flex-1 rounded-full border border-[#E6DFD1] bg-white px-4 py-2 text-sm text-[#24211C] outline-none focus:border-[#24211C]"
        />
        <button onClick={make} disabled={busy} className="rounded-full bg-[#F2B300] px-5 py-2 text-sm font-semibold text-[#24211C] hover:bg-[#F5C023] disabled:opacity-60">
          {busy ? "Making…" : "New connection"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[#B4441B]">{error}</p>}

      {live.length > 0 && (
        <ul className="mt-6 max-w-3xl divide-y divide-[#E6DFD1] border-y border-[#E6DFD1]">
          {live.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#24211C]">{k.name}</p>
                <p className="text-xs text-[#6F685C]">{k.key_prefix}… · made {day(k.created_at)} · last used {day(k.last_used_at)}</p>
              </div>
              <button onClick={() => revoke(k)} className="text-sm font-semibold text-[#6F685C] hover:text-[#B4441B]">Turn off</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
