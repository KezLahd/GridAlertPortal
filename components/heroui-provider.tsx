"use client"

import type React from "react"
import { HeroUIProvider } from "@heroui/react"
import { I18nProvider } from "@react-aria/i18n"

type Props = {
  children: React.ReactNode
}

export function HeroUIProviders({ children }: Props) {
  return (
    <I18nProvider locale="en-AU">
      <HeroUIProvider>{children}</HeroUIProvider>
    </I18nProvider>
  )
}
