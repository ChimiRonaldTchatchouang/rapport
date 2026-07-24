import { Input, Textarea, Select } from "@/components/ui/field";
import type { ChampTemplate } from "@/lib/types/rapport";

// Rend l'input adapté au type de champ (formulaire de rapport dynamique).
export function ChampInput({ champ }: { champ: ChampTemplate }) {
  const name = `champ_${champ.id}`;
  const req = champ.obligatoire;

  switch (champ.type) {
    case "texte_long":
      return <Textarea name={name} required={req} placeholder="Votre réponse…" />;
    case "nombre":
      return <Input name={name} type="number" step="any" required={req} placeholder="0" />;
    case "date":
      return <Input name={name} type="date" required={req} />;
    case "case_a_cocher":
      return (
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name={name} className="h-4 w-4 accent-brand-600" />
          Oui
        </label>
      );
    case "choix_multiple":
      return (
        <Select name={name} required={req} defaultValue="">
          <option value="" disabled>
            Sélectionner…
          </option>
          {(champ.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    case "cases_multiples":
      return (
        <div className="space-y-2">
          {(champ.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:has-[:checked]:bg-brand-500/10">
              <input type="checkbox" name={name} value={o} className="h-4 w-4 accent-brand-600" />
              {o}
            </label>
          ))}
        </div>
      );
    case "echelle": {
      const labels = champ.options ?? [];
      return (
        <div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="flex-1 cursor-pointer rounded-xl border border-[var(--border)] py-2.5 text-center text-sm font-medium has-[:checked]:border-brand-500 has-[:checked]:bg-brand-600 has-[:checked]:text-white"
              >
                <input type="radio" name={name} value={n} required={req} className="sr-only" />
                {n}
              </label>
            ))}
          </div>
          {labels.length >= 2 && (
            <div className="mt-1 flex justify-between text-xs muted">
              <span>{labels[0]}</span>
              <span>{labels[labels.length - 1]}</span>
            </div>
          )}
        </div>
      );
    }
    default: // texte_court
      return <Input name={name} required={req} placeholder="Votre réponse…" />;
  }
}
