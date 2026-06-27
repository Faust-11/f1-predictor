import { ACTIVE_SEASON_ID } from "@/lib/constants";

export interface SeedTeam {
  apiTeamId: string;
  name: string;
  colorHex: string;
}

export interface SeedDriver {
  apiDriverId: string;
  apiTeamId: string;
  firstName: string;
  lastName: string;
  code: string;
  number: number;
  country: string;
}

/** Static fallback for season 2026 — used when API sync returns incomplete data. */
export const SEED_TEAMS: SeedTeam[] = [
  { apiTeamId: "red_bull", name: "Red Bull Racing", colorHex: "#3671C6" },
  { apiTeamId: "ferrari", name: "Ferrari", colorHex: "#E8002D" },
  { apiTeamId: "mercedes", name: "Mercedes", colorHex: "#27F4D2" },
  { apiTeamId: "mclaren", name: "McLaren", colorHex: "#FF8000" },
  { apiTeamId: "aston_martin", name: "Aston Martin", colorHex: "#229971" },
  { apiTeamId: "alpine", name: "Alpine", colorHex: "#FF87BC" },
  { apiTeamId: "williams", name: "Williams", colorHex: "#64C4FF" },
  { apiTeamId: "rb", name: "Racing Bulls", colorHex: "#6692FF" },
  { apiTeamId: "haas", name: "Haas F1 Team", colorHex: "#B6BABD" },
  { apiTeamId: "audi", name: "Audi", colorHex: "#F50537" },
  { apiTeamId: "cadillac", name: "Cadillac F1 Team", colorHex: "#004885" },
];

export const SEED_DRIVERS: SeedDriver[] = [
  {
    apiDriverId: "max_verstappen",
    apiTeamId: "red_bull",
    firstName: "Max",
    lastName: "Verstappen",
    code: "VER",
    number: 1,
    country: "NLD",
  },
  {
    apiDriverId: "isack_hadjar",
    apiTeamId: "red_bull",
    firstName: "Isack",
    lastName: "Hadjar",
    code: "HAD",
    number: 6,
    country: "FRA",
  },
  {
    apiDriverId: "charles_leclerc",
    apiTeamId: "ferrari",
    firstName: "Charles",
    lastName: "Leclerc",
    code: "LEC",
    number: 16,
    country: "MON",
  },
  {
    apiDriverId: "lewis_hamilton",
    apiTeamId: "ferrari",
    firstName: "Lewis",
    lastName: "Hamilton",
    code: "HAM",
    number: 44,
    country: "GBR",
  },
  {
    apiDriverId: "george_russell",
    apiTeamId: "mercedes",
    firstName: "George",
    lastName: "Russell",
    code: "RUS",
    number: 63,
    country: "GBR",
  },
  {
    apiDriverId: "andrea_kimi_antonelli",
    apiTeamId: "mercedes",
    firstName: "Kimi",
    lastName: "Antonelli",
    code: "ANT",
    number: 12,
    country: "ITA",
  },
  {
    apiDriverId: "lando_norris",
    apiTeamId: "mclaren",
    firstName: "Lando",
    lastName: "Norris",
    code: "NOR",
    number: 4,
    country: "GBR",
  },
  {
    apiDriverId: "oscar_piastri",
    apiTeamId: "mclaren",
    firstName: "Oscar",
    lastName: "Piastri",
    code: "PIA",
    number: 81,
    country: "AUS",
  },
  {
    apiDriverId: "fernando_alonso",
    apiTeamId: "aston_martin",
    firstName: "Fernando",
    lastName: "Alonso",
    code: "ALO",
    number: 14,
    country: "ESP",
  },
  {
    apiDriverId: "lance_stroll",
    apiTeamId: "aston_martin",
    firstName: "Lance",
    lastName: "Stroll",
    code: "STR",
    number: 18,
    country: "CAN",
  },
  {
    apiDriverId: "pierre_gasly",
    apiTeamId: "alpine",
    firstName: "Pierre",
    lastName: "Gasly",
    code: "GAS",
    number: 10,
    country: "FRA",
  },
  {
    apiDriverId: "franco_colapinto",
    apiTeamId: "alpine",
    firstName: "Franco",
    lastName: "Colapinto",
    code: "COL",
    number: 43,
    country: "ARG",
  },
  {
    apiDriverId: "carlos_sainz",
    apiTeamId: "williams",
    firstName: "Carlos",
    lastName: "Sainz",
    code: "SAI",
    number: 55,
    country: "ESP",
  },
  {
    apiDriverId: "alexander_albon",
    apiTeamId: "williams",
    firstName: "Alexander",
    lastName: "Albon",
    code: "ALB",
    number: 23,
    country: "THA",
  },
  {
    apiDriverId: "yuki_tsunoda",
    apiTeamId: "rb",
    firstName: "Yuki",
    lastName: "Tsunoda",
    code: "TSU",
    number: 22,
    country: "JPN",
  },
  {
    apiDriverId: "liam_lawson",
    apiTeamId: "rb",
    firstName: "Liam",
    lastName: "Lawson",
    code: "LAW",
    number: 30,
    country: "NZL",
  },
  {
    apiDriverId: "esteban_ocon",
    apiTeamId: "haas",
    firstName: "Esteban",
    lastName: "Ocon",
    code: "OCO",
    number: 31,
    country: "FRA",
  },
  {
    apiDriverId: "oliver_bearman",
    apiTeamId: "haas",
    firstName: "Oliver",
    lastName: "Bearman",
    code: "BEA",
    number: 87,
    country: "GBR",
  },
  {
    apiDriverId: "nico_hulkenberg",
    apiTeamId: "audi",
    firstName: "Nico",
    lastName: "Hulkenberg",
    code: "HUL",
    number: 27,
    country: "GER",
  },
  {
    apiDriverId: "gabriel_bortoleto",
    apiTeamId: "audi",
    firstName: "Gabriel",
    lastName: "Bortoleto",
    code: "BOR",
    number: 5,
    country: "BRA",
  },
  {
    apiDriverId: "sergio_perez",
    apiTeamId: "cadillac",
    firstName: "Sergio",
    lastName: "Perez",
    code: "PER",
    number: 11,
    country: "MEX",
  },
  {
    apiDriverId: "valtteri_bottas",
    apiTeamId: "cadillac",
    firstName: "Valtteri",
    lastName: "Bottas",
    code: "BOT",
    number: 77,
    country: "FIN",
  },
];

export const SEED_DATA = {
  seasonId: ACTIVE_SEASON_ID,
  teams: SEED_TEAMS,
  drivers: SEED_DRIVERS,
} as const;
