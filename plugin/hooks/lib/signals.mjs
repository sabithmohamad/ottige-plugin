// Pure helpers for the subtrack hooks: spot likely purchases in Claude Code tool calls.
// No network, no files. Everything here is safe to unit test.
//
// Privacy rules for anything we keep or send:
// - never query strings or fragments,
// - only path segments that look like plain words,
// - only the first few words of a command, never its arguments.

/** Our own MCP tools, installed by the plugin or added by hand with `claude mcp add`. */
const OWN_TOOL = /^mcp__(?:plugin_subtrack_)?subtrack__(\w+)$/;
const LOGGING_TOOLS = new Set(["add_subscription", "update_subscription", "cancel_subscription"]);

/** @param {string} toolName */
export function ownTool(toolName) {
  const match = OWN_TOOL.exec(toolName ?? "");
  if (!match) return null;
  return { name: match[1], logs: LOGGING_TOOLS.has(match[1]) };
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------
const KNOWN_VENDORS = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  github: "GitHub",
  gitlab: "GitLab",
  digitalocean: "DigitalOcean",
  amazonaws: "AWS",
  aws: "AWS",
  mongodb: "MongoDB",
  planetscale: "PlanetScale",
  sendgrid: "SendGrid",
  elevenlabs: "ElevenLabs",
  huggingface: "Hugging Face",
  fly: "Fly.io",
  posthog: "PostHog",
  hubspot: "HubSpot",
  youtube: "YouTube",
};

/** Hosts that take payment for other companies. The page alone doesn't say who is paid. */
const PAYMENT_PROCESSORS = /(^|\.)(stripe\.com|paddle\.com|lemonsqueezy\.com|chargebee\.com|paypal\.com|gumroad\.com|fastspring\.com|recurly\.com)$/;

const NOISE_SUBDOMAINS = new Set([
  "www", "checkout", "billing", "dashboard", "app", "console", "pay", "payments", "account", "accounts",
  "portal", "my", "secure", "buy", "store", "shop", "platform", "cloud", "admin", "manage",
]);
const TWO_PART_SUFFIXES = new Set(["co.uk", "org.uk", "com.au", "co.jp", "co.in", "com.br", "co.nz", "co.za"]);

/** True for hosts we never treat as a vendor: local dev servers, IP addresses, test domains. */
export function isLocalHost(host) {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".test") ||
    h.endsWith(".local") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(h) ||
    h.startsWith("[")
  );
}

function titleCase(label) {
  return label
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Guesses who is paid from a web host: "billing.vercel.com" → "Vercel".
 * Returns null for payment processors and local hosts, where the host doesn't name the vendor.
 * @param {string} host
 */
export function vendorFromHost(host) {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (!h || isLocalHost(h) || PAYMENT_PROCESSORS.test(h)) return null;
  const parts = h.split(".").filter((p) => !NOISE_SUBDOMAINS.has(p));
  if (parts.length < 2) return null;
  const suffixLength = TWO_PART_SUFFIXES.has(parts.slice(-2).join(".")) ? 2 : 1;
  const label = parts[parts.length - 1 - suffixLength];
  if (!label) return null;
  return KNOWN_VENDORS[label] ?? titleCase(label);
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------
const PURCHASE_PATH = /(^|[/_-])(checkout|billing|subscribe|subscription|subscriptions|upgrade|payment|payments|purchase|pay|order-confirmation|plans?\/(confirm|success)|success)([/_-]|$)/i;
const PURCHASE_HOST = /^(checkout|billing|pay|payments|buy)\./i;

// Docs, help and blog pages explain billing; reading them is not buying.
// Matches hosts such as docs.expo.dev or developers.cloudflare.com, and paths such as
// /docs/billing or /en-us/help/billing.
const DOCS_HOST = /^(docs?|developers|help|support|learn|kb|community|forum|blog|guides?|academy)\./i;
const DOCS_PATH =
  /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(docs?|documentation|developers|help|support|learn|guides?|kb|knowledge-base|blog|articles?|reference|api-reference|tutorials?|faq|changelog)(\/|$)/i;

/** True for documentation, help and blog pages, which never count as a purchase. */
export function isDocsPage(page) {
  return DOCS_HOST.test(page.host) || DOCS_PATH.test(page.path);
}

/**
 * Host and path of a URL, without query string or fragment, with ID-like path
 * segments replaced by "…".
 * @param {string} raw
 */
export function safeUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .slice(0, 4)
    .map((s) => (/^[a-z][a-z0-9-]{0,30}$/i.test(s) ? s : "…"));
  return { host: url.hostname, path: "/" + segments.join("/"), text: `${url.hostname}/${segments.join("/")}`.replace(/\/$/, "") };
}

/** @param {unknown} input */
function urlsIn(input) {
  if (!input || typeof input !== "object") return [];
  const found = [];
  for (const key of ["url", "uri", "href"]) {
    const value = /** @type {Record<string, unknown>} */ (input)[key];
    if (typeof value === "string") found.push(value);
  }
  return found;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
const CLI_VENDORS = {
  vercel: "Vercel",
  heroku: "Heroku",
  gcloud: "Google Cloud",
  aws: "AWS",
  az: "Azure",
  fly: "Fly.io",
  flyctl: "Fly.io",
  railway: "Railway",
  netlify: "Netlify",
  supabase: "Supabase",
  wrangler: "Cloudflare",
  doctl: "DigitalOcean",
  neonctl: "Neon",
  pscale: "PlanetScale",
  render: "Render",
  firebase: "Firebase",
  gh: "GitHub",
};

const PURCHASE_COMMAND = [
  /\bdomains?\s+(buy|register|purchase)\b/i,
  /\bregister-domain\b/i,
  /\bregistrations\s+register\b/i,
  /\baddons:(create|add)\b/i,
  /\b(billing|plan|subscription)s?\s+(upgrade|subscribe|change|update|set|create)\b/i,
  /\bupgrade\s+(--)?(plan|tier)\b/i,
  /--(plan|tier)[=\s]+["']?(pro|plus|team|teams|business|premium|enterprise|scale|growth|starter|hobby|paid)\b/i,
];

const COMMAND_PREFIXES = /^(?:(?:sudo|npx|bunx|pnpx|time)\s+|pnpm\s+dlx\s+|yarn\s+dlx\s+|[A-Z_][A-Z0-9_]*=\S*\s+)+/;

/**
 * Finds a paid action in a shell command, such as `vercel domains buy example.com`.
 * Only known cloud CLIs count, so `npm upgrade` or `brew upgrade` never match.
 * @param {string} command
 */
export function commandSignal(command) {
  for (const part of command.split(/&&|\|\||[;|\n]/)) {
    const segment = part.trim().replace(COMMAND_PREFIXES, "");
    const words = segment.split(/\s+/);
    const cli = words[0]?.replace(/^.*[\\/]/, "").replace(/\.(exe|cmd)$/i, "").toLowerCase();
    const vendor = cli ? CLI_VENDORS[/** @type {keyof typeof CLI_VENDORS} */ (cli)] : undefined;
    if (!vendor) continue;
    if (!PURCHASE_COMMAND.some((pattern) => pattern.test(segment))) continue;
    const safeWords = [];
    for (const word of words.slice(0, 4)) {
      if (!/^[a-z][a-z0-9:_-]{0,40}$/i.test(word)) break;
      safeWords.push(word);
    }
    return { vendor, signal: "purchase command", detail: safeWords.join(" ") };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Page text
// ---------------------------------------------------------------------------
const SUCCESS_TEXT = [
  /payment (was )?(successful|succeeded|confirmed|complete)/i,
  /thank(s| you) for (your )?(purchase|order|subscribing|upgrading|subscription)/i,
  /subscription (is )?(now )?(active|confirmed|started)/i,
  /you('re| are) (now )?(on|subscribed to) the [\w .+-]{1,40} plan/i,
  /(free )?trial (has )?(started|begun|is now active)/i,
  /order (is )?confirmed/i,
  /upgrade (was )?(successful|complete)/i,
];

/** Tools that read web pages. Shell output and file reads are ignored: they can quote anything. */
const WEB_TOOL = /^(WebFetch$|mcp__.*(browser|chrome|playwright|puppeteer))/i;

function responseText(response) {
  if (response == null) return "";
  const text = typeof response === "string" ? response : JSON.stringify(response);
  return text.slice(0, 50_000);
}

// ---------------------------------------------------------------------------
// MCP tools from other servers
// ---------------------------------------------------------------------------
const PURCHASE_TOOL = /(^|_)(purchase|buy|subscribe|upgrade)(_|$)/i;
const GENERIC_SERVERS = /browser|chrome|playwright|puppeteer|computer|fetch|plugin_/i;

/**
 * Looks at one PostToolUse event and returns a likely purchase, or null.
 * `vendor` is null when we can't tell who was paid; the Stop hook still asks the agent.
 * @param {{ tool_name?: string, tool_input?: unknown, tool_response?: unknown }} event
 * @returns {{ vendor: string | null, signal: string, detail: string } | null}
 */
export function detectSignal(event) {
  const toolName = event.tool_name ?? "";
  if (ownTool(toolName)) return null;
  const input = /** @type {Record<string, unknown>} */ (event.tool_input ?? {});

  if (toolName === "Bash" || toolName === "PowerShell") {
    return typeof input.command === "string" ? commandSignal(input.command) : null;
  }

  const visited = urlsIn(input)
    .map(safeUrl)
    .filter((u) => u !== null && !isLocalHost(u.host));
  const pages = visited.filter((u) => !isDocsPage(u));
  // Only docs pages: someone is reading about billing, not paying.
  if (visited.length && !pages.length) return null;

  for (const page of pages) {
    if (PURCHASE_HOST.test(page.host) || PURCHASE_PATH.test(page.path)) {
      const signal = /billing|subscription/i.test(page.text) ? "billing page" : "checkout page";
      return { vendor: vendorFromHost(page.host), signal, detail: page.text };
    }
  }

  if (WEB_TOOL.test(toolName)) {
    const text = responseText(event.tool_response);
    const phrase = SUCCESS_TEXT.map((pattern) => pattern.exec(text)?.[0]).find(Boolean);
    if (phrase) {
      const page = pages[0];
      return {
        vendor: page ? vendorFromHost(page.host) : null,
        signal: "purchase confirmation",
        detail: [page?.text, `"${phrase.slice(0, 80)}"`].filter(Boolean).join(" "),
      };
    }
  }

  const mcp = /^mcp__(.+?)__(.+)$/.exec(toolName);
  if (mcp && PURCHASE_TOOL.test(mcp[2])) {
    const vendor = GENERIC_SERVERS.test(mcp[1]) ? null : titleCase(mcp[1].replace(/_/g, "-"));
    return { vendor, signal: "purchase tool", detail: toolName.slice(0, 120) };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Session state, as an append-only list of events
// ---------------------------------------------------------------------------

/**
 * @typedef {{ t: "signal", vendor: string | null, signal: string, detail: string }
 *   | { t: "logged", tool: string }
 *   | { t: "nudged" }} StateEvent
 */

/**
 * Signals the agent has neither logged nor been reminded about yet.
 * A log or a reminder clears everything before it, so the Stop hook asks at most once per batch.
 * @param {StateEvent[]} events
 */
export function pendingSignals(events) {
  let pending = [];
  for (const event of events) {
    if (event.t === "signal") pending.push(event);
    else pending = [];
  }
  return pending;
}

/** True if this vendor was already flagged in the session, so we don't repeat the same nudge. */
export function seenVendor(events, vendor) {
  return events.some((e) => e.t === "signal" && e.vendor === vendor);
}

/** @param {{ vendor: string | null, signal: string, detail: string }} s */
export function describeSignal(s) {
  return `${s.vendor ?? "unknown vendor"} (${s.signal}${s.detail ? `: ${s.detail}` : ""})`;
}

/** @param {StateEvent[]} pending */
export function stopReason(pending) {
  const seen = new Set();
  const lines = [];
  for (const s of pending) {
    if (s.t !== "signal") continue;
    // One line per vendor; unknown vendors are told apart by where they were seen.
    const key = s.vendor ?? s.detail;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`- ${describeSignal(s)}`);
  }
  return [
    "Before you finish: this session showed signs of a paid sign-up, trial, upgrade or purchase:",
    ...lines.slice(0, 5),
    "If anything was bought, started or upgraded, call add_subscription for each one now (it never makes duplicates).",
    "If nothing was bought, say so in one line and stop.",
  ].join("\n");
}

/** Keeps session ids safe to use in a file name. */
export function stateFileName(sessionId) {
  return `${String(sessionId || "unknown").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100)}.jsonl`;
}
