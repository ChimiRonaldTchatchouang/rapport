// État vide réutilisable (aucune donnée, encouragement à l'action).
export function EmptyState({
  title,
  description,
  action,
  icon = "📭",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="muted mt-1 text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
