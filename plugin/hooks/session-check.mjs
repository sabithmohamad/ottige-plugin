#!/usr/bin/env node
// Stop hook: layer 2 of auto-logging.
// If the session showed a likely purchase that the agent never logged, it keeps the agent
// going once with a reminder. It never asks twice for the same purchases.
import { pendingSignals, stopReason } from "./lib/signals.mjs";
import { appendState, config, print, pruneState, readState, readStdinJson } from "./lib/io.mjs";

const event = await readStdinJson();
if (!config.apiKey || event.stop_hook_active) process.exit(0);

const pending = pendingSignals(readState(event.session_id));
pruneState();
if (!pending.length) process.exit(0);

appendState(event.session_id, { t: "nudged" });
print({ decision: "block", reason: stopReason(pending) });
