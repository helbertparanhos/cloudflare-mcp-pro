# Contributing

Contributions are welcome!

1. Fork → create a branch → commit (Conventional Commits) → open a PR.
2. Report bugs and request features via [Issues](https://github.com/helbertparanhos/cloudflare-mcp-pro/issues).
3. For tools, follow the existing pattern: one module per product area, a Zod
   schema with `.describe()` on every field, IDs validated as hex, every
   free-form path segment passed through `seg()` (`encodeURIComponent`), and the
   correct MCP annotation (`READ` / `CREATE` / `WRITE` / `DELETE` / `ACTION`).
4. Run `npm run build` and `npm test` and confirm both are clean before opening the PR.

Contact: contato@helbertparanhos.com.br
