import { ACTIVE_SEASON_ID } from "@/lib/constants";
import { nationalityToIso } from "@/lib/country-flag";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";
// Career stats change at most once per race weekend.
const REVALIDATE_STATS = 21600;
// Identity and Wikipedia data barely ever changes.
const REVALIDATE_STATIC = 604800;

export interface BioPayload {
  type: "driver" | "constructor";
  name: string;
  nationality: string | null;
  countryIso: string | null;
  /** Driver date of birth, ISO yyyy-mm-dd. */
  born: string | null;
  number: string | null;
  photoUrl: string | null;
  wins: number;
  poles: number;
  championships: number;
  /** Best race finish — resolved only when there are no wins. */
  bestFinish: number | null;
  /** Best qualifying position — resolved only when there are no poles. */
  bestGrid: number | null;
  description: string | null;
  wikiUrl: string | null;
}

interface JolpicaSeasonDriver {
  driverId: string;
  code?: string;
  permanentNumber?: string;
  givenName: string;
  familyName: string;
  dateOfBirth?: string;
  nationality?: string;
  url?: string;
}

interface JolpicaSeasonConstructor {
  constructorId: string;
  name: string;
  nationality?: string;
  url?: string;
}

async function fetchCached<T>(
  url: string,
  revalidate: number,
): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** MRData.total of a filtered endpoint — counts rows without downloading them. */
async function fetchTotal(path: string): Promise<number> {
  const data = await fetchCached<{ MRData: { total?: string } }>(
    `${BASE_URL}/${path}?limit=1`,
    REVALIDATE_STATS,
  );
  return data ? Number(data.MRData.total) || 0 : 0;
}

/** Best position P2–P10 (P1 is already known to be absent); null if none. */
async function findBestPosition(
  prefix: string,
  kind: "results" | "qualifying",
): Promise<number | null> {
  for (let position = 2; position <= 10; position++) {
    if ((await fetchTotal(`${prefix}/${kind}/${position}.json`)) > 0) {
      return position;
    }
  }
  return null;
}

// Jolpica cannot aggregate career titles in one request — standings queries
// require a season. Titles won before BASELINE_SEASON are baked in below,
// verified against per-season Jolpica standings (winners of each season).
// Seasons from BASELINE_SEASON up to (not including) ACTIVE_SEASON_ID are
// checked live, so counts stay correct once the season constant is bumped.
const BASELINE_SEASON = 2026;

const DRIVER_TITLES: Record<string, number> = {
  hamilton: 7,
  max_verstappen: 4,
  alonso: 2,
  norris: 1,
};

const CONSTRUCTOR_TITLES: Record<string, number> = {
  ferrari: 16,
  mclaren: 10,
  williams: 9,
  mercedes: 8,
  red_bull: 6,
  renault: 2,
};

async function fetchSeasonChampion(
  season: number,
  kind: "driverStandings" | "constructorStandings",
): Promise<string | null> {
  if (kind === "driverStandings") {
    const data = await fetchCached<{
      MRData: {
        StandingsTable?: {
          StandingsLists?: { DriverStandings?: { Driver: { driverId: string } }[] }[];
        };
      };
    }>(`${BASE_URL}/${season}/driverStandings/1.json?limit=1`, REVALIDATE_STATIC);
    return (
      data?.MRData.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.[0]
        ?.Driver.driverId ?? null
    );
  }
  const data = await fetchCached<{
    MRData: {
      StandingsTable?: {
        StandingsLists?: {
          ConstructorStandings?: { Constructor: { constructorId: string } }[];
        }[];
      };
    };
  }>(`${BASE_URL}/${season}/constructorStandings/1.json?limit=1`, REVALIDATE_STATIC);
  return (
    data?.MRData.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings?.[0]
      ?.Constructor.constructorId ?? null
  );
}

async function countChampionships(
  id: string,
  kind: "driverStandings" | "constructorStandings",
): Promise<number> {
  const baseline =
    kind === "driverStandings" ? DRIVER_TITLES : CONSTRUCTOR_TITLES;
  let titles = baseline[id] ?? 0;
  for (let season = BASELINE_SEASON; season < ACTIVE_SEASON_ID; season++) {
    if ((await fetchSeasonChampion(season, kind)) === id) titles += 1;
  }
  return titles;
}

function wikiTitleFromUrl(url: string): string | null {
  const match = url.match(/\/wiki\/([^#?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Article summary — Ukrainian when a langlink exists, English otherwise. */
async function fetchWikiDescription(
  url: string | undefined,
): Promise<{ description: string | null; wikiUrl: string | null }> {
  if (!url) return { description: null, wikiUrl: null };
  const title = wikiTitleFromUrl(url);
  if (!title) return { description: null, wikiUrl: url };

  const langData = await fetchCached<{
    query?: {
      pages?: Record<string, { langlinks?: { lang: string; "*": string }[] }>;
    };
  }>(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=langlinks&lllang=uk&redirects=1&titles=${encodeURIComponent(title)}`,
    REVALIDATE_STATIC,
  );
  const pages = langData?.query?.pages ?? {};
  const ukTitle = Object.values(pages)[0]?.langlinks?.[0]?.["*"];

  const lang = ukTitle ? "uk" : "en";
  const summary = await fetchCached<{
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  }>(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(ukTitle ?? title)}`,
    REVALIDATE_STATIC,
  );
  return {
    description: summary?.extract ?? null,
    wikiUrl: summary?.content_urls?.desktop?.page ?? url,
  };
}

export async function getDriverBio(code: string): Promise<BioPayload | null> {
  const upper = code.trim().toUpperCase();
  if (!upper) return null;

  const data = await fetchCached<{
    MRData: { DriverTable?: { Drivers?: JolpicaSeasonDriver[] } };
  }>(`${BASE_URL}/${ACTIVE_SEASON_ID}/drivers.json?limit=100`, REVALIDATE_STATIC);
  const driver = data?.MRData.DriverTable?.Drivers?.find(
    (d) => d.code?.toUpperCase() === upper,
  );
  if (!driver) return null;

  const prefix = `drivers/${driver.driverId}`;
  const [wins, poles, championships, wiki] = await Promise.all([
    fetchTotal(`${prefix}/results/1.json`),
    fetchTotal(`${prefix}/qualifying/1.json`),
    countChampionships(driver.driverId, "driverStandings"),
    fetchWikiDescription(driver.url),
  ]);
  const [bestFinish, bestGrid] = await Promise.all([
    wins === 0 ? findBestPosition(prefix, "results") : null,
    poles === 0 ? findBestPosition(prefix, "qualifying") : null,
  ]);

  return {
    type: "driver",
    name: `${driver.givenName} ${driver.familyName}`,
    nationality: driver.nationality ?? null,
    countryIso: nationalityToIso(driver.nationality),
    born: driver.dateOfBirth ?? null,
    number: driver.permanentNumber ?? null,
    photoUrl: `/drivers/${upper}.webp`,
    wins,
    poles,
    championships,
    bestFinish,
    bestGrid,
    description: wiki.description,
    wikiUrl: wiki.wikiUrl,
  };
}

export async function getConstructorBio(
  name: string,
): Promise<BioPayload | null> {
  const target = name.trim().toLowerCase();
  if (!target) return null;

  const data = await fetchCached<{
    MRData: { ConstructorTable?: { Constructors?: JolpicaSeasonConstructor[] } };
  }>(
    `${BASE_URL}/${ACTIVE_SEASON_ID}/constructors.json?limit=100`,
    REVALIDATE_STATIC,
  );
  const team = data?.MRData.ConstructorTable?.Constructors?.find(
    (c) => c.name.toLowerCase() === target,
  );
  if (!team) return null;

  const prefix = `constructors/${team.constructorId}`;
  const [wins, poles, championships, wiki] = await Promise.all([
    fetchTotal(`${prefix}/results/1.json`),
    fetchTotal(`${prefix}/qualifying/1.json`),
    countChampionships(team.constructorId, "constructorStandings"),
    fetchWikiDescription(team.url),
  ]);
  const [bestFinish, bestGrid] = await Promise.all([
    wins === 0 ? findBestPosition(prefix, "results") : null,
    poles === 0 ? findBestPosition(prefix, "qualifying") : null,
  ]);

  return {
    type: "constructor",
    name: team.name,
    nationality: team.nationality ?? null,
    countryIso: nationalityToIso(team.nationality),
    born: null,
    number: null,
    photoUrl: null,
    wins,
    poles,
    championships,
    bestFinish,
    bestGrid,
    description: wiki.description,
    wikiUrl: wiki.wikiUrl,
  };
}
