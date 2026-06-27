const OPENF1_TEAM_TO_API_ID: Record<string, string> = {
  "Red Bull Racing": "red_bull",
  Ferrari: "ferrari",
  Mercedes: "mercedes",
  McLaren: "mclaren",
  "Aston Martin": "aston_martin",
  Alpine: "alpine",
  Williams: "williams",
  "Racing Bulls": "rb",
  "RB F1 Team": "rb",
  "Haas F1 Team": "haas",
  Audi: "audi",
  Cadillac: "cadillac",
  "Cadillac F1 Team": "cadillac",
};

export function teamNameToApiId(teamName: string): string {
  const mapped = OPENF1_TEAM_TO_API_ID[teamName];
  if (mapped) {
    return mapped;
  }

  return teamName
    .toLowerCase()
    .replace(/f1 team/gi, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function driverToApiId(
  firstName: string,
  lastName: string,
  fallbackCode?: string,
): string {
  const slug = `${firstName}_${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_|_$/g, "");

  return slug || (fallbackCode?.toLowerCase() ?? "unknown_driver");
}

export function normalizeHexColor(color: string | null | undefined): string | null {
  if (!color) {
    return null;
  }
  const trimmed = color.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}
