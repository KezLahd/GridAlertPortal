"use client"

import type React from "react"
import { HeroUIProvider } from "@heroui/react"

type Props = {
  children: React.ReactNode
}

export function HeroUIProviders({ children }: Props) {
  return <HeroUIProvider>{children}</HeroUIProvider>
}
