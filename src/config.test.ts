import { test } from "node:test";
import assert from "node:assert/strict";

import { ConfigError, loadConfig } from "./config.js";

/** Every env var the config reads — cleared by default in each test. */
const ALL_VARS: Record<string, string | undefined> = {
  YANGO_DELIVERY_TOKEN: undefined,
  YANGO_DELIVERY_BASE_URL: undefined,
  YANGO_DELIVERY_LANG: undefined,
  YANGO_DELIVERY_TIMEOUT_MS: undefined,
  YANGO_DELIVERY_MAX_RETRIES: undefined,
};

function withEnv(vars: Record<string, string | undefined>, run: () => void): void {
  const merged = { ...ALL_VARS, ...vars };
  const saved = new Map(Object.keys(merged).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    run();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("a missing token reports missing_token, via ConfigError (not exit)", () => {
  let caught: unknown;
  withEnv({}, () => {
    try {
      loadConfig();
    } catch (err) {
      caught = err;
    }
  });
  assert.ok(caught instanceof ConfigError, "config problems must throw ConfigError, not exit");
  // The reason code is the vocabulary the telemetry dashboard groups by —
  // renaming it silently splits a bar in two, so it is pinned here.
  assert.equal(caught.reason, "missing_token");
});

test("a token alone applies every default", () => {
  withEnv({ YANGO_DELIVERY_TOKEN: "tok" }, () => {
    const config = loadConfig();
    assert.equal(config.token, "tok");
    assert.equal(config.baseUrl, "https://b2b.taxi.yandex.net");
    assert.equal(config.lang, "en");
    assert.equal(config.timeoutMs, 60_000);
    assert.equal(config.maxRetries, 3);
  });
});

test("base URL, language, timeout and retries are overridable", () => {
  withEnv(
    {
      YANGO_DELIVERY_TOKEN: "tok",
      YANGO_DELIVERY_BASE_URL: "https://proxy.example.net",
      YANGO_DELIVERY_LANG: "fr",
      YANGO_DELIVERY_TIMEOUT_MS: "1500",
      YANGO_DELIVERY_MAX_RETRIES: "0",
    },
    () => {
      const config = loadConfig();
      assert.equal(config.baseUrl, "https://proxy.example.net");
      assert.equal(config.lang, "fr");
      assert.equal(config.timeoutMs, 1500);
      assert.equal(config.maxRetries, 0);
    },
  );
});

test("garbage numbers fall back to the defaults", () => {
  withEnv(
    {
      YANGO_DELIVERY_TOKEN: "tok",
      YANGO_DELIVERY_TIMEOUT_MS: "soon",
      YANGO_DELIVERY_MAX_RETRIES: "-5",
    },
    () => {
      const config = loadConfig();
      assert.equal(config.timeoutMs, 60_000);
      assert.equal(config.maxRetries, 3);
    },
  );
});
