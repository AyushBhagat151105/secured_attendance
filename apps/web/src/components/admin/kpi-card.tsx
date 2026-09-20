import { isValidElement, type ComponentType, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type KpiColorVariant =
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "indigo"
  | "purple"
  | "muted";

interface AdminKpiCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon: ComponentType<{ className?: string }> | ReactNode;
  color?: KpiColorVariant;
  isLoading?: boolean;
  trend?: string;
  href?: string | null;
  className?: string;
}

const colorStyles: Record<
  KpiColorVariant,
  { bg: string; text: string; valueText?: string }
> = {
  blue: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
  },
  emerald: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    valueText: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    valueText: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    valueText: "text-rose-600 dark:text-rose-400",
  },
  indigo: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  purple: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
  },
  muted: {
    bg: "bg-muted",
    text: "text-muted-foreground",
  },
};

export function AdminKpiCard({
  title,
  value,
  subtitle,
  icon,
  color = "blue",
  isLoading = false,
  trend,
  href,
  className,
}: AdminKpiCardProps) {
  const styles = colorStyles[color];

  const renderIcon = () => {
    if (!icon) return null;
    if (isValidElement(icon)) {
      return icon;
    }
    const IconComp = icon as ComponentType<{ className?: string }>;
    return <IconComp className={cn("size-4", styles.text)} />;
  };

  return (
    <Card
      className={cn(
        "p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card shadow-xs transition-colors relative overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground truncate">{title}</span>
        <div className={cn("rounded-lg p-1.5 shrink-0 flex items-center justify-center", styles.bg)}>
          {renderIcon()}
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        {isLoading ? (
          <Skeleton className="h-7 w-18 rounded-md" />
        ) : (
          <span
            className={cn(
              "text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
              styles.valueText,
            )}
          >
            {value}
          </span>
        )}
        {subtitle && (
          <span className="text-[11px] text-muted-foreground truncate">{subtitle}</span>
        )}
      </div>

      {trend && (
        <div className="mt-2.5 pt-2 border-t border-border/50 text-[11px] font-medium text-muted-foreground">
          {href ? (
            <Link
              to={href as any}
              className="text-primary hover:underline flex items-center gap-1"
            >
              {trend}
            </Link>
          ) : (
            <span>{trend}</span>
          )}
        </div>
      )}
    </Card>
  );
}
