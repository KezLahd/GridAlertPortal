"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { House, CloudLightning, ClipboardList, CalendarClock, User, LogOut, Zap } from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: typeof House
}

const navItems: NavItem[] = [
  { href: "/unplanned", label: "Unplanned", icon: CloudLightning },
  { href: "/planned", label: "Current planned", icon: ClipboardList },
  { href: "/future", label: "Future planned", icon: CalendarClock },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState<string>("User")
  const [userEmail, setUserEmail] = useState<string>("user@company.com")

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        const email = data.user.email ?? userEmail
        const name =
          (data.user.user_metadata?.full_name as string | undefined) ||
          (data.user.user_metadata?.name as string | undefined) ||
          email?.split("@")?.[0] ||
          "User"
        setUserName(name)
        setUserEmail(email)
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const onProfile = pathname.startsWith("/profile")

  return (
    <aside className="relative sticky top-0 z-40 flex h-screen w-72 flex-none shrink-0 flex-col overflow-hidden bg-gradient-to-b from-orange-500 via-amber-400 to-orange-600 opacity-80 text-[#1f1f22] shadow-lg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.22),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.16),transparent_35%)]" />
      <div className="relative flex flex-col h-full p-5 gap-7">
        <div className="flex items-center justify-center gap-2">
          <Zap className="h-6 w-6 text-black drop-shadow-[0_0_10px_rgba(0,0,0,0.3)]" />
          <span className="text-2xl font-bold text-black drop-shadow">GridAlert</span>
        </div>

        <div className="h-px w-full bg-black/80 shadow-[0_1px_0_rgba(0,0,0,0.35)]" aria-hidden="true" />

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold transition-colors text-[#1f1f22]",
                  active ? "bg-black text-white shadow-md" : "hover:bg-white/30",
                )}
              >
                <Icon className={cn("h-5 w-5", active ? "text-white" : "text-[#1f1f22]")} />
                <span className={cn(active ? "text-white" : "text-[#1f1f22]")}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl bg-white/90 p-3 shadow-md space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF8E32] text-[#1f1f22] font-semibold uppercase">
                {userName?.charAt(0) || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1f1f22] truncate">{userName}</p>
                <p className="text-xs text-[#1f1f22] truncate">{userEmail}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className={cn(
                  "w-full border-orange-300 text-[#1f1f22] bg-white/80 hover:bg-white",
                  onProfile && "border-transparent bg-[#1f1f22] text-white hover:bg-[#1f1f22]",
                )}
                asChild
              >
                <Link href="/profile">
                  <User className={cn("h-4 w-4 mr-2", onProfile && "text-white")} />
                  <span className={cn(onProfile && "text-white")}>Profile</span>
                </Link>
              </Button>
              <Button variant="ghost" className="w-full text-[#1f1f22] hover:bg-orange-100/80" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 px-1 py-1 text-xs text-[#1f1f22]">
            <div className="h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_12px_rgba(190,242,100,0.9)]" />
            Live grid status
          </div>
        </div>
      </div>
    </aside>
  )
}

