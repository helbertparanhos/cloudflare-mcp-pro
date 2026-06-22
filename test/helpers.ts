/** Test helpers: install a fake global fetch and record calls. */

export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface FakeResponse {
  status?: number;
  /** JSON body (object) or raw string. */
  json?: unknown;
  text?: string;
  headers?: Record<string, string>;
}

type Responder = (call: RecordedCall, index: number) => FakeResponse;

/**
 * Replace global fetch with a fake. `responder` can be a single response, an
 * array (one per call, last repeats), or a function. Returns the recorded calls
 * and a restore() to put the real fetch back.
 */
export function installFetch(
  responder: FakeResponse | FakeResponse[] | Responder
) {
  const calls: RecordedCall[] = [];
  const real = globalThis.fetch;

  globalThis.fetch = (async (input: any, init: any = {}) => {
    const headers: Record<string, string> = {};
    const h = init.headers ?? {};
    for (const k of Object.keys(h)) headers[k] = h[k];
    const call: RecordedCall = {
      url: String(input),
      method: init.method ?? "GET",
      headers,
      body: init.body,
    };
    const index = calls.length;
    calls.push(call);

    let r: FakeResponse;
    if (typeof responder === "function") r = responder(call, index);
    else if (Array.isArray(responder))
      r = responder[Math.min(index, responder.length - 1)];
    else r = responder;

    const status = r.status ?? 200;
    const payload =
      r.text !== undefined ? r.text : r.json !== undefined ? JSON.stringify(r.json) : "";
    return new Response(payload, {
      status,
      headers: r.headers ?? { "content-type": "application/json" },
    });
  }) as typeof fetch;

  return {
    calls,
    restore() {
      globalThis.fetch = real;
    },
  };
}

/** A successful Cloudflare envelope. */
export function ok(result: unknown, result_info?: unknown): FakeResponse {
  return { status: 200, json: { success: true, errors: [], messages: [], result, result_info } };
}
