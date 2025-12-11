"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface MapsErrorProps {
  message: string
}

export default function MapsError({ message }: MapsErrorProps) {
  const isRefererError =
    message.toLowerCase().includes("referer") || message.toLowerCase().includes("referernotallowed")

  const isBillingError =
    message.toLowerCase().includes("billing") || message.toLowerCase().includes("billingnotenabled")

  // Extract the preview URL from the current window location
  const currentUrl = typeof window !== "undefined" ? window.location.origin : ""

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Google Maps API Error</AlertTitle>
      <AlertDescription>
        <p className="font-semibold">{message}</p>

        {isRefererError ? (
          <>
            <p className="mt-4 font-semibold text-red-600">
              This error means your site URL is not authorized to use this API key.
            </p>
            <p className="mt-2">
              <strong>Your current URL:</strong>
            </p>
            <code className="block bg-gray-100 p-2 rounded mt-1 text-sm break-all">{currentUrl}</code>
            <p className="mt-4">To fix this issue:</p>
            <ol className="list-decimal pl-6 mt-2 space-y-2">
              <li>
                Go to the{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  Google Cloud Credentials page
                </a>
              </li>
              <li>Click on your API key to edit it</li>
              <li>Under "Application restrictions", select "HTTP referrers (web sites)"</li>
              <li>
                Add the following referrers:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>
                    <code className="bg-gray-100 px-1 rounded text-sm">*.vusercontent.net/*</code> (for v0 preview)
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded text-sm">localhost:*/*</code> (for local development)
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded text-sm">yourdomain.com/*</code> (your production domain)
                  </li>
                </ul>
              </li>
              <li>Click "Save" and wait a few minutes for changes to propagate</li>
            </ol>
            <div className="mt-4 flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => window.open("https://console.cloud.google.com/apis/credentials", "_blank")}
              >
                Open Credentials
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    "https://developers.google.com/maps/documentation/javascript/error-messages#referer-not-allowed-map-error",
                    "_blank",
                  )
                }
              >
                View Documentation
              </Button>
            </div>
          </>
        ) : isBillingError ? (
          <>
            <p className="mt-4 font-semibold text-red-600">
              This error means billing is not enabled for your Google Cloud project.
            </p>
            <p className="mt-2">To fix this issue:</p>
            <ol className="list-decimal pl-6 mt-2 space-y-1">
              <li>
                Go to the{" "}
                <a
                  href="https://console.cloud.google.com/billing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  Google Cloud Billing Console
                </a>
              </li>
              <li>Select or create a billing account</li>
              <li>Link the billing account to your project</li>
              <li>Enable the Maps JavaScript API (it has a free tier with $200 monthly credit)</li>
            </ol>
            <div className="mt-4 flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => window.open("https://console.cloud.google.com/billing", "_blank")}
              >
                Enable Billing
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    "https://developers.google.com/maps/documentation/javascript/error-messages#billing-not-enabled-map-error",
                    "_blank",
                  )
                }
              >
                View Documentation
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2">To fix this issue:</p>
            <ol className="list-decimal pl-6 mt-2">
              <li>
                Go to the{" "}
                <a
                  href="https://console.cloud.google.com/apis/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  Google Cloud Console
                </a>
              </li>
              <li>Select your project</li>
              <li>Go to "APIs & Services" {"->"} "Library"</li>
              <li>
                Search for and enable the following APIs:
                <ul className="list-disc pl-6 mt-1">
                  <li>Maps JavaScript API</li>
                  <li>Places API</li>
                  <li>Geocoding API</li>
                </ul>
              </li>
              <li>Go to "APIs & Services" {"->"} "Credentials"</li>
              <li>Make sure your API key has restrictions that allow these APIs</li>
            </ol>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open("https://developers.google.com/maps/documentation/javascript/error-messages", "_blank")
                }
              >
                View Google Documentation
              </Button>
            </div>
          </>
        )}
      </AlertDescription>
    </Alert>
  )
}
