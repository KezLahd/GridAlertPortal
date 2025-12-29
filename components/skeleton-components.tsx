"use client"

import { Skeleton } from "@/components/ui/heroui"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function MapSkeleton() {
  return (
    <div className="h-[70vh]">
      <Skeleton className="h-full w-full rounded-b-xl rounded-t-xl" />
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="relative rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-8 w-16 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton() {
  return (
    <div className="relative h-[70vh] w-full rounded-xl overflow-hidden">
      <ScrollArea className="h-full w-full">
        <div className="space-y-3 pr-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-[#e5e7eb] bg-white p-3"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-32 rounded" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
              <Skeleton className="h-4 w-20 rounded" />
            </TableHead>
            <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
              <Skeleton className="h-4 w-24 rounded" />
            </TableHead>
            <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
              <Skeleton className="h-4 w-20 rounded" />
            </TableHead>
            <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
              <Skeleton className="h-4 w-24 rounded" />
            </TableHead>
            <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
              <Skeleton className="h-4 w-20 rounded" />
            </TableHead>
            <TableHead className="font-semibold text-foreground uppercase text-sm py-3 text-right">
              <Skeleton className="h-4 w-24 rounded ml-auto" />
            </TableHead>
            <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
              <Skeleton className="h-4 w-24 rounded" />
            </TableHead>
            <TableHead className="font-semibold text-foreground uppercase text-sm py-3">
              <Skeleton className="h-4 w-24 rounded" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <TableRow key={i} className="hover:bg-secondary/60">
              <TableCell className="font-medium">
                <Skeleton className="h-4 w-24 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20 rounded" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="h-6 w-20 rounded-full mx-auto" />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                <Skeleton className="h-4 w-40 rounded" />
              </TableCell>
              <TableCell className="text-center w-24">
                <Skeleton className="h-4 w-16 rounded mx-auto" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32 rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between gap-3 py-4">
        <div className="text-sm text-muted-foreground">
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-9 w-16 rounded" />
        </div>
      </div>
    </>
  )
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-8 w-64 rounded" />
      <StatsSkeleton />
      <MapSkeleton />
    </div>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
          <Skeleton className="h-4 w-96 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
        </div>
        <Skeleton className="h-10 w-32 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Card Skeleton */}
        <div className="md:col-span-2 lg:col-span-1 rounded-xl border border-gray-800 md:border-[hsl(var(--border))] bg-gray-900 md:bg-[hsl(var(--card))] p-6">
          <div className="flex flex-col items-center text-center space-y-3 pb-3">
            <Skeleton className="h-20 w-20 rounded-full bg-gray-800 md:bg-[hsl(var(--muted))]" />
          </div>
          <div className="space-y-3 text-center">
            <div className="space-y-1">
              <Skeleton className="h-6 w-32 rounded mx-auto bg-gray-800 md:bg-[hsl(var(--muted))]" />
              <Skeleton className="h-4 w-40 rounded mx-auto bg-gray-800 md:bg-[hsl(var(--muted))]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded mx-auto bg-gray-800 md:bg-[hsl(var(--muted))]" />
              <Skeleton className="h-6 w-28 rounded-full mx-auto bg-gray-800 md:bg-[hsl(var(--muted))]" />
              <Skeleton className="h-4 w-32 rounded mx-auto bg-gray-800 md:bg-[hsl(var(--muted))]" />
            </div>
          </div>
        </div>

        {/* Energy Providers Card Skeleton */}
        <div className="rounded-xl border border-gray-800 md:border-[hsl(var(--border))] bg-gray-900 md:bg-[hsl(var(--card))] p-6">
          <div className="space-y-2 pb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
              <Skeleton className="h-6 w-40 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
            </div>
            <Skeleton className="h-4 w-48 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
                <Skeleton className="h-8 w-8 rounded-full bg-gray-800 md:bg-[hsl(var(--muted))]" />
                <Skeleton className="h-4 w-24 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
              </div>
            ))}
          </div>
        </div>

        {/* Outage Types Card Skeleton */}
        <div className="rounded-xl border border-gray-800 md:border-[hsl(var(--border))] bg-gray-900 md:bg-[hsl(var(--card))] p-6">
          <div className="space-y-2 pb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
              <Skeleton className="h-6 w-32 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
            </div>
            <Skeleton className="h-4 w-40 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
                <Skeleton className="h-4 w-32 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
              </div>
            ))}
          </div>
        </div>

        {/* Region Access Card Skeleton */}
        <div className="md:col-span-2 rounded-xl border border-gray-800 md:border-[hsl(var(--border))] bg-gray-900 md:bg-[hsl(var(--card))] p-6">
          <div className="space-y-2 pb-3">
            <Skeleton className="h-6 w-32 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
            <Skeleton className="h-4 w-64 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full bg-gray-800 md:bg-[hsl(var(--muted))]" />
            ))}
          </div>
        </div>

        {/* Create Company Card Skeleton */}
        <div className="md:col-span-2 lg:col-span-1 rounded-xl border border-gray-800 md:border-[hsl(var(--border))] bg-gray-900 md:bg-[hsl(var(--card))] p-6">
          <div className="space-y-2 pb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
              <Skeleton className="h-6 w-40 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
            </div>
            <Skeleton className="h-4 w-56 rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
          </div>
          <Skeleton className="h-10 w-full rounded bg-gray-800 md:bg-[hsl(var(--muted))]" />
        </div>
      </div>
    </div>
  )
}
