import { z } from "zod";

/**
 * Minimal Zod → JSON Schema converter covering the subset of types used by
 * this server's tools (object, string, number, boolean, enum, array, optional,
 * union, null). Keeps the dependency footprint small and the output MCP-clean.
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, any> {
  return convert(schema);
}

function convert(schema: z.ZodTypeAny): Record<string, any> {
  const def = (schema as any)._def;
  const description = def.description as string | undefined;
  let out: Record<string, any>;

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convert(value);
      if (!isOptional(value)) required.push(key);
    }
    out = { type: "object", properties };
    if (required.length) out.required = required;
    out.additionalProperties = false;
  } else if (schema instanceof z.ZodString) {
    out = { type: "string" };
  } else if (schema instanceof z.ZodNumber) {
    out = { type: "number" };
  } else if (schema instanceof z.ZodBoolean) {
    out = { type: "boolean" };
  } else if (schema instanceof z.ZodNull) {
    out = { type: "null" };
  } else if (schema instanceof z.ZodEnum) {
    out = { type: "string", enum: def.values };
  } else if (schema instanceof z.ZodLiteral) {
    const v = def.value;
    const t =
      typeof v === "number" ? "number" : typeof v === "boolean" ? "boolean" : "string";
    out = { type: t, const: v };
  } else if (schema instanceof z.ZodArray) {
    out = { type: "array", items: convert(def.type) };
  } else if (schema instanceof z.ZodRecord) {
    // Open-ended object map; z.any() value type yields {} (any value allowed).
    out = { type: "object", additionalProperties: convert(def.valueType) };
  } else if (schema instanceof z.ZodOptional) {
    out = convert(def.innerType);
  } else if (schema instanceof z.ZodDefault) {
    out = convert(def.innerType);
  } else if (schema instanceof z.ZodUnion) {
    out = { anyOf: (def.options as z.ZodTypeAny[]).map(convert) };
  } else if (schema instanceof z.ZodAny || schema instanceof z.ZodUnknown) {
    // Intentionally any value — emit an empty (permissive) schema, no warning.
    out = {};
  } else {
    // Unknown Zod type: emit a permissive schema but warn so it isn't silent.
    console.error(
      `[schema] unhandled Zod type "${def.typeName ?? "unknown"}" — emitting {} (no validation hint)`
    );
    out = {};
  }

  if (description && !out.description) out.description = description;
  return out;
}

function isOptional(schema: z.ZodTypeAny): boolean {
  return (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodDefault ||
    schema.isOptional?.()
  );
}
