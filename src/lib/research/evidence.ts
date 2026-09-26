import type { Listing, Observation, ProviderRunResult } from "./types";

export interface Evidence {
  listings: Listing[];
  observations: Observation[];
}

/**
 * Give every listing an ID like "L1" and every observation an ID like "O1".
 * IDs depend only on the saved provider results and their order, so the same
 * IDs are rebuilt every time a report is loaded - which is what lets the AI
 * analysis refer to evidence by ID.
 */
export function assignEvidenceIds(results: ProviderRunResult[]): Evidence {
  const listings: Listing[] = [];
  const observations: Observation[] = [];

  for (const result of results) {
    if (!result.output) continue;
    for (const listing of result.output.listings) {
      listings.push({ ...listing, id: `L${listings.length + 1}` });
    }
    for (const observation of result.output.observations) {
      observations.push({ ...observation, id: `O${observations.length + 1}` });
    }
  }
  return { listings, observations };
}
