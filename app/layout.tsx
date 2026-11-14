import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { HeroUIProviders } from "@/components/heroui-provider"
import { MobileEmailScroll } from "@/components/mobile-email-scroll"

// Type is Apple's system faces only (SF Pro Rounded for titles, numbers and buttons; SF Pro for text), with each
// platform's own sans as the fallback. Nothing is downloaded.

export const metadata: Metadata = {
  title: "Wattle — power outages near your clinics",
  description: "Planned and unplanned power outages near your clinics and pharmacies, from Australia's electricity distributors.",
  applicationName: "Wattle",
  icons: {
    icon: [{ url: "/wattle-icon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon.png",
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <body>
        <HeroUIProviders>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <MobileEmailScroll />
          {children}
        </ThemeProvider>
        </HeroUIProviders>
      </body>
    </html>
  )
}
