export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-border pb-5 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="text-sm text-muted mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
