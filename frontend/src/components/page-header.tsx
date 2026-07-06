import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          <span className="text-gradient">{title}</span>
        </h1>
        {description && (
          <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-2xl">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function GlassCard({
  children,
  className,
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-6",
        hover && "hover-lift cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}
