import { test } from "node:test";
import assert from "node:assert/strict";
import { CloudflareClient } from "../src/client.js";
import { buildHandlers } from "../src/tools/index.js";
import { seg } from "../src/types.js";
import { installFetch, ok } from "./helpers.js";

const HEX = "a".repeat(32);
const client = new CloudflareClient({ token: "test", accountId: HEX });
const handlers = buildHandlers(client);

test("seg() percent-encodes reserved path characters", () => {
  assert.equal(seg("a b/c"), "a%20b%2Fc");
  assert.equal(seg("../etc"), "..%2Fetc");
  assert.equal(seg("x?y#z"), "x%3Fy%23z");
});

test("invalid (non-hex) zone_id is rejected before any network call", async () => {
  const fetchMock = installFetch(ok({}));
  try {
    await assert.rejects(handlers["get_zone"]({ zone_id: "not-hex" }), (e: any) => {
      assert.match(String(e.message), /32-character hex zone ID/);
      return true;
    });
    assert.equal(fetchMock.calls.length, 0);
  } finally {
    fetchMock.restore();
  }
});

test("run_ai rejects a path-traversal model id", async () => {
  const fetchMock = installFetch(ok({}));
  try {
    await assert.rejects(
      handlers["run_ai"]({ account_id: HEX, model: "../../foo?x=1", input: { prompt: "hi" } }),
      (e: any) => {
        assert.match(String(e.message), /invalid model id/);
        return true;
      }
    );
    assert.equal(fetchMock.calls.length, 0);
  } finally {
    fetchMock.restore();
  }
});

test("run_ai accepts a legitimate @cf/.../... model id", async () => {
  const fetchMock = installFetch(ok({ response: "hi" }));
  try {
    await handlers["run_ai"]({
      account_id: HEX,
      model: "@cf/meta/llama-3.1-8b-instruct",
      input: { prompt: "hi" },
      confirm: true,
    });
    assert.equal(fetchMock.calls.length, 1);
    assert.ok(fetchMock.calls[0].url.endsWith("/ai/run/@cf/meta/llama-3.1-8b-instruct"));
  } finally {
    fetchMock.restore();
  }
});

test("free-form path segment is encoded (get_zone_setting)", async () => {
  const fetchMock = installFetch(ok({ value: "on" }));
  try {
    await handlers["get_zone_setting"]({ zone_id: HEX, setting: "a b/c" });
    assert.ok(fetchMock.calls[0].url.includes("/settings/a%20b%2Fc"));
  } finally {
    fetchMock.restore();
  }
});

test("purge_cache rejects purge_everything combined with selective fields", async () => {
  const fetchMock = installFetch(ok({}));
  try {
    await assert.rejects(
      handlers["purge_cache"]({
        zone_id: HEX,
        purge_everything: true,
        files: ["https://x/y"],
        confirm: true,
      }),
      (e: any) => {
        assert.match(String(e.message), /cannot be combined/);
        return true;
      }
    );
    assert.equal(fetchMock.calls.length, 0, "must fail locally, no API call");
  } finally {
    fetchMock.restore();
  }
});

test("get_zone_analytics rejects non-hour-aligned datetimes", async () => {
  const fetchMock = installFetch(ok({}));
  try {
    await assert.rejects(
      handlers["get_zone_analytics"]({
        zone_id: HEX,
        since: "2024-01-01T12:34:56Z",
        until: "2024-01-02T00:00:00Z",
      }),
      (e: any) => {
        assert.match(String(e.message), /hour-aligned/);
        return true;
      }
    );
    assert.equal(fetchMock.calls.length, 0);
  } finally {
    fetchMock.restore();
  }
});

test("create_dns_record forces ttl default of 1 when omitted", async () => {
  const fetchMock = installFetch(ok({ id: "rec" }));
  try {
    await handlers["create_dns_record"]({
      zone_id: HEX,
      type: "A",
      name: "www.example.com",
      content: "1.2.3.4",
      confirm: true,
    });
    const body = JSON.parse(fetchMock.calls[0].body as string);
    assert.equal(body.ttl, 1);
  } finally {
    fetchMock.restore();
  }
});
