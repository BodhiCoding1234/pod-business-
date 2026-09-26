// Display helpers that are safe to use in both server and client components.
import type { Price, ProviderId } from "@/lib/research/types";

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  etsy: "Etsy",
  ebay: "eBay",
  serpapi_google_shopping: "Google Shopping",
  claude_web_search: "Web search",
};

export function formatAmount(amount: number, currency: string): string {
  if (currency === "unknown") {
    // Shown next to a "currency not confirmed" label, so just the number here.
    return amount.toFixed(2);
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatPrice(price: Price): string {
  return price.currency === "unknown" ? price.raw : formatAmount(price.amount, price.currency);
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
