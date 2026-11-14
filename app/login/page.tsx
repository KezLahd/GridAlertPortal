"use client"

import Link from "next/link"
import { LoginForm } from "@/components/login-form"
import { Wordmark } from "@/components/brand/wordmark"

export const dynamic = "force-dynamic"

// Sign in, in the app's look: cream page, the wordmark, one line of what Wattle does, the form. No card.
export default function Page() {
  return (
    <main className="min-h-mobile w-full bg-[#FBF8F2] px-6 py-10 md:py-16">
      <div className="mx-auto w-full max-w-[420px]">
        <Link href="/" aria-label="Wattle home" className="inline-flex text-[#24211C] hover:text-[#24211C]">
          <Wordmark height={44} />
        </Link>
        <p className="mt-4 font-rounded text-xl font-semibold leading-snug text-[#6F685C]">
          Power outages near your clinics, as they happen.
        </p>
        <div className="mt-10">
          <LoginForm />
        </div>
        <p className="mt-8 text-center text-sm text-[#6F685C]">Same account as the Wattle app.</p>
      </div>
    </main>
  )
}
