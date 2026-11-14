export type QualityFinding = {
  code: string;
  severity: "warning" | "error";
  message: string;
};
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object")
    return Object.entries(value)
      .filter(
        ([key]) =>
          ![
            "platform",
            "narration",
            "template",
            "imageAssetId",
            "imageLicense",
          ].includes(key)
      )
      .flatMap(([, v]) => strings(v));
  return [];
}
export function creativeQuality(content: unknown, source: unknown) {
  const texts = strings(content);
  const normalized = texts
    .map((t) => t.trim().toLocaleLowerCase())
    .filter((t) => t.length > 15);
  const sourceText = strings(source).join("\n").toLocaleLowerCase();
  const findings: QualityFinding[] = [];
  if (texts.some((t) => /\bTODO\b|lorem ipsum|à compléter|\[insérer/i.test(t)))
    findings.push({
      code: "placeholder",
      severity: "error",
      message:
        "Un texte de travail ou un emplacement à compléter est encore présent.",
    });
  if (new Set(normalized).size < normalized.length)
    findings.push({
      code: "repeated_content",
      severity: "warning",
      message:
        "Des passages longs se répètent : vérifier que cette répétition est voulue.",
    });
  const claims = Array.from(
    new Set(
      texts.flatMap(
        (t) =>
          t.match(
            /\b\d+(?:[.,]\d+)?\s*(?:%|€|\$|clients|utilisateurs|jours|ans)(?![a-zA-Z0-9])/gi
          ) || []
      )
    )
  ).filter((claim) => !sourceText.includes(claim.toLocaleLowerCase()));
  if (claims.length)
    findings.push({
      code: "unsupported_numbers",
      severity: "warning",
      message: `Chiffres absents du contexte fourni, à justifier : ${claims
        .slice(0, 8)
        .join(", ")}.`,
    });
  if (
    texts.some((t) =>
      /garanti[e]?|sans risque|numéro (?:un|1)|meilleur du marché|guaranteed|risk-free|best in the market/i.test(
        t
      )
    )
  )
    findings.push({
      code: "absolute_claim",
      severity: "warning",
      message:
        "Une promesse absolue doit être vérifiée et justifiée avant diffusion.",
    });
  return {
    version: "deterministic-v1",
    status: findings.length ? "needs_review" : "no_rule_violation",
    findings,
    limitations:
      "Contrôles déterministes indicatifs. Un chiffre présent dans le brief n’est pas une preuve indépendante ; les règles éditoriales libres et les faits ne sont pas vérifiés exhaustivement.",
  };
}
