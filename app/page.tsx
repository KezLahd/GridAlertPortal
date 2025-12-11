import { Suspense } from "react"
import Script from "next/script"
import GridAlertApp from "@/components/grid-alert-app"
import LoadingMap from "@/components/loading-map"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Load Google Maps API with Places, Geocoding, and Directions libraries */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geocoding,directions&v=weekly`}
        strategy="beforeInteractive"
        onError={(e) => {
          console.error("Google Maps API failed to load:", e)
        }}
      />

      <Suspense fallback={<LoadingMap />}>
        <GridAlertApp />
      </Suspense>
    </main>
  )
}
