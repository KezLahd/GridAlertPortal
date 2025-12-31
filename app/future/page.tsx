"use client"

import { useEffect } from "react"
import GridAlertApp from "@/components/grid-alert-app"
import { AuthGuard } from "@/components/auth-guard"

export const dynamic = 'force-dynamic'

export default function FuturePage() {
  // Scroll to top on initial page load/refresh - specifically handles iOS Safari
  useEffect(() => {
    // Disable automatic scroll restoration
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    // Detect iOS Safari specifically
    const isIOSSafari = typeof window !== 'undefined' && 
      /iPad|iPhone|iPod/.test(navigator.userAgent) && 
      !(window as any).MSStream &&
      !navigator.userAgent.includes('CriOS') &&
      !navigator.userAgent.includes('FxiOS')

    // Force scroll to top - try multiple methods for iOS Safari compatibility
    const scrollToTop = () => {
      // Method 1: Direct scroll assignment (most reliable for iOS Safari)
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
      }
      if (document.body) {
        document.body.scrollTop = 0
      }
      
      // Method 2: window.scrollTo with instant behavior
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      
      // Method 3: window.scrollTo without options (fallback)
      window.scrollTo(0, 0)
    }

    // For iOS Safari, try multiple times as viewport can change
    if (isIOSSafari) {
      // Immediate scroll
      scrollToTop()
      
      // After a short delay (viewport might still be adjusting)
      const timer1 = setTimeout(scrollToTop, 100)
      
      // After a longer delay (address bar animation completes)
      const timer2 = setTimeout(scrollToTop, 300)
      
      // Also try on window load event
      const handleLoad = () => {
        scrollToTop()
      }
      window.addEventListener('load', handleLoad)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        window.removeEventListener('load', handleLoad)
      }
    } else {
      // For other browsers, single attempt with requestAnimationFrame
      requestAnimationFrame(() => {
        scrollToTop()
      })
    }
  }, [])

  return (
    <main className="flex h-screen md:min-h-mobile flex-col md:overflow-visible">
      <AuthGuard>
        <GridAlertApp initialOutageType="future" />
      </AuthGuard>
    </main>
  )
}
