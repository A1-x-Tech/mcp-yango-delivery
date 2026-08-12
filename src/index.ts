#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DeliveryClient } from "./client.js";
import { ConfigError, loadConfig } from "./config.js";
import { instrumentToolCalls, Telemetry } from "./telemetry.js";
import type { DeliveryConfig } from "./types.js";
import { registerClaimsTools } from "./tools/claims.js";
import { registerTrackingTools } from "./tools/tracking.js";
import { registerRawTool } from "./tools/raw.js";

/**
 * Prose handed to the calling model in the `initialize` result, before it sees a
 * single tool. It carries what the per-tool descriptions cannot: which contour of
 * the API this is (and which endpoints therefore do not exist), that every call
 * hits production with no sandbox, and the failure modes that read as something
 * else (a reset token, an unretried write, a claim that is simply not active yet).
 */
const INSTRUCTIONS =
  "Yango Delivery is the international brand of Yandex Delivery, and this server speaks only the " +
  "express (claims) contour of its B2B API: same-day, on-demand courier runs. The Russia-only " +
  "offers/calculate method and the platform contour are absent: no pickup-point or " +
  "next-day-delivery tools here, and every call is scoped to the one cabinet behind the token. Rate " +
  "limits are unpublished: 429 is retried with backoff automatically, but a timeout or 5xx on " +
  "accept/cancel is never replayed — re-read with get_claim to see whether the write landed rather " +
  "than repeating it. The token never expires, so 401/403 means a wrong token or one reset by a " +
  "cabinet password change, not a bad request; a 409 from the tracking tools is about the claim's " +
  "state (not active, no courier or links yet), and a wrong claim_id gives 404. Everything hits " +
  "production and there is no sandbox: an accepted claim dispatches a real courier and is billed, " +
  "and cancelling one can be paid, so confirm with the user before accept_claim, cancel_claim, " +
  "create_claim with auto_accept=true, or a state-changing raw_request.";

/** Reads the package version so the server reports its real version to MCP clients. */
function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Loads the config, reporting the drop-off if it is missing. An unconfigured
 * server dies before the MCP handshake, so this ping is the only trace such an
 * install ever leaves — and it has to be awaited, or process.exit() below would
 * kill the request in flight.
 */
async function loadConfigOrExit(telemetry: Telemetry): Promise<DeliveryConfig> {
  try {
    return loadConfig();
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    console.error(`Error: ${err.message}`);
    await telemetry.sendBlocking("startup_failed", { reason: err.reason });
    process.exit(1);
  }
}

async function main(): Promise<void> {
  // Anonymous usage pings (ids/names/versions only, never data or arguments);
  // opt out with ASKADS_TELEMETRY=0. Built before the config so a missing token
  // can be reported; wired to the server before tools register.
  const telemetry = new Telemetry(readVersion());
  const config = await loadConfigOrExit(telemetry);
  const client = new DeliveryClient(config);

  const server = new McpServer(
    {
      name: "mcp-yango-delivery",
      version: readVersion(),
    },
    // Surfaces in the initialize result, so the model reads it before its first call.
    { instructions: INSTRUCTIONS },
  );

  instrumentToolCalls(server, telemetry);
  server.server.oninitialized = () => {
    telemetry.setClientInfo(server.server.getClientVersion());
    telemetry.send("server_start");
  };

  registerClaimsTools(server, client);
  registerTrackingTools(server, client);
  registerRawTool(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-yango-delivery running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting mcp-yango-delivery:", err);
  process.exit(1);
});
