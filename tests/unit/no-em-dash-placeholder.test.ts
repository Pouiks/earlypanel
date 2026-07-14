import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde anti-régression : le tiret cadratin « — » ne doit plus être utilisé
 * comme PLACEHOLDER affiché (valeur vide, séparateur isolé). On l'a remplacé
 * partout par du texte explicite (« Non renseigné », « Aucun », « Sélectionner… »).
 *
 * On interdit uniquement les formes ISOLÉES (le tiret seul dans une chaîne
 * `"—"`/`'—'`/`\`—\`` ou un nœud JSX `>—<`) : ce sont les placeholders vides.
 * Les « — » dans les COMMENTAIRES de code ne s'affichent pas → non concernés
 * (et donc non détectés par ces motifs, qui exigent des guillemets ou du JSX).
 */

const SRC = join(process.cwd(), "src");
const FORBIDDEN: { re: RegExp; label: string }[] = [
  { re: /["'`]\s*—\s*["'`]/, label: 'placeholder chaîne "—"' },
  { re: />\s*—\s*</, label: "nœud JSX >—<" },
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("no em-dash placeholder (régression UI)", () => {
  it("aucun placeholder « — » isolé dans les chaînes / JSX de src/", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const { re, label } of FORBIDDEN) {
          if (re.test(line)) {
            offenders.push(`${file.slice(SRC.length + 1)}:${i + 1} [${label}]  ${line.trim().slice(0, 70)}`);
          }
        }
      });
    }
    expect(
      offenders,
      `Placeholder « — » interdit trouvé — remplacer par un texte explicite (« Non renseigné », « Aucun »…) :\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
