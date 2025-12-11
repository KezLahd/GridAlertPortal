export default function LoadingMap() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <h2 className="text-xl font-semibold">Loading GridAlert Map...</h2>
        <p className="text-muted-foreground">Please wait while we fetch outage data</p>
      </div>
    </div>
  )
}
