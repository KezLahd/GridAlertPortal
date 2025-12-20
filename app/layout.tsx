import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { HeroUIProviders } from "@/components/heroui-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GridAlert - Power Outage Monitoring",
  description: "Monitor planned and unplanned power outages in your area",
  generator: 'v0.dev',
  icons: {
    icon: '/gridalert-favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <HeroUIProviders>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
        </HeroUIProviders>
      </body>
    </html>
  )
}
