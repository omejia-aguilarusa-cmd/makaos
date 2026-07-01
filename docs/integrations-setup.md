# Maka OS — Integrations setup

Maka OS connects to Slack, QuickBooks, Google (Sheets / Drive / Calendar /
Gmail) and Claude through real OAuth 2.0 / API-key flows implemented as Vercel
serverless functions in `/api`. **No credentials live in the repo** — you supply
them as Vercel Environment Variables. Until a provider's variables are set, the
Integrations page shows it as "Not configured" and the app keeps working.

## How it works

- Tokens are stored **only in the operator's browser**, inside an AES-256-GCM
  encrypted, `httpOnly`, `Secure`, `SameSite=Lax` session cookie (`api/_lib/session.js`).
  There is no shared server-side token store.
- Each connect flow is CSRF-protected with a one-time `state` cookie.
- `GET /api/integrations/status` reports, per provider, whether it is configured
  (server has credentials) and connected (this browser has tokens).
- `GET /api/health` returns non-secret readiness booleans for debugging.

## Required environment variables (Vercel → Settings → Environment Variables)

| Variable | Used for | Required |
| --- | --- | --- |
| `SESSION_SECRET` | Encrypts the session cookie. Use a long random string. | **Yes** (for any OAuth) |
| `OAUTH_REDIRECT_BASE` | Public base URL, e.g. `https://makaos.vercel.app`. If unset, derived from the request host. | Recommended |
| `ANTHROPIC_API_KEY` | The real Claude assistant (`/api/assistant`). | For Claude |
| `ANTHROPIC_MODEL` | Override the assistant model (default `claude-opus-4-8`). | Optional |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Sheets/Drive/Calendar/Gmail (one OAuth app). | For Google |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Slack bot connection. | For Slack |
| `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET` | QuickBooks Online. | For QuickBooks |

Generate a `SESSION_SECRET` with, e.g., `openssl rand -base64 48`.

## Redirect URIs to register with each provider

Use your production base (or add the Vercel preview URL too). Path is always
`/api/oauth/<provider>/callback`:

- Google: `https://makaos.vercel.app/api/oauth/google/callback`
- Slack: `https://makaos.vercel.app/api/oauth/slack/callback`
- QuickBooks: `https://makaos.vercel.app/api/oauth/quickbooks/callback`

### Provider consoles & scopes

- **Google** — Google Cloud Console → APIs & Services → Credentials → OAuth
  client (Web). Enable the Sheets, Drive, Calendar and Gmail APIs. Scopes
  requested: `spreadsheets`, `drive.file`, `calendar`, `gmail.send`, plus
  `openid email profile`.
- **Slack** — api.slack.com/apps → OAuth & Permissions. Bot scopes:
  `chat:write`, `chat:write.public`, `channels:read`.
- **QuickBooks** — Intuit Developer → your app → Keys & OAuth. Scope:
  `com.intuit.quickbooks.accounting`. The callback receives a `realmId`
  (company id), which is stored with the tokens.

## Security notes

- Production is a **public URL with real payroll PII**. Before connecting
  accounting (QuickBooks) or storing any Google tokens, turn on **Vercel
  Deployment Protection** (Project → Settings → Deployment Protection) so only
  authenticated viewers can reach the app and the `/api/assistant` proxy.
- Rotate any secret that has ever been pasted into a chat or commit.
- The session cookie has a ~4KB browser limit; connecting several providers at
  once with large tokens can approach it. Connect what you use.
