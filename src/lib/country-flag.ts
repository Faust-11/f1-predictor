// Maps a race country name (from OpenF1 / Jolpica) to an ISO-2 code, covering
// the variants both sources use (e.g. "UK" vs "United Kingdom").
const COUNTRY_ISO: Record<string, string> = {
  australia: "au",
  china: "cn",
  japan: "jp",
  usa: "us",
  "united states": "us",
  "united states of america": "us",
  canada: "ca",
  monaco: "mc",
  spain: "es",
  austria: "at",
  uk: "gb",
  "united kingdom": "gb",
  "great britain": "gb",
  belgium: "be",
  hungary: "hu",
  netherlands: "nl",
  italy: "it",
  azerbaijan: "az",
  singapore: "sg",
  mexico: "mx",
  brazil: "br",
  qatar: "qa",
  uae: "ae",
  "united arab emirates": "ae",
  "saudi arabia": "sa",
  bahrain: "bh",
};

export function countryToIso(country: string | null | undefined): string | null {
  if (!country) return null;
  return COUNTRY_ISO[country.trim().toLowerCase()] ?? null;
}

/** Round flag SVG (HatScripts/circle-flags) served from the jsDelivr CDN. */
export function flagUrl(iso: string): string {
  return `https://cdn.jsdelivr.net/gh/HatScripts/circle-flags/flags/${iso}.svg`;
}
