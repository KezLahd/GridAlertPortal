"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/heroui"
import { cn } from "@/lib/utils"
import {
  type Mouse as House,
  CloudLightning,
  ClipboardList,
  CalendarClock,
  User,
  LogOut,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

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
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string>("user@company.com")
  // Always start with false to match server render, then update after mount
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [iconLetters, setIconLetters] = useState<string>("")
  const [iconBgColor, setIconBgColor] = useState<string>("#FF8E32")
  const [iconTextColor, setIconTextColor] = useState<string>("#1f1f22")

  // Load collapsed state from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed")
    if (saved === "true") {
      setIsCollapsed(true)
    }
  }, [])

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) return

      const email = data.user.email ?? userEmail
      setUserEmail(email)

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("first_name,last_name,email,icon_letters,icon_bg_color,icon_text_color")
        .eq("user_id", data.user.id)
        .maybeSingle()

      const metaFirst = (data.user.user_metadata?.first_name as string | undefined)?.trim()
      const metaLast = (data.user.user_metadata?.last_name as string | undefined)?.trim()
      const fullName = (data.user.user_metadata?.full_name as string | undefined)?.trim()

      const profileFirst = profile?.first_name?.trim()
      const profileLast = profile?.last_name?.trim()

      const [fullFirst, fullLast] =
        fullName?.split(" ")?.length && fullName.split(" ").length >= 2
          ? [fullName.split(" ")[0], fullName.split(" ").slice(1).join(" ")]
          : [undefined, undefined]

      setFirstName(profileFirst || metaFirst || fullFirst || "")
      setLastName(profileLast || metaLast || fullLast || "")
      
      // Set icon fields
      if (profile?.icon_letters) {
        setIconLetters(profile.icon_letters)
      }
      if (profile?.icon_bg_color) {
        setIconBgColor(profile.icon_bg_color)
      }
      if (profile?.icon_text_color) {
        setIconTextColor(profile.icon_text_color)
      }
    }
    loadUser()

    // Listen for icon update events
    const handleIconUpdate = () => {
      loadUser()
    }
    window.addEventListener("userIconUpdated", handleIconUpdate)

    return () => {
      window.removeEventListener("userIconUpdated", handleIconUpdate)
    }
  }, [])

  const displayName = (() => {
    const combined = `${firstName ?? ""} ${lastName ?? ""}`.trim()
    if (combined) return combined
    if (userEmail) return userEmail.split("@")[0]
    return "User"
  })()

  const displayInitials = (() => {
    if (iconLetters) return iconLetters
    const first = firstName?.trim()?.[0]
    const last = lastName?.trim()?.[0]
    if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase()
    return (userEmail?.slice(0, 2) || "U").toUpperCase()
  })()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  // Update pending path when pathname changes
  useEffect(() => {
    if (pathname) {
      setPendingPath(null)
    }
  }, [pathname])

  const onProfile = pendingPath === "/profile" || pathname.startsWith("/profile")

  return (
    <aside
      suppressHydrationWarning
      className={cn(
        "relative sticky top-0 z-40 flex h-screen flex-none shrink-0 flex-col overflow-hidden bg-gradient-to-b from-orange-500 via-amber-400 to-orange-600 opacity-80 text-[#1f1f22] shadow-lg",
        // Only apply transition after initial mount to prevent flicker
        "transition-all duration-300",
        isCollapsed ? "w-20" : "w-72",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.22),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.16),transparent_35%)]" />
      <div className="relative flex flex-col h-full p-5 gap-7">
        <div className="flex items-center justify-between gap-2">
          <div suppressHydrationWarning className={cn("flex items-center gap-2", isCollapsed && "justify-center w-full")}>
            <Zap className="h-6 w-6 text-black drop-shadow-[0_0_10px_rgba(0,0,0,0.3)] flex-shrink-0" />
            {!isCollapsed && <span className="text-2xl font-bold text-black drop-shadow">GridAlert</span>}
          </div>
          {!isCollapsed && (
            <Button
              isIconOnly
              variant="light"
              onPress={() => {
                setIsCollapsed(true)
                localStorage.setItem("sidebarCollapsed", "true")
              }}
              className="h-8 w-8 text-black hover:bg-white/30"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        {isCollapsed && (
          <Button
            isIconOnly
            variant="light"
            onPress={() => {
              setIsCollapsed(false)
              localStorage.setItem("sidebarCollapsed", "false")
            }}
            className="h-8 w-8 text-black hover:bg-white/30 -mt-5 mx-auto"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        <div className="h-px w-full bg-black/80 shadow-[0_1px_0_rgba(0,0,0,0.35)]" aria-hidden="true" />

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (pathname.startsWith(item.href + "/") && pathname !== "/")
            return (
              <Button
                key={item.href}
                variant={active ? "solid" : "light"}
                className={cn(
                  "w-full flex items-center rounded-lg px-3 py-3 text-base font-semibold text-[#1f1f22]",
                  active ? "bg-black text-white shadow-md" : "hover:bg-white/30",
                  isCollapsed ? "justify-center min-w-0" : "justify-start gap-3",
                )}
                onPress={() => {
                  router.push(item.href)
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-white" : "text-[#1f1f22]")} />
                {!isCollapsed && <span className={cn(active ? "text-white" : "text-[#1f1f22]")}>{item.label}</span>}
              </Button>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className={cn("rounded-xl bg-white/90 p-3 shadow-md space-y-3", isCollapsed && "p-2")}>
            {!isCollapsed ? (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full font-semibold uppercase flex-shrink-0"
                    style={{
                      backgroundColor: iconBgColor,
                      color: iconTextColor,
                    }}
                  >
                    {displayInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1f1f22] truncate">{displayName}</p>
                    <p className="text-xs text-[#1f1f22] truncate">{userEmail}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant={onProfile ? "solid" : "bordered"}
                    className={cn(
                      "w-full border-orange-300 text-[#1f1f22] bg-white/80 hover:bg-white",
                      onProfile && "border-transparent bg-[#1f1f22] text-white hover:bg-[#1f1f22]",
                    )}
                    onPress={() => {
                      setPendingPath("/profile")
                      router.push("/profile")
                    }}
                  >
                    <User className={cn("h-4 w-4 mr-2", onProfile && "text-white")} />
                    <span className={cn(onProfile && "text-white")}>Profile</span>
                  </Button>
                  <Button
                    variant="light"
                    className="w-full text-[#1f1f22] hover:bg-orange-100/80"
                    onPress={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Button
                  isIconOnly
                  variant={onProfile ? "solid" : "light"}
                  className={cn(
                    "h-10 w-10 text-[#1f1f22] hover:bg-orange-100/80",
                    onProfile && "bg-[#1f1f22] text-white hover:bg-[#1f1f22]",
                  )}
                  onPress={() => {
                    setPendingPath("/profile")
                    router.push("/profile")
                  }}
                  title="Profile"
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button
                  isIconOnly
                  variant="light"
                  className="h-10 w-10 text-[#1f1f22] hover:bg-orange-100/80"
                  onPress={handleLogout}
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-2 px-1 py-1 text-xs text-[#1f1f22]">
              <div className="h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_12px_rgba(190,242,100,0.9)]" />
              Live grid status
            </div>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center">
              <div
                className="h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_12px_rgba(190,242,100,0.9)]"
                title="Live grid status"
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
