"use client"

import { googleMapsApiKey } from "@/lib/config"
import Script from "next/script"

export default function GoogleMapsScript() {
  return (
    <Script
      src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&v=weekly`}
      strategy="beforeInteractive"
    />
  )
}
