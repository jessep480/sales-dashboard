import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  className?: string
  valueClassName?: string
  icon?: ReactNode
  size?: "default" | "large"
}

export function MetricCard({
  title,
  value,
  subtitle,
  className,
  valueClassName,
  icon,
  size = "default",
}: MetricCardProps) {
  const isLarge = size === "large"

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className={cn("pb-2", isLarge && "pb-3 pt-5 px-5")}>
        <CardTitle className={cn(
          "font-medium text-muted-foreground flex items-center gap-2",
          isLarge ? "text-sm" : "text-xs"
        )}>
          {icon && <span className="text-muted-foreground/70">{icon}</span>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(isLarge && "px-5 pb-5")}>
        <div className={cn(
          "font-bold text-card-foreground",
          isLarge ? "text-3xl" : "text-2xl",
          valueClassName
        )}>
          {value}
        </div>
        {subtitle && (
          <p className={cn(
            "text-muted-foreground mt-1",
            isLarge ? "text-sm" : "text-xs"
          )}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
