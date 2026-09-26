import { describe, expect, it } from "vitest";
import { normalizeEbayResponse } from "@/lib/providers/ebay";
import { normalizeEtsyResponse } from "@/lib/providers/etsy";
import { detectCurrency, normalizeSerpApiResponse } from "@/lib/providers/serpapi-google-shopping";

// These are minimal test payloads shaped like each API's response - not real data.

describe("Etsy normalizer", () => {
  it("converts money, decodes titles and leaves reviews unavailable", () => {
    const output = normalizeEtsyResponse("test query", {
      count: 1234,
      results: [
        {
          listing_id: 1,
          title: "Dad&#39;s &quot;Test&quot; Shirt",
          price: { amount: 2499, divisor: 100, currency_code: "USD" },
          tags: ["gift"],
          num_favorers: 7,
        },
      ],
    });
    expect(output.totalResultsReported).toBe(1234);
    expect(output.listings[0]).toMatchObject({
      title: `Dad's "Test" Shirt`,
      url: "https://www.etsy.com/listing/1",
      price: { amount: 24.99, currency: "USD" },
      reviewCount: null,
      favorites: 7,
    });
    expect(output.observations[0].kind).toBe("result_count");
  });
});

describe("eBay normalizer", () => {
  it("maps prices and handles a missing total", () => {
    const output = normalizeEbayResponse("test query", {
      itemSummaries: [
        { itemId: "a", title: "Test item", price: { value: "12.50", currency: "USD" }, seller: { username: "s" } },
        { itemId: "b", title: "No price item" },
      ],
    });
    expect(output.totalResultsReported).toBeNull();
    expect(output.observations).toEqual([]);
    expect(output.listings[0].price).toEqual({ amount: 12.5, currency: "USD", raw: "12.50 USD" });
    expect(output.listings[1].price).toBeNull();
    expect(output.listings[0].reviewCount).toBeNull();
  });
});

describe("SerpApi Google Shopping normalizer", () => {
  it("keeps ratings and review counts only when present", () => {
    const output = normalizeSerpApiResponse(
      "test query",
      {
        shopping_results: [
          { title: "With reviews", price: "$20.00", extracted_price: 20, rating: 4.5, reviews: 88, source: "Store" },
          { title: "Without reviews", price: "£15.00", extracted_price: 15 },
        ],
      },
      "us",
    );
    expect(output.listings[0]).toMatchObject({ reviewCount: 88, rating: 4.5, price: { currency: "USD" } });
    expect(output.listings[1]).toMatchObject({ reviewCount: null, rating: null, price: { currency: "GBP" } });
  });

  it("only maps $ to a currency when the country makes it unambiguous", () => {
    expect(detectCurrency("$5", "ca")).toBe("CAD");
    expect(detectCurrency("$5", "mx")).toBe("unknown");
  });
});
