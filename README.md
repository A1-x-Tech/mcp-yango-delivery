# <img src="./assets/a1-logo.svg" alt="A1" width="40"> Yango Delivery MCP

[![npm](https://img.shields.io/npm/v/mcp-yango-delivery)](https://www.npmjs.com/package/mcp-yango-delivery)
[![CI](https://github.com/A1-x-Tech/mcp-yango-delivery/actions/workflows/ci.yml/badge.svg)](https://github.com/A1-x-Tech/mcp-yango-delivery/actions/workflows/ci.yml)
[![Glama](https://glama.ai/mcp/servers/A1-x-Tech/mcp-yango-delivery/badges/score.svg)](https://glama.ai/mcp/servers/A1-x-Tech/mcp-yango-delivery)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Yango Delivery MCP lets an AI assistant estimate an express-courier delivery, create and confirm a claim, track the courier and share a recipient link — using the Yango Delivery B2B API in natural language. It is built for corporate delivery accounts and works with Claude, Cursor, Codex and other MCP clients.

- **Estimate before ordering.** `check_price` returns price, distance and ETA without creating a claim.
- **Follow the full claim lifecycle.** Create, confirm, inspect and cancel express deliveries with the relevant status and cancellation terms.
- **Keep the recipient informed.** Get courier position, point ETA, temporary courier phone and public tracking links.
- **One controlled escape hatch.** `raw_request` covers API methods without a dedicated tool and blocks requests to foreign hosts.
- **Safe retries.** The server retries temporary rate-limit errors and only retries reads or idempotent claim creation after transient failures.

[Connect the server](#quick-start) · [Explore use cases](#what-you-can-ask-it-to-do) · [Open technical documentation](#technical-documentation)

## See it work in a minute

> **You:** Estimate delivery for a 2 kg parcel from our office to Amir Timur Avenue 107.
>
> **Assistant:** I checked the route and returned the current price, distance and estimated pickup time. No claim was created.
>
> **You:** Create the delivery for today at 18:00 and confirm it.
>
> **Assistant:** The claim was created and accepted. Courier search has started; I returned the claim id and current status.
> **You:** Where is the courier now? Send me a link for the recipient.
>
> **Assistant:** I returned the current courier position and a public tracking link.

> Pricing, availability, status and cancellation terms always come from the connected delivery account and the API response.

## Quick start

You need Node.js 20+ and a Yango Delivery corporate account with an integration token. The token is stored in the AI client's local configuration, so treat it like a password.

1. [Get a token](#getting-access) in the delivery personal account.
2. Add the server to your AI client. For Codex CLI:

   ```bash
   codex mcp add yango-delivery \
     --env YANGO_DELIVERY_TOKEN=your_token \
     -- npx -y mcp-yango-delivery@latest
   ```

3. Start a new task and begin with a read-only request:

   > Estimate delivery of a 2 kg parcel from our office to Amir Timur Avenue 107.

The browser versions of ChatGPT and Claude cannot attach a local `npx`/stdio server directly. Use a desktop app, CLI or IDE integration listed below.

### Add it to other AI clients

<details open>
<summary><strong>Codex</strong></summary>

```bash
codex mcp add yango-delivery \
  --env YANGO_DELIVERY_TOKEN=your_token \
  -- npx -y mcp-yango-delivery@latest
```

Check the connection with `codex mcp list`.

[Codex MCP documentation](https://developers.openai.com/codex/mcp/)
</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Open **Settings → Developer → Edit Config** and add this entry to `mcpServers`:

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

If **Edit Config** is unavailable, use `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows.

[Claude Desktop MCP documentation](https://claude.com/docs/connectors/building/mcp-apps/getting-started)
</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add \
  --env YANGO_DELIVERY_TOKEN=your_token \
  --transport stdio \
  --scope user \
  yango-delivery \
  -- npx -y mcp-yango-delivery@latest
```

Check it with `claude mcp list`.

[Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)
</details>

<details>
<summary><strong>Cursor</strong></summary>

Add a global server to `~/.cursor/mcp.json` on macOS/Linux or `%USERPROFILE%\.cursor\mcp.json` on Windows:

```json
{
  "mcpServers": {
    "yango-delivery": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-yango-delivery@latest"],
      "env": { "YANGO_DELIVERY_TOKEN": "your_token" }
    }
  }
}
```

[Cursor MCP documentation](https://cursor.com/docs/mcp)
</details>

<details>
<summary><strong>VS Code</strong></summary>

Run **MCP: Open User Configuration** from the Command Palette and add:

```json
{
  "servers": {
    "yango-delivery": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-yango-delivery@latest"],
      "env": { "YANGO_DELIVERY_TOKEN": "${input:yango_delivery_token}" }
    }
  },
  "inputs": [
    {
      "type": "promptString",
      "id": "yango_delivery_token",
      "description": "Yango Delivery integration token",
      "password": true
    }
  ]
}
```

Check it with **MCP: List Servers**.

[VS Code MCP documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
</details>

## What you can ask it to do

### Estimate and order an express delivery

- **Check the price.** `check_price` returns the price, route distance and ETA without creating a claim.
- **Create a claim.** `create_claim` prepares a real delivery request with an idempotent `request_id`.
- **Confirm the claim.** `accept_claim` starts the courier search and can lead to a real charge.
- **Inspect or cancel.** `get_claim` returns status and pricing; `get_cancel_info` must be checked before `cancel_claim`.

### Track and contact the courier

- **Position and ETA.** `get_performer_position` and `get_points_eta` return the current route information.
- **Recipient link.** `get_tracking_links` returns public tracking links.
- **Contact details.** `get_courier_phone` returns a temporary forwarded number and `get_confirmation_code` returns the pickup or delivery code.

### Use other documented API methods

`raw_request` calls a relative path under the delivery API. Use it for tariffs, delivery methods, proof of delivery, claim editing and other endpoints without a dedicated tool.

## When a real delivery is created

The server is not read-only. `check_price`, `get_claim`, `search_claims`, tracking and cancellation-information tools read data. `create_claim` creates a real claim; `accept_claim` confirms it and starts the courier search. Accepted claims can lead to real charges.

Ask the assistant to calculate first, then show the claim details, and confirm only when you are ready to order. The MCP server exposes tool annotations, but the final confirmation behaviour belongs to the AI client.

## Getting access

1. Register as a corporate client and sign the delivery-service contract.
2. Open the **Integration** tab in the delivery personal account and choose **Get token**.
3. Put the token into `YANGO_DELIVERY_TOKEN`.

The token never expires on its own, but it is reset when the account password changes. There is no documented sandbox for the express contour: an accepted claim orders a real courier and may result in a real charge.

## Configuration

| Variable | Required | Default | Description |
|---|---:|---|---|
| `YANGO_DELIVERY_TOKEN` | yes | — | Bearer token from the delivery account. |
| `YANGO_DELIVERY_BASE_URL` | no | `https://b2b.taxi.yandex.net` | API root override. |
| `YANGO_DELIVERY_LANG` | no | `en` | `Accept-Language` header value. |
| `YANGO_DELIVERY_TIMEOUT_MS` | no | `60000` | Per-request timeout in milliseconds. |
| `YANGO_DELIVERY_MAX_RETRIES` | no | `3` | Retries for temporary failures; writes are not replayed unless claim creation is idempotent. |

## Limits and background work

- **No sandbox is documented.** Treat claim creation and acceptance as production operations.
- **Rate limits are not published.** When the API returns a temporary 429 limit, the server waits and retries within the configured limit; it does not invent a quota.
- **No persistent observation.** The server works during a call from the AI client and does not watch claims in the background. If your client supports scheduled tasks, ask it to check a claim status periodically.
- **No automatic rollback.** After a network interruption, a write can have an uncertain result; inspect the claim before repeating an operation.

## Technical documentation

- [All tools](docs/TOOLS.md) — input schemas, responses, statuses and errors.
- [Development](docs/DEVELOPMENT.md) — local setup and project checks.
- [Publishing](docs/PUBLISHING.md) — package release and MCP catalog listing.
- [Yango/Yandex Delivery API reference](https://yandex.com/support/delivery-profile/en/api/express/overview) — upstream method documentation.

## Support

Questions, ideas and contributions — [GitHub Issues](https://github.com/A1-x-Tech/mcp-yango-delivery/issues) or Telegram [@gistrec](http://t.me/gistrec).

---

## Русская версия

### Yango Delivery MCP

Yango Delivery MCP помогает через AI-приложение рассчитать экспресс-доставку, создать и подтвердить заказ, узнать положение курьера и отправить получателю ссылку для отслеживания. Сервер работает с корпоративным B2B API доставки и подходит для аккаунтов за пределами российского контура Яндекс Доставки.

[Подключить сервер](#быстрый-старт) · [Посмотреть сценарии](#что-можно-поручить) · [Открыть техническую документацию](docs/TOOLS.md)

### Быстрый старт

1. Получите интеграционный токен в личном кабинете корпоративного клиента.
2. Подключите сервер к Codex, Claude, Cursor или VS Code по инструкциям выше. Для Codex:

   ```bash
   codex mcp add yango-delivery \
     --env YANGO_DELIVERY_TOKEN=ваш_токен \
     -- npx -y mcp-yango-delivery@latest
   ```

3. Начните с безопасного запроса:

   > Рассчитай доставку посылки 2 кг из офиса на Amir Timur Avenue 107.

### Что можно поручить

- Рассчитать цену и ETA без создания заказа — `check_price`.
- Создать заявку и подтвердить её отдельными командами — `create_claim`, `accept_claim`.
- Узнать статус, положение курьера и ETA по точкам маршрута.
- Получить публичную ссылку для получателя и временный номер курьера.
- Перед отменой проверить, бесплатна ли она, и только потом отменить заявку.

### Границы действий

`check_price` только рассчитывает стоимость. `create_claim` создаёт реальную заявку, а `accept_claim` запускает поиск курьера и может привести к списанию. Песочница для этого контура не описана, поэтому подтверждайте заявку только после проверки деталей.

Сервер не наблюдает за статусом сам по себе. Если AI-приложение поддерживает задания по расписанию, его можно попросить периодически проверять заявку. После сетевого сбоя автоматического отката нет.

### Техническая глубина

Полные схемы инструментов и переменных окружения находятся в [технической документации](docs/TOOLS.md). Исходная документация API — [Yango/Yandex Delivery API](https://yandex.com/support/delivery-profile/en/api/express/overview).

### Поддержка

[GitHub Issues](https://github.com/A1-x-Tech/mcp-yango-delivery/issues) или Telegram [@gistrec](http://t.me/gistrec).
