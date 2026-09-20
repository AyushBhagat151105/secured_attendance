import { isValidElement, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ComponentType<{ className?: string }> | ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
  className,
}: AdminPageHeaderProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (isValidElement(icon)) {
      return icon;
    }
    const IconComp = icon as ComponentType<{ className?: string }>;
    return <IconComp className="size-6 text-primary" />;
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0 pb-1",
        className,
      )}
    >
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {icon && <span className="text-primary shrink-0 flex items-center">{renderIcon()}</span>}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">{actions}</div>
      )}
    </div>
  );
}
