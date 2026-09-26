import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { config } from "@/lib/config";

/**
 * Server-side fallback: if the main model declines a request, the API retries
 * it on Anthropic's recommended fallback model inside the same call.
 */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!config.anthropic.apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the server.");
  }
  client ??= new Anthropic({ apiKey: config.anthropic.apiKey });
  return client;
}

/** Throw a readable error if Claude's response can't be used. */
export function assertUsableResponse(message: BetaMessage, step: string): void {
  if (message.stop_reason === "refusal") {
    const reason = message.stop_details?.explanation ?? "no explanation given";
    throw new Error(`${step}: Claude declined this request (${reason}).`);
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error(`${step}: Claude's response was cut off (max_tokens reached).`);
  }
}

/** Convert any thrown value from the Anthropic SDK into a short message for the UI. */
export function describeAnthropicError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "Anthropic rejected the API key. Check ANTHROPIC_API_KEY.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Anthropic rate limit reached. Wait a minute and try again.";
  }
  if (error instanceof Anthropic.APIError) {
    return `Anthropic API error ${error.status ?? ""}: ${error.message}`.trim();
  }
  return error instanceof Error ? error.message : String(error);
}
