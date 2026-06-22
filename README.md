# Cloudflare MCP Pro ☁️

> MCP server for the **Cloudflare REST API v4** — **69 tools** across DNS, Zones, Workers, KV, R2, D1, Pages, Queues, Tunnels, SSL, WAF, Email Routing, Logpush and Workers AI in a **single local stdio server** authenticated by API token.

[![npm version](https://img.shields.io/npm/v/cloudflare-mcp-pro.svg?style=flat-square)](https://www.npmjs.com/package/cloudflare-mcp-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/helbertparanhos/cloudflare-mcp-pro?style=flat-square)](https://github.com/helbertparanhos/cloudflare-mcp-pro/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/helbertparanhos/cloudflare-mcp-pro?style=flat-square)](https://github.com/helbertparanhos/cloudflare-mcp-pro/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/helbertparanhos/cloudflare-mcp-pro?style=flat-square)](https://github.com/helbertparanhos/cloudflare-mcp-pro/issues)
[![Glama Quality](https://glama.ai/mcp/servers/helbertparanhos/cloudflare-mcp-pro/badges/score.svg)](https://glama.ai/mcp/servers/helbertparanhos/cloudflare-mcp-pro)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-000000?style=flat-square)](https://modelcontextprotocol.io/)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-D97706?style=flat-square)](https://claude.ai/code)
[![Cursor](https://img.shields.io/badge/Cursor-Compatible-4F46E5?style=flat-square)](https://cursor.sh)
[![Claude Desktop](https://img.shields.io/badge/Claude%20Desktop-Compatible-D97706?style=flat-square)](https://claude.ai/download)

[![Instagram](https://img.shields.io/badge/@helbertparanhos-E4405F?style=flat-square&logo=instagram&logoColor=white)](https://www.instagram.com/helbertparanhos)
[![YouTube](https://img.shields.io/badge/stratacademy-FF0000?style=flat-square&logo=youtube&logoColor=white)](https://www.youtube.com/@stratacademy)
[![LinkedIn](https://img.shields.io/badge/helbert--paranhos-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/helbert-paranhos/)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat-square&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/helbertparanhos)
[![Strat Academy](https://img.shields.io/badge/Strat%20Academy-8B5CF6?style=flat-square)](https://stratacademy.com.br)

Unlike the official Cloudflare MCP offering (13 separate remote, OAuth-based servers), `cloudflare-mcp-pro` runs locally over stdio, authenticates with a single **API token**, and consolidates the most-used Cloudflare operations into one server with consistent `verb_object` tool names — ideal for Claude Code, CI, and scripted automation.

## Features

- **DNS** — list/create/update/delete records, DNSSEC, BIND zone-file export
- **Zones** — list/get/create/delete, settings (SSL mode, HTTPS, min TLS…), cache purge, GraphQL analytics
- **Workers** — deploy (ES module), routes, secrets, cron triggers, list/get/delete
- **KV / R2 / D1** — namespaces + key CRUD, bucket management, databases + SQL queries
- **Pages / Queues / Tunnels** — list/get projects, queue management, tunnel inspection
- **Security** — WAF rulesets, IP/ASN/country access rules, page rules, SSL certificate packs, custom hostnames (SaaS), Turnstile widgets
- **Email Routing** — rules + destination addresses
- **Logpush** — list/create jobs (zone or account scoped)
- **Workers AI** — model catalog + inference (text generation, embeddings, classification)
- **Human-approval gate** — every mutating tool requires `confirm: true`; without it the tool returns a non-executing preview (with secrets redacted) instead of acting (see below)
- **MCP annotations** — every tool carries readOnly/destructive/idempotent hints so clients can gate dangerous actions
- **Auto-pagination** — `fetch_all: true` on list tools follows every page
- Single API-token auth, automatic retry + rate-limit (429/5xx) handling, and actionable error messages

## Installation

```bash
npm install
npm run build
```

Or run directly once published:

```bash
npx -y cloudflare-mcp-pro
```

## Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | ✅ | API token from https://dash.cloudflare.com/profile/api-tokens |
| `CLOUDFLARE_ACCOUNT_ID` | optional | Default account ID used when a tool doesn't receive `account_id` |
| `CLOUDFLARE_API_BASE` | optional | Override the API base URL |

**Token scopes** depend on what you use, e.g.: `Zone:Read`, `DNS:Edit`, `Workers Scripts:Edit`, `Workers KV Storage:Edit`, `Workers R2 Storage:Edit`, `D1:Edit`, `Pages:Edit`, `Account Analytics:Read`. Run the `verify_token` tool to confirm your token works.

## Testing

Run the automated test suite (no network — `fetch` is mocked):

```bash
npm test
```

It covers the human-approval gate, secret redaction, the security validations (hex IDs, path-segment encoding, model-id allowlist, purge mutual-exclusion, analytics hour-alignment), the API client (query serialization, 429 retry, error mapping, pagination + clamp, GraphQL non-JSON guard) and the Zod→JSON-Schema converter.

Interactive testing with the MCP inspector:

```bash
npx @modelcontextprotocol/inspector dist/index.js
```

## Add to Claude Code

In `.claude/settings.json` → `mcpServers`:

```json
{
  "mcpServers": {
    "cloudflare-mcp-pro": {
      "command": "node",
      "args": ["projects/cloudflare-mcp-pro/dist/index.js"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your-token",
        "CLOUDFLARE_ACCOUNT_ID": "your-account-id"
      }
    }
  }
}
```

## Add to Claude Desktop

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cloudflare-mcp-pro": {
      "command": "node",
      "args": ["/absolute/path/projects/cloudflare-mcp-pro/dist/index.js"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your-token",
        "CLOUDFLARE_ACCOUNT_ID": "your-account-id"
      }
    }
  }
}
```

## Human-approval gate

Every **mutating** tool (any `create_*`, `update_*`, `delete_*`, `deploy_*`, `put_*`, `edit_*`, `purge_cache`, `query_d1`, `run_ai`, …) is gated server-side. Read-only tools (`list_*`, `get_*`, `verify_token`, `export_dns_records`, analytics) are never gated.

- Calling a mutating tool **without** `confirm: true` returns a `confirmation_required` preview describing the tool, the risk level, and the (secret-redacted) arguments — and **does not execute**.
- Re-call the same tool with `"confirm": true` to actually perform it, after a human has approved.

This gate is enforced in the server regardless of the MCP client, and works alongside the MCP `annotations` (`destructiveHint`) that prompt the human in compatible clients like Claude Code. Secret values (e.g. Worker secret `text`) are redacted from previews and never appear in error messages.

```jsonc
// 1) preview (no confirm) → nothing happens
delete_zone { "zone_id": "..." }
// → { "status": "confirmation_required", "risk": "DESTRUCTIVE — ...", ... }

// 2) after human approval
delete_zone { "zone_id": "...", "confirm": true }   // actually deletes
```

## Tools (69)

List tools accept `fetch_all: true` to follow pagination. Mutating tools accept `confirm: true` (see the gate above). Every tool advertises MCP annotations (`readOnlyHint` / `destructiveHint` / `idempotentHint`).

**Account** — `verify_token`, `list_accounts`

**Zones & settings** — `list_zones`, `get_zone`, `create_zone`, `delete_zone`, `purge_cache`, `get_zone_analytics`, `get_zone_setting`, `update_zone_setting`

**DNS** — `list_dns_records`, `create_dns_record`, `update_dns_record`, `delete_dns_record`, `get_dnssec`, `edit_dnssec`, `export_dns_records`

**Workers** — `list_workers`, `get_worker`, `deploy_worker`, `delete_worker`, `list_worker_routes`, `create_worker_route`, `delete_worker_route`, `put_worker_secret`, `delete_worker_secret`, `update_worker_cron`

**KV** — `list_kv_namespaces`, `create_kv_namespace`, `kv_list_keys`, `kv_get`, `kv_put`, `kv_delete`

**R2** — `list_r2_buckets`, `create_r2_bucket`, `delete_r2_bucket`

**D1** — `list_d1_databases`, `create_d1_database`, `query_d1`

**Pages** — `list_pages_projects`, `get_pages_project`

**WAF & firewall** — `list_firewall_rulesets`, `get_ruleset`, `list_access_rules`, `create_access_rule`, `delete_access_rule`

**Page rules** — `list_page_rules`, `create_page_rule`, `delete_page_rule`

**SSL/TLS** — `list_certificate_packs`, `get_ssl_verification`, `order_certificate_pack`

**Custom hostnames (SaaS)** — `list_custom_hostnames`, `create_custom_hostname`, `delete_custom_hostname`

**Email Routing** — `list_email_rules`, `create_email_rule`, `list_email_destinations`

**Queues** — `list_queues`, `create_queue`, `delete_queue`

**Tunnels** — `list_tunnels`, `get_tunnel`

**Turnstile** — `list_turnstile_widgets`, `create_turnstile_widget`

**Workers AI** — `list_ai_models`, `run_ai`

**Logpush** — `list_logpush_jobs`, `create_logpush_job`

## Author

**Helbert Paranhos / Strat Academy** — [stratacademy.com.br](https://stratacademy.com.br)

- GitHub: [@helbertparanhos](https://github.com/helbertparanhos)
- Instagram: [@helbertparanhos](https://www.instagram.com/helbertparanhos)
- YouTube: [@stratacademy](https://www.youtube.com/@stratacademy)
- LinkedIn: [helbert-paranhos](https://www.linkedin.com/in/helbert-paranhos/)

## License

MIT — see [LICENSE](LICENSE).
