import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface SupabaseErrorProps {
  message: string
}

export default function SupabaseError({ message }: SupabaseErrorProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Supabase Configuration Error</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        <p className="mt-2">
          Please make sure your Supabase URL and anon key are correctly set in your environment variables:
        </p>
        <ul className="list-disc pl-6 mt-2">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
        </ul>
      </AlertDescription>
    </Alert>
  )
}
