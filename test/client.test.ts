import { test } from "node:test";
import assert from "node:assert/strict";
import { CloudflareClient } from "../src/client.js";
import { installFetch, ok } from "./helpers.js";

const client = new CloudflareClient({ token: "test" });

test("query params: undefined skipped, falsy 0/false kept", async () => {
  const fetchMock = installFetch(ok([]));
  try {
    await client.request("/zones", {
      query: { a: undefined, b: 0, c: false, d: "x" },
    });
    const url = new URL(fetchMock.calls[0].url);
    assert.equal(url.searchParams.has("a"), false);
    assert.equal(url.searchParams.get("b"), "0");
    assert.equal(url.searchParams.get("c"), "false");
    assert.equal(url.searchParams.get("d"), "x");
  } finally {
    fetchMock.restore();
  }
});

test("Authorization bearer header is sent", async () => {
  const fetchMock = installFetch(ok({}));
  try {
    await client.request("/user/tokens/verify");
    assert.equal(fetchMock.calls[0].headers["Authorization"], "Bearer test");
  } finally {
    fetchMock.restore();
  }
});

test("retries on 429 then succeeds", async () => {
  const fetchMock = installFetch([
    { status: 429, json: { success: false, errors: [{ code: 1, message: "rate" }] } },
    ok({ done: true }),
  ]);
  try {
    const { result } = await client.request<{ done: boolean }>("/zones");
    assert.deepEqual(result, { done: true });
    assert.equal(fetchMock.calls.length, 2, "should retry once");
  } finally {
    fetchMock.restore();
  }
});

test("401 maps to an actionable error with a token hint", async () => {
  const fetchMock = installFetch({
    status: 401,
    json: { success: false, errors: [{ code: 1000, message: "bad token" }] },
  });
  try {
    await assert.rejects(client.request("/zones"), (err: any) => {
      assert.match(err.message, /HTTP 401/);
      assert.match(err.message, /CLOUDFLARE_API_TOKEN/);
      return true;
    });
  } finally {
    fetchMock.restore();
  }
});

test("requestAllPages follows pagination and concatenates", async () => {
  const fetchMock = installFetch((_call, i) =>
    ok([{ n: i }], { page: i + 1, per_page: 1, count: 1, total_count: 3, total_pages: 3 })
  );
  try {
    const all = await client.requestAllPages<{ n: number }>("/zones", {
      query: { per_page: 1 },
    });
    assert.equal(all.length, 3);
    assert.equal(fetchMock.calls.length, 3);
  } finally {
    fetchMock.restore();
  }
});

test("requestAllPages clamps per_page to 100", async () => {
  const fetchMock = installFetch(
    ok([{ n: 1 }], { page: 1, per_page: 100, count: 1, total_count: 1, total_pages: 1 })
  );
  try {
    await client.requestAllPages("/zones", { query: { per_page: 100000 } });
    const url = new URL(fetchMock.calls[0].url);
    assert.equal(url.searchParams.get("per_page"), "100");
  } finally {
    fetchMock.restore();
  }
});

test("graphql guards non-JSON error bodies instead of throwing SyntaxError", async () => {
  const fetchMock = installFetch({
    status: 502,
    text: "<html>Bad Gateway</html>",
    headers: { "content-type": "text/html" },
  });
  try {
    await assert.rejects(client.graphql("query{}", {}), (err: any) => {
      assert.match(err.message, /HTTP 502/);
      assert.doesNotMatch(err.message, /Unexpected token/);
      return true;
    });
  } finally {
    fetchMock.restore();
  }
});
