// Small fetch helper shared by the marketplace providers.

const REQUEST_TIMEOUT_MS = 20_000;

/** Fetch JSON and throw a readable error for non-2xx responses. */
export async function fetchJson<T>(
  url: string,
  init: RequestInit & { providerLabel: string },
): Promise<T> {
  const { providerLabel, ...requestInit } = init;
  let response: Response;
  try {
    response = await fetch(url, {
      ...requestInit,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${providerLabel}: request failed (${reason})`);
  }

  if (!response.ok) {
    // Include a short snippet of the body - APIs usually explain the problem there.
    const body = (await response.text()).slice(0, 300);
    throw new Error(`${providerLabel}: HTTP ${response.status} ${response.statusText} ${body}`.trim());
  }
  return (await response.json()) as T;
}
