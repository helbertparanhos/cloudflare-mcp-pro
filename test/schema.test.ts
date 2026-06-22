import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodToJsonSchema } from "../src/schema.js";

test("required vs optional detection", () => {
  const s = zodToJsonSchema(
    z.object({
      a: z.string(),
      b: z.string().optional(),
      c: z.number().int().optional(),
    })
  );
  assert.deepEqual(s.type, "object");
  assert.deepEqual(s.required, ["a"]);
  assert.equal(s.properties.a.type, "string");
  assert.equal(s.properties.c.type, "number");
});

test("enum becomes string enum", () => {
  const s = zodToJsonSchema(z.object({ m: z.enum(["block", "challenge"]) }));
  assert.deepEqual(s.properties.m.enum, ["block", "challenge"]);
  assert.equal(s.properties.m.type, "string");
});

test("array items and descriptions carry through", () => {
  const s = zodToJsonSchema(
    z.object({ tags: z.array(z.string()).describe("a list of tags") })
  );
  assert.equal(s.properties.tags.type, "array");
  assert.equal(s.properties.tags.items.type, "string");
  assert.equal(s.properties.tags.description, "a list of tags");
});

test("union becomes anyOf", () => {
  const s = zodToJsonSchema(
    z.object({ v: z.union([z.string(), z.number(), z.boolean()]) })
  );
  assert.ok(Array.isArray(s.properties.v.anyOf));
  assert.equal(s.properties.v.anyOf.length, 3);
});

test("additionalProperties is locked down", () => {
  const s = zodToJsonSchema(z.object({ a: z.string() }));
  assert.equal(s.additionalProperties, false);
});

test("literal union (validity_days) yields typed const values, not empty objects", () => {
  const s = zodToJsonSchema(
    z.object({
      v: z.union([z.literal(14), z.literal(30), z.literal(90), z.literal(365)]),
    })
  );
  const opts = s.properties.v.anyOf;
  assert.equal(opts.length, 4);
  for (const o of opts) {
    assert.equal(o.type, "number");
    assert.ok([14, 30, 90, 365].includes(o.const));
  }
});

test("record (run_ai input) becomes an object schema", () => {
  const s = zodToJsonSchema(z.object({ input: z.record(z.any()) }));
  assert.equal(s.properties.input.type, "object");
});
