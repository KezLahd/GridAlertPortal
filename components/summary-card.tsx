import type { LucideIcon } from "lucide-react"

interface SummaryCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  subtitle?: string
  footerText?: string
}

export function SummaryCard({ title, value, icon: Icon, subtitle, footerText }: SummaryCardProps) {
  return (
    <div className="relative rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="flex-shrink-0 rounded-lg bg-[rgba(255,142,50,0.12)] p-3">
            <Icon className="h-6 w-6 text-[#FF8E32]" />
          </div>
        )}
        <div className="flex-1">
          <h4 className="mb-1 text-sm font-medium text-[hsl(var(--muted-foreground))]">{title}</h4>
          <div className="text-3xl font-bold text-[#FF8E32]">{value}</div>
          {subtitle && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{subtitle}</p>}
        </div>
      </div>
      {footerText && (
        <div className="absolute bottom-4 right-6">
          <span className="text-xs font-normal text-gray-400">{footerText}</span>
        </div>
      )}
    </div>
  )
}

