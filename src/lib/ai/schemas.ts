// Zod schemas for Claude's structured outputs.
// The API guarantees the response matches these shapes.
import { z } from "zod";

const evidenceIds = z
  .array(z.string())
  .describe('Evidence IDs from the provided evidence, e.g. ["O3", "L12"].');

// ---- Step 2: listing extraction ----

export const ExtractedListingsSchema = z.object({
  listings: z.array(
    z.object({
      excerptNumber: z.number().int(),
      title: z.string(),
      priceText: z.string().nullable(),
      reviewCountText: z.string().nullable(),
    }),
  ),
});
export type ExtractedListings = z.infer<typeof ExtractedListingsSchema>;

// ---- Step 3: market analysis ----

const describedItem = z.object({
  name: z.string(),
  description: z.string(),
  evidenceIds,
});

export const MarketAnalysisSchema = z.object({
  productCategory: z.string(),
  customerTypes: z.array(describedItem),
  majorThemes: z.array(describedItem),
  subNiches: z.array(describedItem),
  competition: z.object({
    summary: z.string(),
    commonStyles: z.array(describedItem),
    saturationSignals: z.array(describedItem),
  }),
  opportunities: z.array(
    z.object({
      name: z.string(),
      targetCustomer: z.string(),
      evidence: z.array(
        z.object({
          evidenceId: z.string(),
          explanation: z.string().describe("How this piece of evidence supports the opportunity."),
        }),
      ),
      competitionObservations: z.string(),
      differentiationAngles: z.array(z.string()),
      risks: z.array(z.string()),
      assessment: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
      hypothesesToTest: z.array(z.string()),
    }),
  ),
  dataGaps: z.array(z.string()),
});
export type MarketAnalysis = z.infer<typeof MarketAnalysisSchema>;
