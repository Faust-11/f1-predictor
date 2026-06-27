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

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new ApiFetchError(
      `HTTP ${response.status} for ${url}`,
      response.status,
      url,
    );
  }

  return response.json() as Promise<T>;
}
