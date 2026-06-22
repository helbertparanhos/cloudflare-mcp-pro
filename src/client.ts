import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type {
  CloudflareResponse,
  CloudflareGraphQLResponse,
} from "./types.js";

const DEFAULT_BASE = "https://api.cloudflare.com/client/v4";
const GRAPHQL_PATH = "/graphql";
const MAX_RETRIES = 3;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Query string parameters. */
  query?: Record<string, string | number | boolean | undefined>;
  /** JSON body. Mutually exclusive with `raw`. */
  body?: unknown;
  /** Raw body (string/ArrayBuffer) for endpoints that don't take JSON. */
  raw?: { data: BodyInit; contentType: string };
}

/**
 * Thin, resilient client for the Cloudflare REST API v4.
 * Handles auth, JSON envelopes, rate-limit (429) and 5xx retries with backoff,
 * and turns API errors into actionable McpError messages.
 */
export class CloudflareClient {
  private readonly token: string;
  private readonly base: string;
  readonly defaultAccountId: string | undefined;

  constructor(opts?: {
    token?: string;
    base?: string;
    accountId?: string;
  }) {
    const token = opts?.token ?? process.env.CLOUDFLARE_API_TOKEN;
    if (!token) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Missing CLOUDFLARE_API_TOKEN. Create a token at https://dash.cloudflare.com/profile/api-tokens and set it in your environment."
      );
    }
    this.token = token;
    this.base = (opts?.base ?? process.env.CLOUDFLARE_API_BASE ?? DEFAULT_BASE).replace(
      /\/$/,
      ""
    );
    // The Bearer token is sent to whatever base is configured; warn if it isn't
    // the official API so a misconfigured base (token exfiltration) is visible.
    if (this.base !== DEFAULT_BASE) {
      console.error(
        `[cloudflare-mcp-pro] WARNING: using non-default API base "${this.base}". The API token will be sent to this host.`
      );
    }
    this.defaultAccountId =
      opts?.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? undefined;
  }

  /** Resolve an account id from an argument or the configured default. */
  requireAccountId(provided?: string): string {
    const id = provided ?? this.defaultAccountId;
    if (!id) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "No account_id provided and CLOUDFLARE_ACCOUNT_ID is not set. Pass account_id or run list_accounts to find one."
      );
    }
    return id;
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const url = new URL(`${this.base}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
  }

  /** Build the url + fetch init (method, headers, body) for a request. */
  private buildRequest(
    path: string,
    options: RequestOptions
  ): { url: string; method: string; init: RequestInit } {
    const { method = "GET", query, body, raw } = options;
    const url = this.buildUrl(path, query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };
    let payload: BodyInit | undefined;
    if (raw) {
      payload = raw.data;
      // Empty contentType means "let fetch set it" (e.g. FormData multipart boundary).
      if (raw.contentType) headers["Content-Type"] = raw.contentType;
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }
    return { url, method, init: { method, headers, body: payload } };
  }

  /**
   * Fetch with retry/backoff on network errors, 429, and 5xx. Returns the raw
   * Response on a terminal (non-retryable) status. Shared by all request paths.
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    method: string,
    path: string
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, init);
      } catch (err: any) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          await this.sleep(2 ** attempt * 500);
          continue;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Network error calling Cloudflare (${method} ${path}): ${err?.message ?? err}`
        );
      }

      // Retry on rate limit / transient server errors.
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 2 ** attempt * 500;
        await this.sleep(wait);
        continue;
      }

      return res;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Cloudflare request failed after ${MAX_RETRIES} retries (${method} ${path}): ${
        (lastError as any)?.message ?? lastError
      }`
    );
  }

  /** Perform a REST request and unwrap the Cloudflare envelope. */
  async request<T = unknown>(
    path: string,
    options: RequestOptions = {}
  ): Promise<{ result: T; info?: CloudflareResponse<T>["result_info"] }> {
    const { url, method, init } = this.buildRequest(path, options);
    const res = await this.fetchWithRetry(url, init, method, path);

    const text = await res.text();
    let json: CloudflareResponse<T> | undefined;
    try {
      json = text ? (JSON.parse(text) as CloudflareResponse<T>) : undefined;
    } catch {
      // Non-JSON response (rare) — fall through to status handling.
    }

    if (!res.ok || (json && json.success === false)) {
      const apiErrors =
        json?.errors?.map((e) => `[${e.code}] ${e.message}`).join("; ") ||
        text ||
        res.statusText;
      throw this.apiError(method, path, res.status, apiErrors);
    }

    return {
      result: (json?.result as T) ?? (undefined as T),
      info: json?.result_info,
    };
  }

  /**
   * Like request(), but follows result_info pagination and returns every page's
   * results concatenated into a single array. Use for list endpoints when the
   * caller asks for the complete set. Caps at `maxPages` to avoid runaway loops.
   */
  async requestAllPages<T = unknown>(
    path: string,
    options: RequestOptions = {},
    maxPages = 50
  ): Promise<T[]> {
    // Clamp per-page so a caller can't request huge pages and balloon memory.
    const perPage = Math.min(Number(options.query?.per_page) || 50, 100);
    const all: T[] = [];
    let page = Number(options.query?.page) || 1;

    for (let i = 0; i < maxPages; i++) {
      const { result, info } = await this.request<T[]>(path, {
        ...options,
        query: { ...options.query, page, per_page: perPage },
      });
      if (Array.isArray(result)) all.push(...result);
      const totalPages = info?.total_pages;
      if (!totalPages || page >= totalPages) break;
      page += 1;
    }
    return all;
  }

  /**
   * Perform a request that returns a raw (non-envelope) body, e.g. KV values.
   * Returns the response text as-is. Shares the retry layer with request().
   */
  async requestText(
    path: string,
    options: RequestOptions = {}
  ): Promise<string> {
    const { url, method, init } = this.buildRequest(path, options);
    const res = await this.fetchWithRetry(url, init, method, path);
    const text = await res.text();
    if (!res.ok) {
      throw this.apiError(method, path, res.status, text || res.statusText);
    }
    return text;
  }

  /** Query the Cloudflare GraphQL analytics API (shares retry + error handling). */
  async graphql<T = unknown>(
    queryStr: string,
    variables: Record<string, unknown>
  ): Promise<T> {
    const { url, method, init } = this.buildRequest(GRAPHQL_PATH, {
      method: "POST",
      body: { query: queryStr, variables },
    });
    const res = await this.fetchWithRetry(url, init, method, GRAPHQL_PATH);

    const text = await res.text();
    let json: CloudflareGraphQLResponse<T> | undefined;
    try {
      json = text ? (JSON.parse(text) as CloudflareGraphQLResponse<T>) : undefined;
    } catch {
      // Non-JSON (e.g. HTML gateway/error page) — fall through to status handling.
    }

    if (!res.ok || !json) {
      throw this.apiError(method, GRAPHQL_PATH, res.status, text || res.statusText);
    }
    if (json.errors && json.errors.length) {
      throw new McpError(
        ErrorCode.InternalError,
        `Cloudflare GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`
      );
    }
    if (json.data == null) {
      throw new McpError(
        ErrorCode.InternalError,
        "Cloudflare GraphQL returned no data."
      );
    }
    return json.data;
  }

  /** Build a consistent McpError from an HTTP status + message. */
  private apiError(
    method: string,
    path: string,
    status: number,
    detail: string
  ): McpError {
    // Truncate the reflected response body so error logs can't leak large/sensitive payloads.
    if (detail.length > 500) detail = `${detail.slice(0, 500)}… (${detail.length} chars)`;
    return new McpError(
      status === 401 || status === 403
        ? ErrorCode.InvalidRequest
        : ErrorCode.InternalError,
      `Cloudflare API error (${method} ${path}, HTTP ${status}): ${detail}${this.hintForStatus(status)}`
    );
  }

  private hintForStatus(status: number): string {
    if (status === 401)
      return " — Hint: token is missing or invalid. Check CLOUDFLARE_API_TOKEN.";
    if (status === 403)
      return " — Hint: token lacks the required permissions for this resource. Add the matching scope in the dashboard.";
    if (status === 404)
      return " — Hint: resource not found. Verify the zone/account/record ID.";
    return "";
  }
}

/** Helper to format any JSON result as MCP tool content. */
export function jsonContent(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}
