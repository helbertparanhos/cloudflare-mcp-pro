# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/); this project adheres to
[Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-06-22

### Added
- Initial public release — **69 tools** across 18 Cloudflare product areas, in a single local stdio server authenticated by one API token:
  - **Account** (2): verify_token, list_accounts
  - **Zones & settings** (8): list/get/create/delete zones, purge_cache, get_zone_analytics (GraphQL), get/update zone setting
  - **DNS** (7): list/create/update/delete records, get/edit DNSSEC, BIND export
  - **Workers** (10): list/get/deploy/delete scripts, routes, secrets, cron triggers
  - **KV** (6): namespaces + key CRUD
  - **R2** (3): bucket management
  - **D1** (3): databases + SQL query (bound params)
  - **Pages** (2): list/get projects
  - **WAF & firewall** (2) + **IP access rules** (3) + **page rules** (3)
  - **SSL/TLS** (3): certificate packs, verification
  - **Custom hostnames / SSL for SaaS** (3)
  - **Email Routing** (3): rules + destinations
  - **Queues** (3) · **Tunnels** (2) · **Turnstile** (2) · **Workers AI** (2) · **Logpush** (2)
- **Human-approval gate** — every mutating tool requires `confirm: true`; without it the tool returns a non-executing, secret-redacted preview. Enforced server-side, with no bypass, regardless of the MCP client.
- **MCP annotations** (`readOnlyHint` / `destructiveHint` / `idempotentHint`) on every tool so compatible clients can gate dangerous actions.
- **Auto-pagination** — `fetch_all: true` on list tools follows every page (clamped to 100/page, capped at 50 pages).
- Resilient client: retry + backoff on 429/5xx, actionable 401/403 hints, non-JSON GraphQL guard, response bodies truncated in errors.
- Configuration for Claude Code, Cursor and Claude Desktop.

### Security
- Token read only from `CLOUDFLARE_API_TOKEN`; never logged nor reflected in error messages.
- Secret redaction in previews (`text`, `value`, `script`, `destination_conf`).
- Input hardening: hex-validated zone/account IDs, `encodeURIComponent` on every free-form path segment, SQL bound params, parameterized GraphQL, model-id charset allowlist.
