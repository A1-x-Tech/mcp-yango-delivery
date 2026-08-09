# Yango Delivery MCP

[![npm](https://img.shields.io/npm/v/mcp-yango-delivery)](https://www.npmjs.com/package/mcp-yango-delivery)
[![CI](https://github.com/A1-x-Tech/mcp-yango-delivery/actions/workflows/ci.yml/badge.svg)](https://github.com/A1-x-Tech/mcp-yango-delivery/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

MCP server for the **Yango Delivery B2B API** (the international brand of Yandex
Delivery): estimate delivery prices, create and confirm express-courier claims,
track the courier and share tracking links with recipients — from Claude,
Cursor, Codex and other AI clients, in natural language.

The server covers the express (claims) contour of the API — same-day / on-demand
courier delivery, the only contour documented for countries outside Russia. The
assistant assembles the claim body, watches the statuses, checks the
cancellation terms and hands the recipient a tracking link.

## Quick start

1. [Get a token](#getting-access) in your delivery personal account.
2. Add the server — for example, in Claude Code ([other clients](#installation)):

   ```bash
   claude mcp add yango-delivery \
     -e YANGO_DELIVERY_TOKEN=your_token \
     -- npx -y mcp-yango-delivery@latest
   ```

3. Ask the assistant: "How much would it cost to deliver a 2 kg parcel from our
   office to Amir Timur Avenue 107?"

## What it can do

**Claim lifecycle:**

- **Price estimation** — `check_price`: price, distance and ETA without creating a claim.
- **Claims** — `create_claim` (create, with an idempotent `request_id`),
  `accept_claim` (confirm and start the courier search), `get_claim`
  (status, courier, pricing), `search_claims` (filtered search with pagination).
- **Cancellation** — `get_cancel_info` (free / paid / unavailable) and `cancel_claim`.

**Tracking & contact:**

- **Courier tracking** — `get_performer_position` (live geoposition),
  `get_points_eta` (expected arrival per route point) and `get_tracking_links`
  (public links for the recipient).
- **Contact** — `get_courier_phone` (temporary forwarded number) and
  `get_confirmation_code` (pickup/delivery confirmation code).

**Common:**

- **Universal `raw_request`** — a direct call to any API method (tariffs,
  delivery methods, proof of delivery, claim editing and other endpoints
  without a dedicated tool).
- **Resilience** — retries on 429 with backoff (5xx/network only for reads and
  the idempotent claim creation), a request timeout and a guard against leaking
  the token to a foreign host.

## Example prompts

Ask the assistant, for example:

- "Estimate the courier delivery of a 3 kg box from our office to the client at Amir Timur Avenue 107"
- "Create an express delivery claim for the flowers due at 18:00 and confirm it"
- "Where is the courier for claim … right now? Give me a tracking link for the client"
- "Get me the courier's phone number for the active claim"
- "Cancel yesterday's claim — first check whether the cancellation is free"

## API access

The server talks to the express (claims) contour of the delivery B2B API:

| Item | Value |
|---|---|
| Base URL | `https://b2b.taxi.yandex.net` (same host for all countries) |
| Path prefix | `/b2b/cargo/integration/v2/*` |
| Auth | `Authorization: Bearer <token>` |

The token is issued in the delivery personal account (Integration tab →
**"Get token"**) and never expires.

> **Note on branding.** The English API documentation is published under the
> "Yandex Delivery" name on yandex.com and uses the same host for Russia and
> other countries; no separate Yango-branded API host is documented. The
> Russia-only parts of the API (the `offers/calculate` pricing method and the
> NDD/pickup-point contour) are not part of this server.

> **No sandbox.** The express contour has no documented test environment —
> accepted claims order real couriers and lead to real charges.

## Installation

<details open>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add yango-delivery \
  -e YANGO_DELIVERY_TOKEN=your_token \
  -- npx -y mcp-yango-delivery@latest
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

`claude_desktop_config.json` — macOS `~/Library/Application Support/Claude/`, Windows `%APPDATA%\Claude\`

```json
{
  "mcpServers": {
    "yango-delivery": {
      "command": "npx",
      "args": ["-y", "mcp-yango-delivery@latest"],
      "env": { "YANGO_DELIVERY_TOKEN": "your_token" }
    }
  }
}
```

</details>

<details>
<summary><b>Cursor</b></summary>

`~/.cursor/mcp.json` (or `.cursor/mcp.json` in the project)

```json
{
  "mcpServers": {
    "yango-delivery": {
      "command": "npx",
      "args": ["-y", "mcp-yango-delivery@latest"],
      "env": { "YANGO_DELIVERY_TOKEN": "your_token" }
    }
  }
}
```

</details>

<details>
<summary><b>VS Code</b></summary>

`.vscode/mcp.json` — note the `servers` key (not `mcpServers`)

```json
{
  "servers": {
    "yango-delivery": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-yango-delivery@latest"],
      "env": { "YANGO_DELIVERY_TOKEN": "your_token" }
    }
  }
}
```

</details>

## Getting access

1. Register as a corporate client of the delivery service and sign the contract
   (log in with the credentials provided by your manager).
2. In the personal account, open the **Integration** tab and press **"Get token"**.
3. Put the token into `YANGO_DELIVERY_TOKEN`.

⚠️ The token is stored **in plain text** in the client config — treat it like a
password. It never expires but is **reset when the account password changes**.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `YANGO_DELIVERY_TOKEN` | yes | — | OAuth Bearer token from the delivery cabinet. |
| `YANGO_DELIVERY_BASE_URL` | no | `https://b2b.taxi.yandex.net` | API root override. |
| `YANGO_DELIVERY_LANG` | no | `en` | `Accept-Language` header value. |
| `YANGO_DELIVERY_TIMEOUT_MS` | no | `60000` | Per-request timeout, ms. |
| `YANGO_DELIVERY_MAX_RETRIES` | no | `3` | Retries on 429 (and 5xx for reads). |

## Requirements

- Node.js 20+ (runs via `npx`, no separate install needed).
- A corporate-client delivery account with an integration token.

## Limitations

- **This is NOT a read-only server.** `create_claim` + `accept_claim` really
  order a delivery and lead to charges; cancelling an accepted claim can be
  paid (check `get_cancel_info` first).
- **Rate limits are not published** — only HTTP 429 is known; the server
  retries it with backoff.
- No test/sandbox environment is documented for this API.

## Documentation

- [All tools](https://github.com/A1-x-Tech/mcp-yango-delivery/blob/main/docs/TOOLS.md) — the full list with descriptions.
- [Development](https://github.com/A1-x-Tech/mcp-yango-delivery/blob/main/docs/DEVELOPMENT.md) — build, tests, smoke check.
- [Publishing](https://github.com/A1-x-Tech/mcp-yango-delivery/blob/main/docs/PUBLISHING.md) — releasing and listing in MCP catalogs.
- [API reference](https://yandex.com/support/delivery-profile/en/api/express/overview) — the upstream method list.

## Support

Questions, ideas and contributions — message on Telegram: [@gistrec](http://t.me/gistrec).

## License

MIT — see [LICENSE](./LICENSE).
