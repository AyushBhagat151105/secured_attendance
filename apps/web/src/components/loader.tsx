import { IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
  label?: string;
  size?: "sm" | "default" | "lg";
}

export default function Loader({
  className,
  label,
  size = "default",
}: LoaderProps) {
  const sizeClasses = {
    sm: "size-4",
    default: "size-6",
    lg: "size-8",
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full items-center justify-center p-8 gap-2.5 text-muted-foreground",
        className,
      )}
    >
      <IconLoader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {label && <p className="text-xs font-medium text-muted-foreground animate-pulse">{label}</p>}
    </div>
  );
}
