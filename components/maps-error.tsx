"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface MapsErrorProps {
  message: string
}

export default function MapsError({ message }: MapsErrorProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Google Maps API Error</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        <p className="mt-2">To fix this issue:</p>
        <ol className="list-decimal pl-6 mt-2">
          <li>
            Go to the{" "}
            <a
              href="https://console.cloud.google.com/apis/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google Cloud Console
            </a>
          </li>
          <li>Select your project</li>
          <li>Go to "APIs &amp; Services" {"->"} "Library"</li>
          <li>
            Search for and enable the following APIs:
            <ul className="list-disc pl-6 mt-1">
              <li>Maps JavaScript API</li>
              <li>Places API</li>
              <li>Geocoding API</li>
              <li>Directions API</li>
            </ul>
          </li>
          <li>Go to "APIs &amp; Services" {"->"} "Credentials"</li>
          <li>Make sure your API key has restrictions that allow these APIs</li>
        </ol>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() =>
              window.open(
                "https://developers.google.com/maps/documentation/javascript/error-messages#api-not-activated-map-error",
                "_blank",
              )
            }
          >
            View Google Documentation
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
