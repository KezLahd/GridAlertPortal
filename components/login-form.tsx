"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/heroui"
import { DesktopInput } from "@/components/desktop-input"
import { MobileInput } from "@/components/mobile-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Detect autofilled values on page load and handle input events
  useEffect(() => {
    const findInputElement = (ref: React.RefObject<HTMLInputElement | null>): HTMLInputElement | null => {
      if (!ref.current) return null
      // If ref.current is the input itself, return it
      if (ref.current.tagName === 'INPUT') return ref.current as HTMLInputElement
      // Otherwise, try to find the input inside (HeroUI wraps inputs)
      const input = ref.current.querySelector('input')
      return input as HTMLInputElement | null
    }

    const checkAutofill = () => {
      const emailInput = findInputElement(emailRef)
      const passwordInput = findInputElement(passwordRef)

      if (emailInput && emailInput.value && emailInput.value !== email) {
        setEmail(emailInput.value)
      }

      if (passwordInput && passwordInput.value && passwordInput.value !== password) {
        setPassword(passwordInput.value)
      }
    }

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.type === 'email' && target.value !== email) {
        setEmail(target.value)
      } else if (target.type === 'password' && target.value !== password) {
        setPassword(target.value)
      }
    }

    // Wait a bit for refs to be set, then check
    const setupInterval = setInterval(() => {
      const emailInput = findInputElement(emailRef)
      const passwordInput = findInputElement(passwordRef)
      
      if (emailInput && passwordInput) {
        clearInterval(setupInterval)
        
        // Check immediately
        checkAutofill()
        
        // Add event listeners
        emailInput.addEventListener('input', handleInput)
        emailInput.addEventListener('change', handleInput)
        passwordInput.addEventListener('input', handleInput)
        passwordInput.addEventListener('change', handleInput)
        
        // Check on focus (autofill often triggers on focus)
        emailInput.addEventListener('focus', checkAutofill)
        passwordInput.addEventListener('focus', checkAutofill)
      }
    }, 50)

    // Also check multiple times as autofill can happen at various delays
    const timeoutIds = [
      setTimeout(checkAutofill, 100),
      setTimeout(checkAutofill, 200),
      setTimeout(checkAutofill, 500),
      setTimeout(checkAutofill, 1000),
      setTimeout(checkAutofill, 1500),
    ]
    
    return () => {
      clearInterval(setupInterval)
      timeoutIds.forEach(id => clearTimeout(id))
      
      const emailInput = findInputElement(emailRef)
      const passwordInput = findInputElement(passwordRef)
      
      if (emailInput) {
        emailInput.removeEventListener('input', handleInput)
        emailInput.removeEventListener('change', handleInput)
        emailInput.removeEventListener('focus', checkAutofill)
      }
      if (passwordInput) {
        passwordInput.removeEventListener('input', handleInput)
        passwordInput.removeEventListener('change', handleInput)
        passwordInput.removeEventListener('focus', checkAutofill)
      }
    }
  }, [email, password])

  const ensureProfileRow = async (userId: string, userEmail: string) => {
    const { data: existing, error: fetchError } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError) {
      console.error("Profile lookup failed", fetchError)
      return
    }

    if (!existing) {
      const { error: insertError } = await supabase.from("user_profiles").insert({
        user_id: userId,
        email: userEmail,
        first_name: "",
        last_name: "",
        mobile: "",
        role: "member",
        notify_outage_types: ["unplanned", "planned", "future"],
        notify_channels: ["email"],
        notify_providers: ["Ausgrid", "Endeavour", "Energex", "Ergon", "SA Power"],
        region_access: ["NSW", "QLD", "VIC", "SA", "WA", "NT", "ACT", "TAS"],
      })

      if (insertError) {
        console.error("Profile insert failed", insertError)
      }
    }
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message || "Unable to sign in. Please try again.")
      setLoading(false)
      return
    }

    const userId = authData.user?.id
    if (userId) {
      await ensureProfileRow(userId, email)
    }

    // Scroll login page to top before navigation to prevent scroll position transfer
    // This is critical for mobile where keyboard can cause scrolling
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    
    // Small delay to ensure scroll completes before navigation
    await new Promise(resolve => setTimeout(resolve, 50))

    router.push("/unplanned")
  }

  return (
    <div className="rounded-xl border bg-black/40 md:bg-white border-gray-800 md:border-[hsl(var(--border))] p-6 shadow-lg backdrop-blur">
      <div className="mb-6 space-y-2 text-center">
        <p className="text-3xl font-semibold tracking-tight text-white md:text-black">GridAlert</p>
        <h1 className="text-2xl font-semibold text-white md:text-neutral-900">Sign in</h1>
        <p className="text-sm text-gray-400 md:text-neutral-600">Use your company email and password.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-900/50 border-red-700 md:bg-red-50 md:border-red-200">
          <AlertDescription className="text-red-300 md:text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <form className="space-y-4" onSubmit={handleLogin}>
        <div className="md:hidden">
          <MobileInput
            ref={emailRef}
            label="Email"
            placeholder=""
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="hidden md:block">
          <DesktopInput
            ref={emailRef}
            label="Email"
            placeholder=""
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="md:hidden">
          <MobileInput
            ref={passwordRef}
            label="Password"
            placeholder=""
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="hidden md:block">
          <DesktopInput
            ref={passwordRef}
            label="Password"
            placeholder=""
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button 
          type="submit" 
          className="w-full text-white md:text-foreground bg-[#FF8E32] md:bg-[hsl(var(--primary))] hover:bg-[#FFAA5B] md:hover:bg-[hsl(var(--primary))] disabled:opacity-50 disabled:cursor-not-allowed" 
          isDisabled={loading || !email.trim() || !password.trim()} 
          color="primary" 
          variant="solid"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </div>
  )
}
