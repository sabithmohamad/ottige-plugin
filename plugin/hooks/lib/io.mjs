// File and network helpers shared by the hook scripts. Every failure is swallowed:
// a tracking hook must never break or slow down the agent's real work.
import { appendFileSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stateFileName } from "./signals.mjs";

export const config = {
  apiKey: process.env.OTTIGE_API_KEY ?? "",
  baseUrl: (process.env.OTTIGE_URL || "https://ottige.com").replace(/\/+$/, ""),
  stateDir: process.env.OTTIGE_STATE_DIR || join(tmpdir(), "ottige-hooks"),
};

export async function readStdinJson() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function statePath(sessionId) {
  return join(config.stateDir, stateFileName(sessionId));
}

/** @returns {import("./signals.mjs").StateEvent[]} */
export function readState(sessionId) {
  try {
    return readFileSync(statePath(sessionId), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/** Appends one event. Appends are small single writes, so parallel hooks don't clobber each other. */
export function appendState(sessionId, event) {
  try {
    mkdirSync(config.stateDir, { recursive: true });
    appendFileSync(statePath(sessionId), JSON.stringify(event) + "\n");
  } catch {
    // ignore
  }
}

/** Deletes state files older than a week. */
export function pruneState() {
  try {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const name of readdirSync(config.stateDir)) {
      const file = join(config.stateDir, name);
      if (name.endsWith(".jsonl") && statSync(file).mtimeMs < cutoff) unlinkSync(file);
    }
  } catch {
    // ignore
  }
}

/** Sends a draft to the tracker. Returns the outcome, or null if the tracker can't be reached. */
export async function postDraft(draft) {
  try {
    const response = await fetch(`${config.baseUrl}/api/v1/drafts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify(draft),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return typeof body?.outcome === "string" ? body.outcome : null;
  } catch {
    return null;
  }
}

export function print(json) {
  process.stdout.write(JSON.stringify(json));
}
