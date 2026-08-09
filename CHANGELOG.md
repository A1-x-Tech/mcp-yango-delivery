# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] — 2026-08-09

First full release (version 0.0.1 was a stub reserving the npm name).

### Added

- 13 MCP tools for the Yango Delivery claims B2B API (`b2b.taxi.yandex.net`,
  the express contour — the only one documented for countries outside Russia):
  - **Claim lifecycle:** `check_price`, `create_claim` (idempotent `request_id`),
    `accept_claim`, `get_claim`, `get_cancel_info`, `cancel_claim`, `search_claims`.
  - **Tracking & contact:** `get_performer_position`, `get_tracking_links`,
    `get_points_eta`, `get_courier_phone`, `get_confirmation_code`.
  - `raw_request` — a direct call to any method of the claims API.
- HTTP client: Bearer auth (`YANGO_DELIVERY_TOKEN`), `Accept-Language`
  (`YANGO_DELIVERY_LANG`, default `en`), AbortController timeout, retries with
  backoff (429 always; 5xx/network only for idempotent calls), an SSRF guard on
  `raw_request` paths, decoding of both API error shapes (`{code, message}` and
  `error_messages[]` inside 200 responses).
- Annotations on every tool (`READ_ONLY`/`WRITE`/`DESTRUCTIVE`) — the server is
  a writing one; cancellation is marked destructive.
- Anonymous usage telemetry (opt-out `ASKADS_TELEMETRY=0`).
- Tests: offline unit suite + 3 smoke tests of the built `dist/` (including a
  real MCP handshake over stdio); CI on Node 20/22/24.
