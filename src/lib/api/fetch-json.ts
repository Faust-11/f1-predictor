export class ApiFetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly url?: string,
  ) {
    super(message);
    this.name = "ApiFetchError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  retries = 2,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
      next: { revalidate: 0 },
    });

    // Retry transient rate-limit (429) with backoff before giving up.
    if (response.status === 429 && attempt < retries) {
      await sleep(600 * (attempt + 1));
      continue;
    }

    if (!response.ok) {
      throw new ApiFetchError(
        `HTTP ${response.status} for ${url}`,
        response.status,
        url,
      );
    }

    return response.json() as Promise<T>;
  }
}
