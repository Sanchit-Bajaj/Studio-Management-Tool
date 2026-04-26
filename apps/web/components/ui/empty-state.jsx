import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}>
      {Icon && (
        <div className="h-10 w-10 rounded-full bg-sand grid place-items-center mb-3">
          <Icon className="w-5 h-5 text-muted" />
        </div>
      )}
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      {description && <p className="text-sm text-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
