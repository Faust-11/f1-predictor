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

// Jolpica/Ergast nationalities (demonyms) → ISO-2, for driver/team bios.
const NATIONALITY_ISO: Record<string, string> = {
  american: "us",
  argentine: "ar",
  argentinian: "ar",
  australian: "au",
  austrian: "at",
  belgian: "be",
  brazilian: "br",
  british: "gb",
  canadian: "ca",
  chinese: "cn",
  danish: "dk",
  dutch: "nl",
  finnish: "fi",
  french: "fr",
  german: "de",
  indian: "in",
  indonesian: "id",
  irish: "ie",
  italian: "it",
  japanese: "jp",
  mexican: "mx",
  monegasque: "mc",
  "new zealander": "nz",
  polish: "pl",
  portuguese: "pt",
  russian: "ru",
  spanish: "es",
  swedish: "se",
  swiss: "ch",
  thai: "th",
};

export function nationalityToIso(
  nationality: string | null | undefined,
): string | null {
  if (!nationality) return null;
  return NATIONALITY_ISO[nationality.trim().toLowerCase()] ?? null;
}

/** Round flag SVG (HatScripts/circle-flags) served from the jsDelivr CDN. */
export function flagUrl(iso: string): string {
  return `https://cdn.jsdelivr.net/gh/HatScripts/circle-flags/flags/${iso}.svg`;
}
