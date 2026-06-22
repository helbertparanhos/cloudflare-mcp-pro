import { z } from "zod";

/** Shape of a Cloudflare REST API v4 envelope. */
export interface CloudflareResponse<T = unknown> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    count: number;
    total_count: number;
    total_pages?: number;
  };
}

/** GraphQL analytics envelope. */
export interface CloudflareGraphQLResponse<T = unknown> {
  data: T | null;
  errors: Array<{ message: string; path?: string[] }> | null;
}

/** Reusable Zod fragments shared across tools. */

// Cloudflare zone/account IDs are 32 lowercase-hex chars. Validating the format
// rejects path-injection attempts (e.g. "../", "?", "#") before they reach a URL.
const HEX32 = /^[0-9a-f]{32}$/;

export const zoneIdSchema = z
  .string()
  .regex(HEX32, "must be a 32-character hex zone ID")
  .describe("The Cloudflare zone ID (32-char hex). Get it from list_zones.");

export const accountIdSchema = z
  .string()
  .regex(HEX32, "must be a 32-character hex account ID")
  .optional()
  .describe(
    "Cloudflare account ID. Falls back to CLOUDFLARE_ACCOUNT_ID env var when omitted."
  );

/**
 * Percent-encode a single user-controlled URL path segment. Use for free-form
 * IDs/names interpolated into request paths (key names, settings, secret names,
 * resource IDs) so reserved chars can't alter the route.
 */
export function seg(value: string): string {
  return encodeURIComponent(value);
}

export const fetchAllSchema = z
  .boolean()
  .optional()
  .describe(
    "When true, follow pagination and return all pages combined (ignores page/per_page)."
  );

export const dnsRecordTypeSchema = z
  .enum([
    "A",
    "AAAA",
    "CNAME",
    "TXT",
    "MX",
    "NS",
    "SRV",
    "CAA",
    "PTR",
    "SPF",
  ])
  .describe("DNS record type.");
