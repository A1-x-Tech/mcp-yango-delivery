import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { DeliveryClient } from "../dist/client.js";
import { registerClaimsTools } from "../dist/tools/claims.js";
import { registerTrackingTools } from "../dist/tools/tracking.js";
import { registerRawTool } from "../dist/tools/raw.js";

const ALL_TOOLS = [
  "accept_claim",
  "cancel_claim",
  "check_price",
  "create_claim",
  "get_cancel_info",
  "get_claim",
  "get_confirmation_code",
  "get_courier_phone",
  "get_performer_position",
  "get_points_eta",
  "get_tracking_links",
  "raw_request",
  "search_claims",
];

test("dist client rejects foreign-origin paths before sending the Bearer token", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("{}", { status: 200 });
  };

  const client = new DeliveryClient({
    token: "SECRET",
    baseUrl: "https://b2b.taxi.yandex.net",
    lang: "en",
    timeoutMs: 1000,
    maxRetries: 0,
  });

  await assert.rejects(
    () => client.request("POST", "https://example.invalid/steal", { body: {} }),
    /foreign origin/,
  );
  await assert.rejects(
    () => client.request("GET", "https://example.invalid/steal"),
    /foreign origin/,
  );
  assert.equal(called, false);
});

test("dist registers the full tool set", () => {
  const names = [];
  const server = {
    registerTool(name) {
      names.push(name);
    },
  };
  const client = {};

  registerClaimsTools(server, client);
  registerTrackingTools(server, client);
  registerRawTool(server, client);

  assert.deepEqual(names.sort(), ALL_TOOLS);
});

test("dist bin completes an MCP handshake over stdio and lists every tool", async () => {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
    env: {
      ...process.env,
      YANGO_DELIVERY_TOKEN: "smoke-test-token",
      ASKADS_TELEMETRY: "0",
    },
  });
  const client = new Client({ name: "dist-smoke", version: "0.0.0" });
  await client.connect(transport);
  try {
    const res = await client.listTools();
    assert.deepEqual(res.tools.map((t) => t.name).sort(), ALL_TOOLS);
    // The handshake reported the real server identity.
    const server = client.getServerVersion();
    assert.equal(server?.name, "mcp-yango-delivery");
    // ...and the prose the model reads before picking a tool.
    const instructions = client.getInstructions();
    assert.equal(typeof instructions, "string");
    assert.ok(instructions.length > 100, `instructions too short: ${instructions.length} chars`);
    assert.match(instructions, /no sandbox/);
  } finally {
    await client.close();
  }
});
