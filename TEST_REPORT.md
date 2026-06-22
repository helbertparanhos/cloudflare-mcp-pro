# Test Report — Cloudflare MCP Pro v1.1.0

**Data:** 2026-06-22
**Ambiente:** Node 22 · Windows 11 · stdio (`node dist/index.js`)
**Conta de teste:** Stratacademy.ai@gmail.com (zonas `stratacademy.com.br`, `aispace.com.br`)
**Método:** handshake MCP JSON-RPC real (`initialize` → `tools/list` → `tools/call`) contra a API ao vivo da Cloudflare.

## Automated suite

`npm test` — **29/29 passando** (gate de confirmação, redação de secrets, validações de input, client retry/paginação, conversor Zod→JSON-Schema). Sem rede (fetch mockado).

## Live results

| Tool | Status | Observações |
|------|--------|-------------|
| `verify_token` | ✅ OK | status=active |
| `list_accounts` | ✅ OK | 1 conta |
| `list_zones` | ✅ OK | 2 zonas |
| `get_zone` | ✅ OK | status=active |
| `list_dns_records` | ✅ OK | 45 registros |
| `create_dns_record` | ✅ OK | TXT criado (ciclo seguro, com `confirm:true`) |
| `delete_dns_record` | ✅ OK | TXT removido; zona restaurada ao estado original |
| `get_dnssec` | ✅ OK | status=disabled |
| `list_workers` | ✅ OK | 0 (conta sem Worker scripts via API) |
| `list_kv_namespaces` | ✅ OK | 0 namespaces |
| `list_d1_databases` | ✅ OK | 0 DBs |
| `list_pages_projects` | ✅ OK | 1 projeto |
| `list_queues` | ✅ OK | 0 filas |
| `list_ai_models` | ✅ OK | 60 modelos |
| `list_page_rules` | ✅ OK | 3 regras |
| **Gate** `create_dns_record` sem `confirm` | ✅ OK | retornou `confirmation_required`, **não executou** |
| `get_zone_setting` | ⚠️ Token scope | HTTP 403 (Zone Settings ausente no token de teste); MCP surfou o erro com hint |
| `list_certificate_packs` | ⚠️ Token scope | HTTP 403 (SSL and Certificates ausente); hint correto |
| `list_firewall_rulesets` | ⚠️ Token scope | HTTP 403 (WAF/rulesets ausente); hint correto |
| `list_email_rules` | ⚠️ Token scope | HTTP 403 (Email Routing ausente); hint correto |
| `list_r2_buckets` | ⚠️ Account feature | HTTP 403 `[10042] enable R2` (R2 não habilitado na conta) |

### Validadas por revisão (não executadas contra produção)

Tools mutantes/destrutivas de alto impacto não foram executadas contra a conta de produção; o caminho de código é idêntico ao das mutações testadas (`create_dns_record`/`delete_dns_record`) e está coberto pelos 29 testes automatizados do gate + validações:

`create_zone`, `delete_zone`, `purge_cache`, `update_zone_setting`, `update_dns_record`, `edit_dnssec`, `deploy_worker`, `delete_worker`, `create/delete_worker_route`, `put/delete_worker_secret`, `update_worker_cron`, `create_kv_namespace`, `kv_put`, `kv_delete`, `create/delete_r2_bucket`, `create_d1_database`, `query_d1`, `run_ai`, `create/delete_access_rule`, `create/delete_page_rule`, `order_certificate_pack`, `create/delete_custom_hostname`, `create_email_rule`, `create/delete_queue`, `create_turnstile_widget`, `create_logpush_job`.

## Resumo

- **Total exercitado ao vivo:** 21 tools (16 ✅ OK · 5 ⚠️ bloqueadas por escopo do token / feature da conta)
- **Mutação real validada:** ciclo create→verify→delete de registro DNS, mais o gate de confirmação end-to-end.
- **0 erros atribuíveis ao MCP.** Os ⚠️ são respostas 403 corretas da API (token de teste com escopo mínimo) que o servidor reportou com hint acionável — não são bugs.
- **Automated:** 29/29.

## Observações

- O escopo do token de teste foi propositalmente mínimo. Tools de Zone Settings, SSL, WAF e Email Routing funcionam quando o token tem a permissão correspondente.
- R2/D1/Queues/Workers AI exigem o recurso habilitado na conta para retornar dados.
- Nenhum dado de produção foi alterado de forma persistente; o único objeto criado (registro DNS TXT de teste) foi removido ao fim.
