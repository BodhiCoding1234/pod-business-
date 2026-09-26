// Web research using Claude's built-in web search tool.
// Docs: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
//
// This provider is careful about what counts as evidence:
//   - Search result titles/URLs come straight from the search tool.
//   - Excerpts are verbatim quotes the API attaches as citations.
//   - Listings are extracted from those excerpts by a second Claude call, then
//     checked in code: values not found verbatim in the excerpt are discarded.
// Claude's own prose summary is NOT stored as evidence.
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type {
  BetaContentBlock,
  BetaMessageParam,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { assertUsableResponse, FALLBACK_BETA, getAnthropicClient } from "@/lib/ai/client";
import {
  buildListingExtractionPrompt,
  buildWebResearchPrompt,
  LISTING_EXTRACTION_SYSTEM,
  WEB_RESEARCH_SYSTEM,
} from "@/lib/ai/prompts";
import { ExtractedListingsSchema } from "@/lib/ai/schemas";
import {
  collectWebEvidence,
  verifyExtractedListings,
  webEvidenceToObservations,
  type WebExcerpt,
} from "@/lib/ai/web-evidence";
import { config, isAnthropicConfigured } from "@/lib/config";
import type { Listing } from "@/lib/research/types";
import type { MarketResearchProvider } from "./types";

// A long web search turn can pause; we resume it a few times at most.
const MAX_CONTINUATIONS = 4;

async function searchTheWeb(market: string): Promise<BetaContentBlock[]> {
  const client = getAnthropicClient();
  const messages: BetaMessageParam[] = [{ role: "user", content: buildWebResearchPrompt(market) }];
  const collected: BetaContentBlock[] = [];

  for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
    const stream = client.beta.messages.stream({
      model: config.anthropic.model,
      max_tokens: 32000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: WEB_RESEARCH_SYSTEM,
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: config.anthropic.webSearchMaxUses },
      ],
      messages,
    });
    const message = await stream.finalMessage();
    collected.push(...message.content);

    if (message.stop_reason === "pause_turn") {
      // The server paused a long-running search. Send the partial turn back to continue it.
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    assertUsableResponse(message, "Web research");
    break;
  }
  return collected;
}

async function extractListings(market: string, excerpts: WebExcerpt[]) {
  if (excerpts.length === 0) {
    return { kept: [] as Omit<Listing, "id">[], droppedCount: 0, clearedValueCount: 0 };
  }
  const client = getAnthropicClient();
  const message = await client.beta.messages.parse({
    model: config.anthropic.model,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: betaZodOutputFormat(ExtractedListingsSchema) },
    system: LISTING_EXTRACTION_SYSTEM,
    messages: [{ role: "user", content: buildListingExtractionPrompt(market, excerpts) }],
  });
  assertUsableResponse(message, "Listing extraction");
  if (!message.parsed_output) {
    throw new Error("Listing extraction: Claude's response did not match the expected format.");
  }
  return verifyExtractedListings(message.parsed_output, excerpts);
}

export const claudeWebSearchProvider: MarketResearchProvider = {
  id: "claude_web_search",
  label: "Web search (Claude)",
  description:
    "Searches the public web and keeps search results and verbatim cited excerpts as evidence.",
  requiredEnvVars: ["ANTHROPIC_API_KEY"],

  isConfigured() {
    return isAnthropicConfigured() && config.anthropic.webSearchEnabled;
  },

  async research(market) {
    const blocks = await searchTheWeb(market);
    const { hits, excerpts } = collectWebEvidence(blocks);
    const verification = await extractListings(market, excerpts);

    const notes = [
      `${hits.length} search results and ${excerpts.length} cited excerpts collected.`,
      "Excerpts are verbatim quotes from the source pages, as returned by the web search tool.",
    ];
    if (verification.kept.length > 0 || verification.droppedCount > 0) {
      notes.push(
        `${verification.kept.length} listings were extracted from excerpts and verified against the source text; ` +
          `${verification.droppedCount} could not be verified and were discarded, and ` +
          `${verification.clearedValueCount} unverifiable prices/review counts were marked unavailable.`,
      );
    }

    return {
      query: market,
      listings: verification.kept,
      observations: webEvidenceToObservations(hits, excerpts),
      totalResultsReported: null,
      notes,
    };
  },
};
