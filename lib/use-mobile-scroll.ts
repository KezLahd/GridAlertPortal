import { useEffect, useRef } from "react"

/**
 * Hook to scroll input into view on mobile when focused
 * This ensures the form is visible above the keyboard
 */
export function useMobileScroll() {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const handleFocus = () => {
      // Check if mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                       window.innerWidth < 768

      if (isMobile) {
        // Small delay to ensure keyboard is opening
        setTimeout(() => {
          input.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          })
        }, 300)
      }
    }

    input.addEventListener("focus", handleFocus)
    return () => {
      input.removeEventListener("focus", handleFocus)
    }
  }, [])

  return inputRef
}

