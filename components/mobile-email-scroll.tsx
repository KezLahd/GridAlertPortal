"use client"

import { useEffect } from "react"

/**
 * Global component to scroll email inputs into view on mobile when focused
 * This ensures forms are visible above the keyboard on mobile devices
 */
export function MobileEmailScroll() {
  useEffect(() => {
    const handleEmailFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      
      // Find the actual input element (might be nested in HeroUI wrapper)
      let inputElement: HTMLInputElement | null = null
      
      if (target.tagName === "INPUT") {
        inputElement = target as HTMLInputElement
      } else {
        // For HeroUI, the input might be nested - try to find it
        const input = target.querySelector('input[type="email"]') as HTMLInputElement
        if (input) {
          inputElement = input
        }
      }
      
      if (!inputElement) return
      
      // Check if it's an email input
      const isEmailInput = 
        inputElement.type === "email" || 
        inputElement.id === "email" || 
        inputElement.getAttribute("name") === "email" ||
        inputElement.getAttribute("aria-label")?.toLowerCase().includes("email") ||
        inputElement.closest('[data-email-input]') ||
        inputElement.getAttribute("autocomplete") === "username" // Login forms often use this

      if (isEmailInput) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                         window.innerWidth < 768

        if (isMobile) {
          // Small delay to ensure keyboard is opening
          setTimeout(() => {
            // Scroll the input or its container into view
            const elementToScroll = inputElement.closest('form') || inputElement
            elementToScroll.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            })
          }, 300)
        }
      }
    }

    document.addEventListener("focusin", handleEmailFocus)
    return () => {
      document.removeEventListener("focusin", handleEmailFocus)
    }
  }, [])

  return null
}

