"use client"

import { Wordmark } from "@/components/brand/wordmark"

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
  const [iconBgColor, setIconBgColor] = useState<string>("#F2B300")
  const [iconTextColor, setIconTextColor] = useState<string>("#24211C")

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
        "relative sticky top-0 z-40 flex h-screen flex-none shrink-0 flex-col overflow-hidden bg-[#F3EEE3] border-r border-[#E6DFD1] text-[#24211C]",
        // Only apply transition after initial mount to prevent flicker
        "transition-all duration-300",
        isCollapsed ? "w-20" : "w-72",
      )}
    >
      <div className="relative flex flex-col h-full p-5 gap-7">
        <div className="flex items-center justify-between gap-2">
          <div suppressHydrationWarning className={cn("flex items-center gap-2", isCollapsed && "justify-center w-full")}>
            {isCollapsed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/wattle-icon.svg" alt="Wattle" className="h-9 w-9 rounded-[10px]" />
            ) : (
              <Wordmark height={26} className="text-[#24211C]" />
            )}
          </div>
          {!isCollapsed && (
            <Button
              isIconOnly
              variant="light"
              onPress={() => {
                setIsCollapsed(true)
                localStorage.setItem("sidebarCollapsed", "true")
              }}
              className="h-8 w-8 text-[#6F685C] hover:bg-[#E6DFD1]"
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
            className="h-8 w-8 text-[#6F685C] hover:bg-[#E6DFD1] -mt-5 mx-auto"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        <div className="h-px w-full bg-[#E6DFD1]" aria-hidden="true" />

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (pathname.startsWith(item.href + "/") && pathname !== "/")
            const isNavigating = pendingPath === item.href
            return (
              <Button
                key={item.href}
                variant={active ? "solid" : "light"}
                isDisabled={isNavigating}
                className={cn(
                  "w-full flex items-center rounded-full px-4 py-3 text-base font-rounded font-semibold text-[#24211C]",
                  active ? "bg-[#24211C] text-[#F3EEE4]" : "bg-transparent hover:bg-[#E6DFD1]",
                  isCollapsed ? "justify-center min-w-0" : "justify-start gap-3",
                  isNavigating && "opacity-50 cursor-not-allowed",
                )}
                onPress={() => {
                  if (!isNavigating) {
                    setPendingPath(item.href)
                    router.push(item.href)
                  }
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-[#F2B300]" : "text-[#6F685C]")} />
                {!isCollapsed && <span className={cn(active ? "text-[#F3EEE4]" : "text-[#24211C]")}>{item.label}</span>}
              </Button>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className={cn("border-t border-[#E6DFD1] pt-4 space-y-3", isCollapsed && "pt-3")}>
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
                    <p className="text-sm font-semibold text-[#24211C] truncate">{displayName}</p>
                    <p className="text-xs text-[#6F685C] truncate">{userEmail}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant={onProfile ? "solid" : "bordered"}
                    className={cn(
                      "w-full rounded-full font-rounded font-semibold border-[#D3CBBB] text-[#24211C] bg-transparent hover:bg-[#E6DFD1]",
                      onProfile && "border-transparent bg-[#24211C] text-[#F3EEE4] hover:bg-[#24211C]",
                    )}
                    onPress={() => {
                      setPendingPath("/profile")
                      router.push("/profile")
                    }}
                  >
                    <User className={cn("h-4 w-4 mr-2", onProfile && "text-[#F2B300]")} />
                    <span className={cn(onProfile && "text-[#F3EEE4]")}>Profile</span>
                  </Button>
                  <Button
                    variant="light"
                    className="w-full rounded-full font-rounded font-semibold text-[#6F685C] hover:bg-[#E6DFD1]"
                    onPress={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Button
                  isIconOnly
                  variant={onProfile ? "solid" : "light"}
                  className={cn(
                    "h-10 w-10 text-[#24211C] hover:bg-[#E6DFD1]",
                    onProfile && "bg-[#24211C] text-[#F2B300] hover:bg-[#24211C]",
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
                  className="h-10 w-10 text-[#6F685C] hover:bg-[#E6DFD1]"
                  onPress={handleLogout}
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-2 px-1 py-1 text-xs text-[#6F685C]">
              <div className="h-2 w-2 rounded-full bg-[#F2B300]" />
              Live grid status
            </div>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center">
              <div
                className="h-2 w-2 rounded-full bg-[#F2B300]"
                title="Live grid status"
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
