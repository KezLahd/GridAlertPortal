import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.supabase_Secret_key

type GridalertClient = SupabaseClient<any, "gridalert">

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
}

let browserClient: GridalertClient | null = null

export const getSupabaseClient = (): GridalertClient => {
  if (!browserClient) {
    browserClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
      },
      db: { schema: "gridalert" },
    })
  }
  return browserClient
}

export const createClient = (): GridalertClient => {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
    },
    db: { schema: "gridalert" },
  })
}

export const createServiceClient = (): GridalertClient => {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY for server-side admin operations.")
  }
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
    db: { schema: "gridalert" },
  })
}

export const supabase: GridalertClient = getSupabaseClient()
