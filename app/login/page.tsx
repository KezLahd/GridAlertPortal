;"use client"

import { LoginForm } from "@/components/login-form"
import { useEffect } from "react"

export const dynamic = 'force-dynamic'

export default function Page() {
  const backgrounds = [
    "/animation-1.svg",
    "/animation-2.svg",
    "/animation-3.svg",
    "/animation-4.svg",
    "/animation-5.svg",
    "/animation-6.svg",
  ]

  // Set body and html background to black for login page
  useEffect(() => {
    const originalBodyBg = document.body.style.backgroundColor
    const originalHtmlBg = document.documentElement.style.backgroundColor
    
    document.body.style.backgroundColor = "#000000"
    document.documentElement.style.backgroundColor = "#000000"
    
    return () => {
      document.body.style.backgroundColor = originalBodyBg
      document.documentElement.style.backgroundColor = originalHtmlBg
    }
  }, [])

  // Ensure page is at top and prevent scrolling on mobile
  useEffect(() => {
    // Scroll to top immediately
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    
    // Prevent body scrolling on mobile
    const originalOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    const originalPosition = document.body.style.position
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    
    return () => {
      // Restore original styles
      document.body.style.overflow = originalOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      document.body.style.position = originalPosition
      document.body.style.width = ''
    }
  }, [])

  return (
    <div className="relative flex h-mobile w-full items-center justify-center bg-[#000000] p-6 md:p-10 overflow-hidden fixed inset-0">

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {backgrounds.map((src, idx) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-0 animate-[bgCycle_7s_linear_infinite]"
            style={{
              // pack all six background animations into the active window, then cool off
              animationDelay: `${idx * 0.3}s`,
              filter:
                "brightness(0) invert(1) drop-shadow(0 0 18px rgba(255,140,0,0.65)) drop-shadow(0 0 42px rgba(255,140,0,0.5))",
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-6 md:top-10 flex flex-col items-center gap-3 md:gap-8">
        <img
          src="/gridalert-logo.svg"
          alt="GridAlert"
          className="h-28 w-auto md:h-36 drop-shadow-[0_14px_48px_rgba(0,0,0,0.6)] animate-[logoCycle_7s_ease-in-out_infinite]"
        />
      </div>

      <div className="relative w-full max-w-md px-2 sm:px-4">
        <LoginForm />
      </div>

      <style jsx global>{`
        @keyframes bgCycle {
          0% {
            opacity: 0;
            transform: scale(1);
          }
          6% {
            opacity: 0.6;
          }
          12% {
            opacity: 0.8;
            transform: scale(1.006);
          }
          18% {
            opacity: 0;
            transform: scale(1.004);
          }
          100% {
            opacity: 0;
            transform: scale(1.01);
          }
        }

        @keyframes logoCycle {
          0% {
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(255,140,0,0.35)) drop-shadow(0 0 24px rgba(255,140,0,0.25));
          }
          12% {
            transform: scale(1.16);
            filter: drop-shadow(0 0 14px rgba(255,160,0,0.55)) drop-shadow(0 0 32px rgba(255,160,0,0.4));
          }
          28.5% {
            transform: scale(1);
            filter: drop-shadow(0 0 12px rgba(255,140,0,0.45)) drop-shadow(0 0 26px rgba(255,140,0,0.32));
          }
          100% {
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(255,140,0,0.35)) drop-shadow(0 0 24px rgba(255,140,0,0.25));
          }
        }
      `}</style>
    </div>
  )
}
