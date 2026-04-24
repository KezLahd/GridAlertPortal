import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter, Instrument_Serif, DM_Sans } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { HeroUIProviders } from "@/components/heroui-provider"
import { MobileEmailScroll } from "@/components/mobile-email-scroll"

const inter = Inter({ subsets: ["latin"] })
const serif = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--font-serif" })
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "GridAlert - Power Outage Monitoring",
  description: "Monitor planned and unplanned power outages in your area",
  generator: 'v0.dev',
  icons: {
    icon: '/gridalert-favicon.svg',
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
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <body className={inter.className}>
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
