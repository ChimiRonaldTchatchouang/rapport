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
    default: // texte_court
      return <Input name={name} required={req} placeholder="Votre réponse…" />;
  }
}
