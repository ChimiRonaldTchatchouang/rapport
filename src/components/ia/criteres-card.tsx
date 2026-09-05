import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { CRITERES_NOTATION } from "@/lib/ia/criteres";

// Carte explicitant les critères de notation fixes utilisés par l'IA.
export function CriteresCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Critères de notation</CardTitle>
        <CardDescription>Barème fixe appliqué par l&apos;IA à chaque rapport</CardDescription>
        <CardAction>
          <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-primary">
            <Sparkles className="size-4" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {CRITERES_NOTATION.map((c) => (
            <li key={c.cle}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.label}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                  / {c.poids}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
