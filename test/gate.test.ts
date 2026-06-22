import { test } from "node:test";
import assert from "node:assert/strict";
import { CloudflareClient } from "../src/client.js";
import { tools, buildHandlers } from "../src/tools/index.js";
import { installFetch, ok } from "./helpers.js";

const HEX = "a".repeat(32);
const client = new CloudflareClient({ token: "test", accountId: HEX });

function preview(result: any) {
  return JSON.parse(result.content[0].text);
}

test("mutating tool without confirm returns preview and does NOT call the API", async () => {
  const fetchMock = installFetch(ok({ id: HEX }));
  try {
    const handlers = buildHandlers(client);
    const res = await handlers["delete_zone"]({ zone_id: HEX });
    const body = preview(res);
    assert.equal(body.status, "confirmation_required");
    assert.equal(body.tool, "delete_zone");
    assert.match(body.risk, /DESTRUCTIVE/);
    assert.equal(fetchMock.calls.length, 0, "no network call must happen without confirm");
  } finally {
    fetchMock.restore();
  }
});

test("mutating tool with confirm:true executes (calls the API)", async () => {
  const fetchMock = installFetch(ok({ id: HEX }));
  try {
    const handlers = buildHandlers(client);
    const res = await handlers["delete_zone"]({ zone_id: HEX, confirm: true });
    assert.equal(fetchMock.calls.length, 1);
    assert.equal(fetchMock.calls[0].method, "DELETE");
    assert.ok(!preview(res).status, "should not be a confirmation preview");
  } finally {
    fetchMock.restore();
  }
});

test("read-only tool is never gated and runs directly", async () => {
  const fetchMock = installFetch(ok([{ id: HEX, name: "example.com" }]));
  try {
    const handlers = buildHandlers(client);
    await handlers["list_zones"]({});
    assert.equal(fetchMock.calls.length, 1, "read-only call hits the API immediately");
  } finally {
    fetchMock.restore();
  }
});

test("preview redacts Worker secret value", async () => {
  const fetchMock = installFetch(ok({}));
  try {
    const handlers = buildHandlers(client);
    const res = await handlers["put_worker_secret"]({
      account_id: HEX,
      script_name: "api",
      name: "API_KEY",
      text: "super-secret-value",
    });
    const text = res.content[0].text;
    assert.ok(!text.includes("super-secret-value"), "secret must not appear in preview");
    assert.ok(text.includes("***redacted***"));
    assert.equal(fetchMock.calls.length, 0);
  } finally {
    fetchMock.restore();
  }
});

test("preview redacts KV value, Worker script and Logpush destination", async () => {
  const fetchMock = installFetch(ok({}));
  try {
    const handlers = buildHandlers(client);

    const kv = await handlers["kv_put"]({
      account_id: HEX,
      namespace_id: HEX,
      key: "session",
      value: "secret-session-token",
    });
    assert.ok(!kv.content[0].text.includes("secret-session-token"));

    const dep = await handlers["deploy_worker"]({
      account_id: HEX,
      script_name: "api",
      script: "const APIKEY='leak-me'; export default {}",
    });
    assert.ok(!dep.content[0].text.includes("leak-me"));

    const lp = await handlers["create_logpush_job"]({
      account_id: HEX,
      name: "job",
      dataset: "http_requests",
      destination_conf: "s3://bucket?key=AKIA-secret",
    });
    assert.ok(!lp.content[0].text.includes("AKIA-secret"));

    assert.equal(fetchMock.calls.length, 0, "all three were previews, no execution");
  } finally {
    fetchMock.restore();
  }
});

test("every mutating tool advertises a confirm param; read-only tools do not", () => {
  for (const t of tools) {
    const props = (t.inputSchema as any).properties ?? {};
    const mutating = t.annotations.readOnlyHint !== true;
    if (mutating) {
      assert.ok(props.confirm, `${t.name} should expose confirm`);
      assert.equal(props.confirm.type, "boolean");
    } else {
      assert.ok(!props.confirm, `${t.name} (read-only) should not expose confirm`);
    }
  }
});

test("confirm is optional (so a first call can return a preview)", () => {
  const del = tools.find((t) => t.name === "delete_zone")!;
  const required = (del.inputSchema as any).required ?? [];
  assert.ok(!required.includes("confirm"));
});
