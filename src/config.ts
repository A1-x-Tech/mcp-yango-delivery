import type { DeliveryConfig } from "./types.js";

/** Default API host — the EN docs use the same host for Russia and other countries. */
const DEFAULT_BASE = "https://b2b.taxi.yandex.net";

/**
 * A missing or malformed environment variable. Thrown instead of exiting on the
 * spot so index.ts can report the drop-off before the process dies; `reason` is
 * the machine-readable code that ships with that ping (never a variable's value).
 */
export class ConfigError extends Error {
  readonly reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = "ConfigError";
    this.reason = reason;
  }
}

function die(message: string, reason: string): never {
  throw new ConfigError(message, reason);
}

/**
 * Builds the client config from environment variables, throwing ConfigError if
 * a required one is missing.
 *
 *   YANGO_DELIVERY_TOKEN        Bearer token (required)
 *   YANGO_DELIVERY_BASE_URL     API root override
 *   YANGO_DELIVERY_LANG         Accept-Language (default en)
 *   YANGO_DELIVERY_TIMEOUT_MS   per-request timeout (default 60000)
 *   YANGO_DELIVERY_MAX_RETRIES  transient-error retries (default 3)
 */
export function loadConfig(): DeliveryConfig {
  const token = process.env.YANGO_DELIVERY_TOKEN;
  if (!token) {
    die(
      'YANGO_DELIVERY_TOKEN is required (OAuth token from the delivery cabinet, Integration tab -> "Get token").',
      "missing_token",
    );
  }

  const timeoutMs = Number(process.env.YANGO_DELIVERY_TIMEOUT_MS);
  const maxRetries = Number(process.env.YANGO_DELIVERY_MAX_RETRIES);

  return {
    token,
    baseUrl: process.env.YANGO_DELIVERY_BASE_URL || DEFAULT_BASE,
    lang: process.env.YANGO_DELIVERY_LANG || "en",
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60_000,
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 3,
  };
}
