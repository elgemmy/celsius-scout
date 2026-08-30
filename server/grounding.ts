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

function decimalPlaces(token: string): number {
  const match = /^-?\d+\.(\d+)$/.exec(token);
  return match ? match[1].length : 0;
}

/** Integers inside clock times like 15:00 are not standalone numerical claims. */
function isTimeComponent(match: RegExpMatchArray): boolean {
  if (match[0].includes(".")) return false;
  const input = match.input ?? "";
  const index = match.index ?? 0;
  const token = match[0];
  const after = input.slice(index + token.length);
  const before = input.slice(0, index);
  return /^:\d{2}/.test(after) || before.endsWith(":");
}

function numberTokens(value: string): string[] {
  return [...value.matchAll(NUMBER_PATTERN)]
    .filter((match) => !isTimeComponent(match))
    .map((match) => match[0]);
}

export function extractNumbers(value: string): string[] {
  return numberTokens(value)
    .map((token) => canonicalNumber(token))
    .filter((number): number is string => number !== null);
}

function isSupportedClaim(token: string, evidenceNumbers: string[]): boolean {
  const claim = canonicalNumber(token);
  if (claim === null) return false;
  if (evidenceNumbers.includes(claim)) return true;

  const places = decimalPlaces(token);
  if (places === 0) return false;

  return evidenceNumbers.some((evidence) => {
    const evidenceNumber = Number(evidence);
    if (!Number.isFinite(evidenceNumber)) return false;
    if (canonicalNumber(evidenceNumber.toFixed(places)) === claim) return true;
    return evidence.startsWith(token);
  });
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
  const claimedTokens = numberTokens(explanation);
  const claimedNumbers = [...new Set(
    claimedTokens
      .map((token) => canonicalNumber(token))
      .filter((number): number is string => number !== null),
  )];
  const evidenceNumbers = collectEvidenceNumbers(evidence);
  const unsupportedNumbers = [...new Set(
    claimedTokens
      .filter((token) => !isSupportedClaim(token, evidenceNumbers))
      .map((token) => canonicalNumber(token))
      .filter((number): number is string => number !== null),
  )];

  return {
    grounded: unsupportedNumbers.length === 0,
    claimedNumbers,
    evidenceNumbers,
    unsupportedNumbers,
  };
}
