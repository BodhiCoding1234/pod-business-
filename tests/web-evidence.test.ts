import type { BetaContentBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { describe, expect, it } from "vitest";
import {
  collectWebEvidence,
  parsePriceText,
  parseReviewCountText,
  verifyExtractedListings,
  type WebExcerpt,
} from "@/lib/ai/web-evidence";

// Test inputs only - shaped like API responses, not real market data.
const excerpts: WebExcerpt[] = [
  {
    number: 1,
    url: "https://shop.example/item-1",
    title: "Example Shop",
    text: "Retro Sunday League Tee - $24.99 (1,204 reviews)",
  },
  {
    number: 2,
    url: "https://blog.example/post",
    title: "Example Blog",
    text: "Vintage goalkeeper shirt designs are popular this season.",
  },
];

describe("verifyExtractedListings", () => {
  it("keeps values that appear verbatim in the excerpt", () => {
    const result = verifyExtractedListings(
      { listings: [{ excerptNumber: 1, title: "Retro Sunday League Tee", priceText: "$24.99", reviewCountText: "1,204 reviews" }] },
      excerpts,
    );
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0].price).toEqual({ amount: 24.99, currency: "unknown", raw: "$24.99" });
    expect(result.kept[0].reviewCount).toBe(1204);
    expect(result.kept[0].url).toBe("https://shop.example/item-1");
    expect(result.kept[0].verification).toBe("verified_in_source_text");
  });

  it("clears a price or review count that is not in the excerpt", () => {
    const result = verifyExtractedListings(
      { listings: [{ excerptNumber: 1, title: "Retro Sunday League Tee", priceText: "$19.99", reviewCountText: "5,000 reviews" }] },
      excerpts,
    );
    expect(result.kept[0].price).toBeNull();
    expect(result.kept[0].reviewCount).toBeNull();
    expect(result.clearedValueCount).toBe(2);
  });

  it("drops listings whose title is not in the excerpt, or that cite a missing excerpt", () => {
    const result = verifyExtractedListings(
      {
        listings: [
          { excerptNumber: 2, title: "Invented Product Name", priceText: null, reviewCountText: null },
          { excerptNumber: 99, title: "Retro Sunday League Tee", priceText: null, reviewCountText: null },
        ],
      },
      excerpts,
    );
    expect(result.kept).toHaveLength(0);
    expect(result.droppedCount).toBe(2);
  });

  it("drops duplicate listings", () => {
    const item = { excerptNumber: 1, title: "Retro Sunday League Tee", priceText: null, reviewCountText: null };
    const result = verifyExtractedListings({ listings: [item, item] }, excerpts);
    expect(result.kept).toHaveLength(1);
    expect(result.droppedCount).toBe(1);
  });
});

describe("parsers", () => {
  it("parses prices and detects unambiguous currencies", () => {
    expect(parsePriceText("£1,299.00")).toEqual({ amount: 1299, currency: "GBP", raw: "£1,299.00" });
    expect(parsePriceText("24.99 USD")?.currency).toBe("USD");
    expect(parsePriceText("$24.99")?.currency).toBe("unknown");
    expect(parsePriceText("free")).toBeNull();
  });

  it("rejects approximate review counts", () => {
    expect(parseReviewCountText("(87)")).toBe(87);
    expect(parseReviewCountText("12,345 reviews")).toBe(12345);
    expect(parseReviewCountText("1.2k reviews")).toBeNull();
    expect(parseReviewCountText("3K")).toBeNull();
  });
});

describe("collectWebEvidence", () => {
  it("keeps search results and cited excerpts, but not Claude's own prose", () => {
    const blocks = [
      {
        type: "web_search_tool_result",
        tool_use_id: "srvtoolu_1",
        caller: { type: "direct" },
        content: [
          { type: "web_search_result", url: "https://a.example", title: "A", page_age: "2 days", encrypted_content: "x" },
          { type: "web_search_result", url: "https://a.example", title: "A duplicate", page_age: null, encrypted_content: "x" },
        ],
      },
      {
        type: "text",
        text: "Claude's summary sentence that should not become evidence.",
        citations: [
          { type: "web_search_result_location", url: "https://a.example", title: "A", cited_text: "Quoted text.", encrypted_index: "i" },
          { type: "web_search_result_location", url: "https://a.example", title: "A", cited_text: "Quoted text.", encrypted_index: "i" },
        ],
      },
    ] as unknown as BetaContentBlock[];

    const { hits, excerpts: found } = collectWebEvidence(blocks);
    expect(hits).toEqual([{ url: "https://a.example", title: "A", pageAge: "2 days" }]);
    expect(found).toEqual([{ number: 1, url: "https://a.example", title: "A", text: "Quoted text." }]);
  });

  it("ignores web search errors", () => {
    const blocks = [
      { type: "web_search_tool_result", tool_use_id: "t", caller: { type: "direct" }, content: { type: "web_search_tool_result_error", error_code: "unavailable" } },
    ] as unknown as BetaContentBlock[];
    expect(collectWebEvidence(blocks)).toEqual({ hits: [], excerpts: [] });
  });
});
