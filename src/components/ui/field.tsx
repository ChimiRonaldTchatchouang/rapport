import * as React from "react";
import { Label } from "@/components/ui/label";

// Petit wrapper label + contrôle, pour les formulaires (non standard shadcn,
// simple confort maison au-dessus de <Label>).
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}
