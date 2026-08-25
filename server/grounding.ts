export interface GroundingResult {
  grounded: boolean;
  claimedNumbers: string[];
  evidenceNumbers: string[];
  unsupportedNumbers: string[];
}

const NUMBER_PATTERN = /(?<![\p{L}\d])-?\d+(?:\.\d+)?(?![\p{L}\d])/gu;

function canonicalNumber(value: string | number): string | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return String(Number(parsed.toFixed(6)));
}

export function extractNumbers(value: string): string[] {
  return [...value.matchAll(NUMBER_PATTERN)]
    .map((match) => canonicalNumber(match[0]))
    .filter((number): number is string => number !== null);
}

export function collectEvidenceNumbers(evidence: unknown): string[] {
  const numbers = new Set<string>();

  function visit(value: unknown) {
    if (typeof value === "number") {
      const canonical = canonicalNumber(value);
      if (canonical !== null) numbers.add(canonical);
      return;
    }

    if (typeof value === "string") {
      for (const number of extractNumbers(value)) numbers.add(number);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  }

  visit(evidence);
  return [...numbers].sort((a, b) => Number(a) - Number(b));
}

export function validateNumericGrounding(explanation: string, evidence: unknown): GroundingResult {
  const claimedNumbers = [...new Set(extractNumbers(explanation))];
  const evidenceNumbers = collectEvidenceNumbers(evidence);
  const allowed = new Set(evidenceNumbers);
  const unsupportedNumbers = claimedNumbers.filter((number) => !allowed.has(number));

  return {
    grounded: unsupportedNumbers.length === 0,
    claimedNumbers,
    evidenceNumbers,
    unsupportedNumbers,
  };
}
