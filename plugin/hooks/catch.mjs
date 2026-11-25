#!/usr/bin/env node
// PostToolUse hook: layer 1 of auto-logging.
// When a tool call looks like a purchase, it saves a draft to the tracker and reminds the
// agent to log it properly. When the agent logs, it notes that for the Stop hook.
import { describeSignal, detectSignal, ownTool, seenVendor } from "./lib/signals.mjs";
import { appendState, config, postDraft, print, readState, readStdinJson } from "./lib/io.mjs";
import { projectName } from "./lib/project.mjs";

const event = await readStdinJson();
if (!config.apiKey) process.exit(0); // Not set up: stay silent.

const sessionId = event.session_id;
const own = ownTool(event.tool_name);
if (own) {
  if (own.logs) appendState(sessionId, { t: "logged", tool: own.name });
  process.exit(0);
}

const signal = detectSignal(event);
if (!signal) process.exit(0);

const earlier = readState(sessionId);
const repeat = signal.vendor !== null && seenVendor(earlier, signal.vendor);
appendState(sessionId, { t: "signal", ...signal });
if (repeat) process.exit(0);

// The repository's name, also from a subfolder or a git worktree.
const project = event.cwd ? projectName(event.cwd) : undefined;
const outcome = signal.vendor ? await postDraft({ ...signal, project }) : null;

const saved =
  outcome === "created"
    ? " A draft was saved to the tracker for review."
    : outcome === "already_tracked"
      ? " The tracker already has this vendor."
      : outcome === "recently_dismissed"
        ? " Someone recently marked a draft for this vendor as not a purchase."
        : "";
print({
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext:
      `subtrack: this looks like a paid sign-up or purchase: ${describeSignal(signal)}.${saved} ` +
      "If something was bought, started as a trial or upgraded, call add_subscription with the vendor, plan, price and project once it is done.",
  },
});
