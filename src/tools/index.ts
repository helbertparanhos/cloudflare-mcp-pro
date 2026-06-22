import { zodToJsonSchema } from "../schema.js";
import type { CloudflareClient } from "../client.js";
import { z } from "zod";

import * as account from "./account.js";
import * as zones from "./zones.js";
import * as zoneSettings from "./zone-settings.js";
import * as dns from "./dns.js";
import * as workers from "./workers.js";
import * as kv from "./kv.js";
import * as r2 from "./r2.js";
import * as d1 from "./d1.js";
import * as pages from "./pages.js";
import * as firewall from "./firewall.js";
import * as ssl from "./ssl.js";
import * as accessRules from "./access-rules.js";
import * as pageRules from "./page-rules.js";
import * as customHostnames from "./custom-hostnames.js";
import * as email from "./email.js";
import * as queues from "./queues.js";
import * as tunnels from "./tunnels.js";
import * as turnstile from "./turnstile.js";
import * as ai from "./ai.js";
import * as logpush from "./logpush.js";

/** MCP tool behavior hints, surfaced so clients can gate destructive actions. */
interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

interface ToolDef {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  handler: (args: any, client: CloudflareClient) => Promise<any>;
  annotations: ToolAnnotations;
}

// All tools talk to the remote Cloudflare API, so openWorldHint is always true.
const READ: ToolAnnotations = { readOnlyHint: true, openWorldHint: true };
const CREATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};
// PUT/PATCH-style writes that replace state: not destructive of data, idempotent.
const WRITE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};
const DELETE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
};
// Mutating action that isn't a clean create/replace/delete (e.g. purge, run SQL/AI).
const ACTION: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

const defs: ToolDef[] = [
  // ── Account ────────────────────────────────────────────────────────────
  {
    name: "verify_token",
    description: "Validate the configured Cloudflare API token and show its status/permissions.",
    schema: account.verifyTokenSchema,
    handler: account.verifyToken,
    annotations: READ,
  },
  {
    name: "list_accounts",
    description: "List Cloudflare accounts accessible by the token.",
    schema: account.listAccountsSchema,
    handler: account.listAccounts,
    annotations: READ,
  },
  // ── Zones ──────────────────────────────────────────────────────────────
  {
    name: "list_zones",
    description: "List zones (domains), optionally filtered by name or status.",
    schema: zones.listZonesSchema,
    handler: zones.listZones,
    annotations: READ,
  },
  {
    name: "get_zone",
    description: "Get details of a single zone by ID.",
    schema: zones.getZoneSchema,
    handler: zones.getZone,
    annotations: READ,
  },
  {
    name: "create_zone",
    description: "Add a new domain (zone) to an account.",
    schema: zones.createZoneSchema,
    handler: zones.createZone,
    annotations: CREATE,
  },
  {
    name: "delete_zone",
    description: "Delete a zone by ID.",
    schema: zones.deleteZoneSchema,
    handler: zones.deleteZone,
    annotations: DELETE,
  },
  {
    name: "purge_cache",
    description: "Purge a zone's cache — everything, or by files/tags/hosts/prefixes.",
    schema: zones.purgeCacheSchema,
    handler: zones.purgeCache,
    annotations: ACTION,
  },
  {
    name: "get_zone_analytics",
    description: "Get HTTP traffic analytics for a zone over a time range (via GraphQL).",
    schema: zones.getZoneAnalyticsSchema,
    handler: zones.getZoneAnalytics,
    annotations: READ,
  },
  // ── Zone Settings ────────────────────────────────────────────────────────
  {
    name: "get_zone_setting",
    description: "Get a single zone setting (e.g. ssl, always_use_https, min_tls_version).",
    schema: zoneSettings.getZoneSettingSchema,
    handler: zoneSettings.getZoneSetting,
    annotations: READ,
  },
  {
    name: "update_zone_setting",
    description: "Update a single zone setting (e.g. set ssl=full, always_use_https=on).",
    schema: zoneSettings.updateZoneSettingSchema,
    handler: zoneSettings.updateZoneSetting,
    annotations: WRITE,
  },
  // ── DNS ──────────────────────────────────────────────────────────────────
  {
    name: "list_dns_records",
    description: "List DNS records of a zone, optionally filtered by type/name.",
    schema: dns.listDnsRecordsSchema,
    handler: dns.listDnsRecords,
    annotations: READ,
  },
  {
    name: "create_dns_record",
    description: "Create a DNS record (A, AAAA, CNAME, TXT, MX, etc).",
    schema: dns.createDnsRecordSchema,
    handler: dns.createDnsRecord,
    annotations: CREATE,
  },
  {
    name: "update_dns_record",
    description: "Update an existing DNS record (partial update).",
    schema: dns.updateDnsRecordSchema,
    handler: dns.updateDnsRecord,
    annotations: WRITE,
  },
  {
    name: "delete_dns_record",
    description: "Delete a DNS record by ID.",
    schema: dns.deleteDnsRecordSchema,
    handler: dns.deleteDnsRecord,
    annotations: DELETE,
  },
  {
    name: "get_dnssec",
    description: "Get the DNSSEC status and DS record details for a zone.",
    schema: dns.getDnssecSchema,
    handler: dns.getDnssec,
    annotations: READ,
  },
  {
    name: "edit_dnssec",
    description: "Enable or disable DNSSEC for a zone.",
    schema: dns.editDnssecSchema,
    handler: dns.editDnssec,
    annotations: WRITE,
  },
  {
    name: "export_dns_records",
    description: "Export all DNS records of a zone as a BIND zone file.",
    schema: dns.exportDnsRecordsSchema,
    handler: dns.exportDnsRecords,
    annotations: READ,
  },
  // ── Workers ────────────────────────────────────────────────────────────
  {
    name: "list_workers",
    description: "List Worker scripts in an account.",
    schema: workers.listWorkersSchema,
    handler: workers.listWorkers,
    annotations: READ,
  },
  {
    name: "get_worker",
    description: "Get a Worker script's settings/metadata.",
    schema: workers.getWorkerSchema,
    handler: workers.getWorker,
    annotations: READ,
  },
  {
    name: "deploy_worker",
    description: "Create or update (deploy) a Worker script from ES module source.",
    schema: workers.deployWorkerSchema,
    handler: workers.deployWorker,
    annotations: WRITE,
  },
  {
    name: "delete_worker",
    description: "Delete a Worker script by name.",
    schema: workers.deleteWorkerSchema,
    handler: workers.deleteWorker,
    annotations: DELETE,
  },
  {
    name: "list_worker_routes",
    description: "List Worker routes (URL patterns mapped to Workers) on a zone.",
    schema: workers.listWorkerRoutesSchema,
    handler: workers.listWorkerRoutes,
    annotations: READ,
  },
  {
    name: "create_worker_route",
    description: "Create a Worker route mapping a URL pattern to a Worker script.",
    schema: workers.createWorkerRouteSchema,
    handler: workers.createWorkerRoute,
    annotations: CREATE,
  },
  {
    name: "delete_worker_route",
    description: "Delete a Worker route by ID.",
    schema: workers.deleteWorkerRouteSchema,
    handler: workers.deleteWorkerRoute,
    annotations: DELETE,
  },
  {
    name: "put_worker_secret",
    description: "Create or update a secret binding on a Worker script.",
    schema: workers.putWorkerSecretSchema,
    handler: workers.putWorkerSecret,
    annotations: WRITE,
  },
  {
    name: "delete_worker_secret",
    description: "Delete a secret binding from a Worker script.",
    schema: workers.deleteWorkerSecretSchema,
    handler: workers.deleteWorkerSecret,
    annotations: DELETE,
  },
  {
    name: "update_worker_cron",
    description: "Set the cron triggers (schedules) for a Worker script.",
    schema: workers.updateWorkerCronSchema,
    handler: workers.updateWorkerCron,
    annotations: WRITE,
  },
  // ── KV ──────────────────────────────────────────────────────────────────
  {
    name: "list_kv_namespaces",
    description: "List Workers KV namespaces in an account.",
    schema: kv.listKvNamespacesSchema,
    handler: kv.listKvNamespaces,
    annotations: READ,
  },
  {
    name: "create_kv_namespace",
    description: "Create a new Workers KV namespace.",
    schema: kv.createKvNamespaceSchema,
    handler: kv.createKvNamespace,
    annotations: CREATE,
  },
  {
    name: "kv_list_keys",
    description: "List keys in a KV namespace, optionally filtered by prefix.",
    schema: kv.kvListKeysSchema,
    handler: kv.kvListKeys,
    annotations: READ,
  },
  {
    name: "kv_get",
    description: "Read the value of a key in a KV namespace.",
    schema: kv.kvGetSchema,
    handler: kv.kvGet,
    annotations: READ,
  },
  {
    name: "kv_put",
    description: "Write a value to a key in a KV namespace, with optional TTL.",
    schema: kv.kvPutSchema,
    handler: kv.kvPut,
    annotations: WRITE,
  },
  {
    name: "kv_delete",
    description: "Delete a key from a KV namespace.",
    schema: kv.kvDeleteSchema,
    handler: kv.kvDelete,
    annotations: DELETE,
  },
  // ── R2 ────────────────────────────────────────────────────────────────
  {
    name: "list_r2_buckets",
    description: "List R2 buckets in an account.",
    schema: r2.listR2BucketsSchema,
    handler: r2.listR2Buckets,
    annotations: READ,
  },
  {
    name: "create_r2_bucket",
    description: "Create a new R2 bucket.",
    schema: r2.createR2BucketSchema,
    handler: r2.createR2Bucket,
    annotations: CREATE,
  },
  {
    name: "delete_r2_bucket",
    description: "Delete an (empty) R2 bucket.",
    schema: r2.deleteR2BucketSchema,
    handler: r2.deleteR2Bucket,
    annotations: DELETE,
  },
  // ── D1 ────────────────────────────────────────────────────────────────
  {
    name: "list_d1_databases",
    description: "List D1 databases in an account.",
    schema: d1.listD1DatabasesSchema,
    handler: d1.listD1Databases,
    annotations: READ,
  },
  {
    name: "create_d1_database",
    description: "Create a new D1 database.",
    schema: d1.createD1DatabaseSchema,
    handler: d1.createD1Database,
    annotations: CREATE,
  },
  {
    name: "query_d1",
    description: "Execute a SQL statement against a D1 database (with optional bound params).",
    schema: d1.queryD1Schema,
    handler: d1.queryD1,
    annotations: ACTION,
  },
  // ── Pages ────────────────────────────────────────────────────────────────
  {
    name: "list_pages_projects",
    description: "List Cloudflare Pages projects in an account.",
    schema: pages.listPagesProjectsSchema,
    handler: pages.listPagesProjects,
    annotations: READ,
  },
  {
    name: "get_pages_project",
    description: "Get details of a Cloudflare Pages project.",
    schema: pages.getPagesProjectSchema,
    handler: pages.getPagesProject,
    annotations: READ,
  },
  // ── Firewall / WAF ────────────────────────────────────────────────────────
  {
    name: "list_firewall_rulesets",
    description: "List WAF rulesets configured on a zone.",
    schema: firewall.listFirewallRulesetsSchema,
    handler: firewall.listFirewallRulesets,
    annotations: READ,
  },
  {
    name: "get_ruleset",
    description: "Get a single ruleset (with its rules) by ID.",
    schema: firewall.getRulesetSchema,
    handler: firewall.getRuleset,
    annotations: READ,
  },
  // ── IP Access Rules ──────────────────────────────────────────────────────
  {
    name: "list_access_rules",
    description: "List IP/ASN/country access rules (block/challenge/allow) on a zone.",
    schema: accessRules.listAccessRulesSchema,
    handler: accessRules.listAccessRules,
    annotations: READ,
  },
  {
    name: "create_access_rule",
    description: "Create an IP/ASN/country access rule (block, challenge, or whitelist).",
    schema: accessRules.createAccessRuleSchema,
    handler: accessRules.createAccessRule,
    annotations: CREATE,
  },
  {
    name: "delete_access_rule",
    description: "Delete an access rule by ID.",
    schema: accessRules.deleteAccessRuleSchema,
    handler: accessRules.deleteAccessRule,
    annotations: DELETE,
  },
  // ── Page Rules ────────────────────────────────────────────────────────────
  {
    name: "list_page_rules",
    description: "List page rules on a zone.",
    schema: pageRules.listPageRulesSchema,
    handler: pageRules.listPageRules,
    annotations: READ,
  },
  {
    name: "create_page_rule",
    description: "Create a page rule (URL pattern + actions like cache_level, forwarding_url).",
    schema: pageRules.createPageRuleSchema,
    handler: pageRules.createPageRule,
    annotations: CREATE,
  },
  {
    name: "delete_page_rule",
    description: "Delete a page rule by ID.",
    schema: pageRules.deletePageRuleSchema,
    handler: pageRules.deletePageRule,
    annotations: DELETE,
  },
  // ── SSL / TLS ────────────────────────────────────────────────────────────
  {
    name: "list_certificate_packs",
    description: "List SSL/TLS certificate packs on a zone.",
    schema: ssl.listCertificatePacksSchema,
    handler: ssl.listCertificatePacks,
    annotations: READ,
  },
  {
    name: "get_ssl_verification",
    description: "Get SSL/TLS certificate verification status for a zone.",
    schema: ssl.getSslVerificationSchema,
    handler: ssl.getSslVerification,
    annotations: READ,
  },
  {
    name: "order_certificate_pack",
    description: "Order an advanced certificate pack for one or more hostnames.",
    schema: ssl.orderCertificatePackSchema,
    handler: ssl.orderCertificatePack,
    annotations: CREATE,
  },
  // ── Custom Hostnames (SaaS) ──────────────────────────────────────────────
  {
    name: "list_custom_hostnames",
    description: "List custom hostnames (SSL for SaaS) on a zone.",
    schema: customHostnames.listCustomHostnamesSchema,
    handler: customHostnames.listCustomHostnames,
    annotations: READ,
  },
  {
    name: "create_custom_hostname",
    description: "Add a custom hostname (SSL for SaaS) to a zone.",
    schema: customHostnames.createCustomHostnameSchema,
    handler: customHostnames.createCustomHostname,
    annotations: CREATE,
  },
  {
    name: "delete_custom_hostname",
    description: "Delete a custom hostname by ID.",
    schema: customHostnames.deleteCustomHostnameSchema,
    handler: customHostnames.deleteCustomHostname,
    annotations: DELETE,
  },
  // ── Email Routing ────────────────────────────────────────────────────────
  {
    name: "list_email_rules",
    description: "List Email Routing rules on a zone.",
    schema: email.listEmailRulesSchema,
    handler: email.listEmailRules,
    annotations: READ,
  },
  {
    name: "create_email_rule",
    description: "Create an Email Routing rule (forward an address to a destination).",
    schema: email.createEmailRuleSchema,
    handler: email.createEmailRule,
    annotations: CREATE,
  },
  {
    name: "list_email_destinations",
    description: "List verified Email Routing destination addresses in an account.",
    schema: email.listEmailDestinationsSchema,
    handler: email.listEmailDestinations,
    annotations: READ,
  },
  // ── Queues ────────────────────────────────────────────────────────────────
  {
    name: "list_queues",
    description: "List Cloudflare Queues in an account.",
    schema: queues.listQueuesSchema,
    handler: queues.listQueues,
    annotations: READ,
  },
  {
    name: "create_queue",
    description: "Create a new Cloudflare Queue.",
    schema: queues.createQueueSchema,
    handler: queues.createQueue,
    annotations: CREATE,
  },
  {
    name: "delete_queue",
    description: "Delete a Queue by ID.",
    schema: queues.deleteQueueSchema,
    handler: queues.deleteQueue,
    annotations: DELETE,
  },
  // ── Tunnels ────────────────────────────────────────────────────────────
  {
    name: "list_tunnels",
    description: "List Cloudflare Tunnels (cloudflared) in an account.",
    schema: tunnels.listTunnelsSchema,
    handler: tunnels.listTunnels,
    annotations: READ,
  },
  {
    name: "get_tunnel",
    description: "Get details of a Cloudflare Tunnel by ID.",
    schema: tunnels.getTunnelSchema,
    handler: tunnels.getTunnel,
    annotations: READ,
  },
  // ── Turnstile ────────────────────────────────────────────────────────────
  {
    name: "list_turnstile_widgets",
    description: "List Turnstile widgets in an account.",
    schema: turnstile.listTurnstileWidgetsSchema,
    handler: turnstile.listTurnstileWidgets,
    annotations: READ,
  },
  {
    name: "create_turnstile_widget",
    description: "Create a Turnstile widget (CAPTCHA alternative) for given domains.",
    schema: turnstile.createTurnstileWidgetSchema,
    handler: turnstile.createTurnstileWidget,
    annotations: CREATE,
  },
  // ── Workers AI ────────────────────────────────────────────────────────────
  {
    name: "list_ai_models",
    description: "Search the catalog of Workers AI models available to the account.",
    schema: ai.listAiModelsSchema,
    handler: ai.listAiModels,
    annotations: READ,
  },
  {
    name: "run_ai",
    description: "Run inference on a Workers AI model (text generation, embeddings, classification).",
    schema: ai.runAiSchema,
    handler: ai.runAi,
    annotations: ACTION,
  },
  // ── Logpush ────────────────────────────────────────────────────────────
  {
    name: "list_logpush_jobs",
    description: "List Logpush jobs for a zone or account.",
    schema: logpush.listLogpushJobsSchema,
    handler: logpush.listLogpushJobs,
    annotations: READ,
  },
  {
    name: "create_logpush_job",
    description: "Create a Logpush job streaming a dataset to a destination.",
    schema: logpush.createLogpushJobSchema,
    handler: logpush.createLogpushJob,
    annotations: CREATE,
  },
];

/** A tool mutates state (and so needs confirmation) unless it is read-only. */
function isMutating(d: ToolDef): boolean {
  return d.annotations.readOnlyHint !== true;
}

const CONFIRM_PROP = {
  type: "boolean",
  description:
    "Human-approval gate: must be true to actually perform this mutating operation. " +
    "Omit or set false to get a non-executing preview of what would happen (with secrets redacted). " +
    "A human should approve before this is set to true.",
};

/** MCP tool listing (name, description, JSON Schema, annotations). */
export const tools = defs.map((d) => {
  const inputSchema = zodToJsonSchema(d.schema) as {
    properties?: Record<string, unknown>;
    [k: string]: unknown;
  };
  if (isMutating(d)) {
    inputSchema.properties = { ...(inputSchema.properties ?? {}), confirm: CONFIRM_PROP };
  }
  return {
    name: d.name,
    description: isMutating(d)
      ? `${d.description} Requires confirm:true (human-approval gate); without it returns a preview only.`
      : d.description,
    inputSchema,
    annotations: d.annotations,
  };
});

// Argument keys whose values must never be echoed back in a preview.
// Covers Worker secret values, KV values, Worker source (may embed creds), and
// Logpush destinations (may embed credentials in the URI). zone-setting `value`
// is also redacted as a harmless side effect (preview-only — never the request).
const SENSITIVE_KEYS = new Set(["text", "value", "script", "destination_conf"]);

/** Redact secrets and truncate large blobs for a safe-to-display preview. */
function redactArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (SENSITIVE_KEYS.has(k)) out[k] = "***redacted***";
    else if (typeof v === "string" && v.length > 200)
      out[k] = `${v.slice(0, 200)}… (${v.length} chars)`;
    else out[k] = v;
  }
  return out;
}

function describeRisk(d: ToolDef): string {
  if (d.annotations.destructiveHint)
    return "DESTRUCTIVE — may permanently delete or irreversibly change a resource.";
  if (d.annotations.idempotentHint)
    return "WRITE — overwrites/changes configuration (may weaken security settings).";
  return "MUTATING — creates or changes a resource.";
}

/** Build a non-executing preview returned when confirmation is missing. */
function confirmationPreview(d: ToolDef, args: Record<string, unknown>) {
  const payload = {
    status: "confirmation_required",
    tool: d.name,
    risk: describeRisk(d),
    arguments: redactArgs(args),
    message:
      `This operation was NOT executed. It changes state and needs human approval. ` +
      `Re-call '${d.name}' with "confirm": true once a human has approved.`,
  };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

/** Build the name → handler map, binding each handler to the shared client. */
export function buildHandlers(client: CloudflareClient) {
  const map: Record<string, (args: unknown) => Promise<any>> = {};
  for (const d of defs) {
    const mutating = isMutating(d);
    map[d.name] = async (args: unknown) => {
      const raw = (args ?? {}) as Record<string, unknown>;
      if (mutating) {
        const { confirm, ...rest } = raw;
        // Hard server-side gate: never mutate without explicit confirm:true,
        // regardless of whether the MCP client honored the destructive hint.
        if (confirm !== true) {
          return confirmationPreview(d, d.schema.parse(rest));
        }
        return d.handler(d.schema.parse(rest), client);
      }
      return d.handler(d.schema.parse(raw), client);
    };
  }
  return map;
}
