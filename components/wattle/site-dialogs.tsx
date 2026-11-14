"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { AddPoiDialog } from "@/components/add-poi-dialog"
import { PoiEditDialog } from "@/components/poi-edit-dialog"
import { ImportCsvDialog } from "@/components/import-csv-dialog"
import type { PoiLocation } from "@/components/poi-locations-table"
import { headers, usePortal } from "./data"

// Add, edit and import sites from the new pages, using the same dialogs and the same saves as the old profile page:
// edits go through /api/update-poi (admins only, checked on the server); new sites are inserted under RLS.

type AddData = Parameters<React.ComponentProps<typeof AddPoiDialog>["onSave"]>[0]

const toPoi = (row: any): PoiLocation => ({
  id: row.id, institution_code: row.institutioncode, poi_name: row.institutionname, street_address: row.addressline1,
  city: row.addresssuburb, state: row.addressstate, postcode: row.addresspostcode, country: "Australia", contact_name: null,
  contact_email: row.institutionemail, contact_phone: row.institutionphoneno, latitude: row.addresslatitude,
  longitude: row.addresslongitude, created_at: row.created_at, institutionstatus: row.institutionstatus || null,
  provider: row.provider || null,
  ...({ institutionnickname: row.institutionnickname || null, pharmacyid: row.pharmacyid || null, institutionmappedstate: row.institutionmappedstate || null,
    sitekeyaccess: row.sitekeyaccess || null, addressline2: row.addressline2 || null, addressline3: row.addressline3 || null } as any),
})

async function providerFor(lat?: number | null, lng?: number | null, postcode?: string | null, state?: string | null) {
  try {
    const { determineProviderForLocation } = await import("@/lib/provider-assignment")
    return await determineProviderForLocation(lat || 0, lng || 0, postcode || null, state || null)
  } catch { return null }
}

export function useSiteDialogs(toast: (m: string) => void) {
  const { data, reload } = usePortal()
  const [add, setAdd] = useState(false)
  const [imp, setImp] = useState(false)
  const [edit, setEdit] = useState<PoiLocation | null>(null)
  const [saving, setSaving] = useState(false)
  const companyId = data?.companyId ?? ""

  const openEdit = async (id: string) => {
    const { data: row, error } = await supabase.from("locations")
      .select("id, institutioncode, institutionname, institutionnickname, pharmacyid, institutionemail, institutionmappedstate, institutionstatus, sitekeyaccess, institutionphoneno, addressline1, addressline2, addressline3, addresssuburb, addressstate, addresspostcode, addresslatitude, addresslongitude, created_at, provider")
      .eq("id", id).maybeSingle()
    if (error || !row) { toast("Couldn't open that site."); return }
    setEdit(toPoi(row))
  }

  const saveEdit = async (locationId: string, u: Partial<PoiLocation>) => {
    const d: Record<string, unknown> = {}
    const x = u as any
    if (u.poi_name !== undefined) d.institutionname = u.poi_name
    if (u.institution_code !== undefined) d.institutioncode = u.institution_code
    if (u.street_address !== undefined) d.addressline1 = u.street_address
    if (u.city !== undefined) d.addresssuburb = u.city
    if (u.state !== undefined) d.addressstate = u.state
    if (u.postcode !== undefined) d.addresspostcode = u.postcode
    if (u.contact_email !== undefined) d.institutionemail = u.contact_email
    if (u.contact_phone !== undefined) d.institutionphoneno = u.contact_phone
    if (u.latitude !== undefined) d.addresslatitude = u.latitude
    if (u.longitude !== undefined) d.addresslongitude = u.longitude
    if (x.institutionNickname !== undefined) d.institutionnickname = x.institutionNickname
    if (x.pharmacy_id !== undefined) d.pharmacyid = x.pharmacy_id || null
    if (x.siteKeyAccess !== undefined) d.sitekeyaccess = x.siteKeyAccess ? 1 : null
    const status = x.institutionStatus ?? x.institutionstatus
    if (status !== undefined) d.institutionstatus = status || "ACTIVE"
    if (u.latitude !== undefined && u.longitude !== undefined) {
      const p = await providerFor(u.latitude, u.longitude, u.postcode, u.state)
      if (p) d.provider = p
    }
    const res = await fetch("/api/update-poi", { method: "POST", headers: await headers(), body: JSON.stringify({ locationId, companyId, locationData: d }) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || "Couldn't save the site.")
    toast("Site saved")
    setEdit(null)
    await reload()
  }

  const saveNew = async (a: AddData) => {
    setSaving(true)
    try {
      const { error } = await supabase.from("locations").insert({
        company_id: companyId, institutionstatus: "ACTIVE",
        institutionname: a.poiName, addressline1: a.addressLine1 || a.location, addressline2: a.addressLine2 || null,
        addressline3: a.addressLine3 || null, addresssuburb: a.addressSuburb || null, addressstate: a.state || null,
        institutionmappedstate: a.state || null, addresspostcode: a.postcode || null, addresslatitude: a.latitude,
        addresslongitude: a.longitude, institutionemail: a.contactEmail || null, institutionphoneno: a.contactPhone || null,
        institutioncode: a.institutionCode || null, institutionnickname: a.institutionNickname || null,
        pharmacyid: a.pharmacyId || null, sitekeyaccess: a.siteKeyAccess ? 1 : null,
        provider: await providerFor(a.latitude, a.longitude, a.postcode, a.state),
      })
      if (error) throw error
      toast("Site added")
      setAdd(false)
      await reload()
    } finally { setSaving(false) }
  }

  const dialogs = companyId ? (
    <>
      <AddPoiDialog open={add} onOpenChange={setAdd} onSave={saveNew} saving={saving} location={null} companyId={companyId} />
      <PoiEditDialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null) }} location={edit} onSave={saveEdit} companyId={companyId} />
      <ImportCsvDialog open={imp} onOpenChange={setImp} companyId={companyId} onSuccess={() => { toast("Sites imported"); reload() }} />
    </>
  ) : null

  return { openAdd: () => setAdd(true), openImport: () => setImp(true), openEdit, dialogs }
}

/** A short message at the bottom of the page. */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg((x) => (x === m ? null : x)), 3500) }
  return { show, toast: msg ? <div className="toast glass">{msg}</div> : null }
}
