# Security

## Secret Handling
- All Supabase keys, AI API keys stored in Vercel environment variables only
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` exposed to the client
- Service role key never referenced in frontend code

## Permission Model (v1 → lock-down)
| Sprint | Model |
|---|---|
| v1 | Open RLS — all reads/writes allowed; demo-safe, no real PII |
| Lock-down | RLS: `auth.uid() = user_id`; role checked server-side for Admin actions |

### Roles
- **Admin** — full CRUD on all objects; can publish digests; can archive/delete
- **Member** — create/edit own work items and updates; read all
- **Viewer** — read-only across all objects

## Approved Tools Rule
Agents may only call named tools listed in `AGENTIC_LAYER.md`. No `run_any`, `eval`, or raw SQL execution from agent context. Every tool call is logged to `audit_logs`.

## Audit Principle
Every state-changing action (create, update, delete, status change, digest publish) writes a row to `audit_logs` with actor, before state, and after state. Audit rows are never deleted.
