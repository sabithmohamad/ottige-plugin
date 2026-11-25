// Which packages, environment variable names and config files point at a paid service.
// Pure data and matchers: no files, no network. Used by scan.mjs.
//
// `usage: true` marks pay-as-you-go services, so the draft can say billing_cycle "usage".
// `maybe: true` marks evidence that is often free or self-hosted, so the agent checks it.

/**
 * @typedef {{
 *   name: string,
 *   usage?: boolean,
 *   npm?: string[],
 *   py?: string[],
 *   env?: string[],
 *   maybe?: boolean,
 * }} Vendor
 * npm and py entries ending in "/" or "-" match every package with that prefix.
 * env entries are variable name prefixes, such as "OPENAI_".
 */

/** @type {Vendor[]} */
export const VENDORS = [
  // AI model APIs
  { name: "OpenAI", usage: true, npm: ["openai", "@ai-sdk/openai", "@langchain/openai"], py: ["openai", "langchain-openai"], env: ["OPENAI_"] },
  {
    name: "Anthropic",
    usage: true,
    npm: ["@anthropic-ai/", "@ai-sdk/anthropic", "@langchain/anthropic"],
    py: ["anthropic", "claude-agent-sdk", "langchain-anthropic"],
    env: ["ANTHROPIC_"],
  },
  {
    name: "Google Gemini API",
    usage: true,
    npm: ["@google/generative-ai", "@google/genai", "@ai-sdk/google"],
    py: ["google-generativeai", "google-genai"],
    env: ["GEMINI_", "GOOGLE_GENERATIVE_AI_", "GOOGLE_AI_"],
  },
  { name: "Mistral", usage: true, npm: ["@mistralai/", "@ai-sdk/mistral"], py: ["mistralai"], env: ["MISTRAL_"] },
  { name: "Groq", usage: true, npm: ["groq-sdk", "@ai-sdk/groq"], py: ["groq"], env: ["GROQ_"] },
  { name: "xAI", usage: true, npm: ["@ai-sdk/xai"], py: ["xai-sdk"], env: ["XAI_", "GROK_"] },
  { name: "DeepSeek", usage: true, npm: ["@ai-sdk/deepseek"], env: ["DEEPSEEK_"] },
  { name: "Cohere", usage: true, npm: ["cohere-ai", "@ai-sdk/cohere"], py: ["cohere"], env: ["COHERE_"] },
  { name: "OpenRouter", usage: true, npm: ["@openrouter/"], py: ["openrouter"], env: ["OPENROUTER_"] },
  { name: "Replicate", usage: true, npm: ["replicate"], py: ["replicate"], env: ["REPLICATE_"] },
  { name: "Together AI", usage: true, npm: ["together-ai", "@ai-sdk/togetherai"], py: ["together"], env: ["TOGETHER_"] },
  { name: "fal", usage: true, npm: ["@fal-ai/"], py: ["fal-client"], env: ["FAL_KEY", "FAL_API_"] },
  { name: "ElevenLabs", usage: true, npm: ["elevenlabs", "@elevenlabs/"], py: ["elevenlabs"], env: ["ELEVENLABS_", "ELEVEN_LABS_"] },
  { name: "Deepgram", usage: true, npm: ["@deepgram/"], py: ["deepgram-sdk"], env: ["DEEPGRAM_"] },
  { name: "AssemblyAI", usage: true, npm: ["assemblyai"], py: ["assemblyai"], env: ["ASSEMBLYAI_"] },
  { name: "Perplexity", usage: true, npm: ["@ai-sdk/perplexity"], env: ["PERPLEXITY_"] },
  { name: "Voyage AI", usage: true, npm: ["voyageai"], py: ["voyageai"], env: ["VOYAGE_"] },

  // AI tooling, agents and scraping
  { name: "LangSmith", npm: ["langsmith"], py: ["langsmith"], env: ["LANGSMITH_", "LANGCHAIN_API_KEY"] },
  { name: "Langfuse", npm: ["langfuse", "@langfuse/"], py: ["langfuse"], env: ["LANGFUSE_"] },
  { name: "Pinecone", usage: true, npm: ["@pinecone-database/"], py: ["pinecone", "pinecone-client"], env: ["PINECONE_"] },
  { name: "E2B", usage: true, npm: ["e2b", "@e2b/"], py: ["e2b", "e2b-code-interpreter"], env: ["E2B_"] },
  { name: "Modal", usage: true, py: ["modal"], env: ["MODAL_TOKEN_"] },
  { name: "Browserbase", usage: true, npm: ["@browserbasehq/"], py: ["browserbase"], env: ["BROWSERBASE_"] },
  { name: "Apify", usage: true, npm: ["apify", "apify-client"], py: ["apify", "apify-client"], env: ["APIFY_"] },
  { name: "Firecrawl", usage: true, npm: ["@mendable/firecrawl-js", "firecrawl"], py: ["firecrawl-py", "firecrawl"], env: ["FIRECRAWL_"] },
  { name: "CapSolver", usage: true, py: ["capsolver"], env: ["CAPSOLVER_"] },
  { name: "Decodo", usage: true, env: ["DECODO_", "SMARTPROXY_"] },
  { name: "Bright Data", usage: true, env: ["BRIGHTDATA_", "BRIGHT_DATA_"] },
  { name: "ScrapingBee", usage: true, py: ["scrapingbee"], env: ["SCRAPINGBEE_"] },

  // Hosting, databases and storage
  { name: "Vercel", npm: ["@vercel/blob", "@vercel/kv", "@vercel/postgres", "@vercel/edge-config"], env: ["VERCEL_TOKEN", "BLOB_READ_WRITE_TOKEN"] },
  { name: "Supabase", npm: ["@supabase/"], py: ["supabase"], env: ["SUPABASE_", "NEXT_PUBLIC_SUPABASE_", "EXPO_PUBLIC_SUPABASE_", "VITE_SUPABASE_"] },
  { name: "Neon", npm: ["@neondatabase/"], env: ["NEON_"] },
  { name: "PlanetScale", npm: ["@planetscale/"], env: ["PLANETSCALE_"] },
  { name: "Turso", npm: ["@libsql/client"], py: ["libsql-client"], env: ["TURSO_"] },
  { name: "Upstash", usage: true, npm: ["@upstash/"], py: ["upstash-redis", "upstash-vector"], env: ["UPSTASH_"] },
  { name: "Convex", npm: ["convex"], env: ["CONVEX_"] },
  { name: "Firebase", npm: ["firebase", "firebase-admin", "@react-native-firebase/"], py: ["firebase-admin"], env: ["FIREBASE_"] },
  { name: "MongoDB Atlas", maybe: true, npm: ["mongodb", "mongoose"], py: ["pymongo", "motor"], env: ["MONGODB_", "MONGO_URI", "MONGO_URL"] },
  { name: "AWS", usage: true, npm: ["@aws-sdk/", "aws-sdk"], py: ["boto3", "botocore", "aioboto3"], env: ["AWS_"] },
  { name: "Google Cloud", usage: true, npm: ["@google-cloud/"], py: ["google-cloud-"], env: ["GCP_", "GOOGLE_CLOUD_", "GCLOUD_"] },
  { name: "Microsoft Azure", usage: true, npm: ["@azure/"], py: ["azure-"], env: ["AZURE_"] },
  { name: "Cloudflare", npm: ["wrangler", "@cloudflare/"], py: ["cloudflare"], env: ["CLOUDFLARE_", "CF_API_", "CF_ACCOUNT_"] },
  { name: "Cloudflare R2", usage: true, env: ["R2_"] },
  { name: "Hetzner", env: ["HCLOUD_", "HETZNER_"] },
  { name: "DigitalOcean", env: ["DIGITALOCEAN_", "DO_SPACES_"] },
  { name: "Cloudinary", npm: ["cloudinary", "next-cloudinary"], py: ["cloudinary"], env: ["CLOUDINARY_"] },
  { name: "UploadThing", npm: ["uploadthing", "@uploadthing/"], env: ["UPLOADTHING_"] },
  { name: "Mux", usage: true, npm: ["@mux/"], py: ["mux-python"], env: ["MUX_"] },

  // Payments
  { name: "Stripe", usage: true, npm: ["stripe", "@stripe/"], py: ["stripe"], env: ["STRIPE_", "NEXT_PUBLIC_STRIPE_"] },
  { name: "Lemon Squeezy", npm: ["@lemonsqueezy/"], env: ["LEMONSQUEEZY_", "LEMON_SQUEEZY_"] },
  { name: "Paddle", npm: ["@paddle/"], py: ["paddle-python-sdk"], env: ["PADDLE_"] },
  { name: "RevenueCat", npm: ["react-native-purchases", "@revenuecat/"], env: ["REVENUECAT_", "EXPO_PUBLIC_REVENUECAT_"] },

  // Email, messaging and notifications
  { name: "Resend", npm: ["resend"], py: ["resend"], env: ["RESEND_"] },
  { name: "SendGrid", npm: ["@sendgrid/"], py: ["sendgrid"], env: ["SENDGRID_"] },
  { name: "Postmark", npm: ["postmark"], py: ["postmarker"], env: ["POSTMARK_"] },
  { name: "Mailgun", npm: ["mailgun.js", "mailgun-js"], env: ["MAILGUN_"] },
  { name: "Twilio", usage: true, npm: ["twilio"], py: ["twilio"], env: ["TWILIO_"] },
  { name: "OneSignal", npm: ["react-native-onesignal", "@onesignal/", "onesignal-node"], env: ["ONESIGNAL_"] },
  { name: "Pusher", npm: ["pusher", "pusher-js"], py: ["pusher"], env: ["PUSHER_"] },
  { name: "Ably", npm: ["ably"], py: ["ably"], env: ["ABLY_"] },
  { name: "Liveblocks", npm: ["@liveblocks/"], env: ["LIVEBLOCKS_"] },

  // Sign-in
  { name: "Clerk", npm: ["@clerk/"], py: ["clerk-backend-api"], env: ["CLERK_", "NEXT_PUBLIC_CLERK_"] },
  { name: "Auth0", npm: ["@auth0/", "auth0"], py: ["auth0-python"], env: ["AUTH0_"] },
  { name: "WorkOS", npm: ["@workos-inc/"], py: ["workos"], env: ["WORKOS_"] },
  { name: "Kinde", npm: ["@kinde-oss/"], env: ["KINDE_"] },

  // Monitoring, analytics and flags
  { name: "Sentry", npm: ["@sentry/"], py: ["sentry-sdk"], env: ["SENTRY_", "NEXT_PUBLIC_SENTRY_", "EXPO_PUBLIC_SENTRY_"] },
  { name: "PostHog", npm: ["posthog-js", "posthog-node", "posthog-react-native"], py: ["posthog"], env: ["POSTHOG_", "NEXT_PUBLIC_POSTHOG_"] },
  { name: "Datadog", npm: ["dd-trace", "@datadog/"], py: ["ddtrace", "datadog"], env: ["DATADOG_", "DD_API_KEY"] },
  { name: "Better Stack", npm: ["@logtail/"], py: ["logtail-python"], env: ["LOGTAIL_", "BETTERSTACK_", "BETTER_STACK_"] },
  { name: "Axiom", npm: ["@axiomhq/", "next-axiom"], py: ["axiom-py"], env: ["AXIOM_"] },
  { name: "Mixpanel", npm: ["mixpanel", "mixpanel-browser"], py: ["mixpanel"], env: ["MIXPANEL_"] },
  { name: "Amplitude", npm: ["@amplitude/"], py: ["amplitude-analytics"], env: ["AMPLITUDE_"] },
  { name: "LaunchDarkly", npm: ["launchdarkly-", "@launchdarkly/"], py: ["launchdarkly-server-sdk"], env: ["LAUNCHDARKLY_"] },
  { name: "Statsig", npm: ["@statsig/", "statsig-node"], py: ["statsig"], env: ["STATSIG_"] },

  // Search, maps and background jobs
  { name: "Algolia", npm: ["algoliasearch", "@algolia/"], py: ["algoliasearch"], env: ["ALGOLIA_", "NEXT_PUBLIC_ALGOLIA_"] },
  { name: "Mapbox", npm: ["mapbox-gl", "@mapbox/", "@rnmapbox/"], env: ["MAPBOX_", "NEXT_PUBLIC_MAPBOX_"] },
  { name: "Google Maps Platform", usage: true, npm: ["@googlemaps/", "@react-google-maps/"], py: ["googlemaps"], env: ["GOOGLE_MAPS_", "NEXT_PUBLIC_GOOGLE_MAPS_"] },
  { name: "Trigger.dev", npm: ["@trigger.dev/"], env: ["TRIGGER_SECRET_KEY", "TRIGGER_API_"] },
  { name: "Inngest", npm: ["inngest"], py: ["inngest"], env: ["INNGEST_"] },

  // Work tools with paid APIs
  { name: "Linear", npm: ["@linear/sdk"], env: ["LINEAR_API_"] },
  { name: "Notion", npm: ["@notionhq/client"], py: ["notion-client"], env: ["NOTION_"] },
  { name: "Expo", env: ["EXPO_TOKEN", "EXPO_ACCESS_TOKEN", "EXPO_PUSH_", "EAS_"] },
  { name: "GoDaddy", env: ["GODADDY_"] },
];

/**
 * Config files that mean a hosted service is in use. Paths are relative, with "/" separators.
 * @type {{ test: RegExp, vendor: string, usage?: boolean, maybe?: boolean }[]}
 */
export const CONFIG_FILES = [
  { test: /(^|\/)vercel\.json$/, vendor: "Vercel" },
  { test: /(^|\/)\.vercel\/project\.json$/, vendor: "Vercel" },
  { test: /(^|\/)render\.ya?ml$/, vendor: "Render" },
  { test: /(^|\/)fly\.toml$/, vendor: "Fly.io", usage: true },
  { test: /(^|\/)wrangler\.(toml|json|jsonc)$/, vendor: "Cloudflare" },
  { test: /(^|\/)netlify\.toml$/, vendor: "Netlify" },
  { test: /(^|\/)railway\.(json|toml)$/, vendor: "Railway", usage: true },
  { test: /(^|\/)eas\.json$/, vendor: "Expo" },
  { test: /(^|\/)(firebase\.json|\.firebaserc)$/, vendor: "Firebase" },
  { test: /(^|\/)supabase\/config\.toml$/, vendor: "Supabase", maybe: true },
  { test: /(^|\/)amplify\.ya?ml$/, vendor: "AWS", usage: true },
  { test: /(^|\/)serverless\.ya?ml$/, vendor: "AWS", usage: true },
  { test: /(^|\/)app\.ya?ml$/, vendor: "Google Cloud", usage: true, maybe: true },
  { test: /(^|\/)heroku\.yml$/, vendor: "Heroku" },
  { test: /(^|\/)Procfile$/, vendor: "Heroku", maybe: true },
  { test: /(^|\/)sentry\.properties$/, vendor: "Sentry" },
  { test: /(^|\/)sentry\.(client|server|edge)\.config\.[cm]?[jt]s$/, vendor: "Sentry" },
  { test: /(^|\/)\.do\/app\.ya?ml$/, vendor: "DigitalOcean" },
  { test: /(^|\/)(apify\.json|\.actor\/actor\.json)$/, vendor: "Apify", usage: true },
  { test: /(^|\/)convex\.json$/, vendor: "Convex" },
  { test: /(^|\/)trigger\.config\.[cm]?[jt]s$/, vendor: "Trigger.dev" },
];

/** Terraform providers that bill: provider "hcloud" { ... } */
export const TERRAFORM_PROVIDERS = {
  aws: "AWS",
  google: "Google Cloud",
  "google-beta": "Google Cloud",
  azurerm: "Microsoft Azure",
  cloudflare: "Cloudflare",
  hcloud: "Hetzner",
  digitalocean: "DigitalOcean",
  vercel: "Vercel",
  fly: "Fly.io",
  linode: "Linode",
  vultr: "Vultr",
  heroku: "Heroku",
  datadog: "Datadog",
  mongodbatlas: "MongoDB Atlas",
  supabase: "Supabase",
};

/** Same check for npm and Python names: exact, or a prefix that ends in "/" or "-". */
function matches(patterns, name) {
  const n = name.toLowerCase();
  return (patterns ?? []).some((p) => (p.endsWith("/") || p.endsWith("-") ? n.startsWith(p) : n === p));
}

/** Python names compare without case, and "_" and "." count as "-". */
const pyName = (name) => name.toLowerCase().replace(/[_.]+/g, "-");

/** @returns {Vendor | null} */
export function vendorForPackage(ecosystem, name) {
  const key = ecosystem === "py" ? pyName(name) : name;
  return VENDORS.find((v) => matches(ecosystem === "py" ? v.py : v.npm, key)) ?? null;
}

/** Short or common words that can't name a vendor on their own inside a longer variable name. */
const WEAK_SEGMENTS = new Set(["AWS", "XAI", "FAL", "MUX", "E2B", "NEON", "RESEND", "LINEAR", "NOTION", "PUSHER", "MODAL"]);

/** Single-word prefixes ("OPENAI_") can also show up mid-name: "SUBMISSION_RESUME_R2_BUCKET". */
const SEGMENTS = new Map(
  VENDORS.flatMap((vendor) =>
    (vendor.env ?? [])
      .filter((prefix) => /^[A-Z0-9]+_$/.test(prefix))
      .map((prefix) => prefix.slice(0, -1))
      .filter((word) => (word.length >= 4 || word === "R2") && !WEAK_SEGMENTS.has(word))
      .map((word) => [word, vendor]),
  ),
);

/**
 * Vendor for an environment variable name.
 * A matching prefix (longest wins) is strong evidence. Exact names (no trailing "_") must match
 * in full. A vendor word further inside the name is weak evidence, for the agent to check.
 * @returns {{ vendor: Vendor, strong: boolean } | null}
 */
export function vendorForEnvName(name) {
  let best = null;
  let bestLength = 0;
  for (const vendor of VENDORS) {
    for (const prefix of vendor.env ?? []) {
      const hit = prefix.endsWith("_") ? name.startsWith(prefix) : name === prefix;
      if (hit && prefix.length > bestLength) {
        best = vendor;
        bestLength = prefix.length;
      }
    }
  }
  if (best) return { vendor: best, strong: true };
  for (const word of name.split("_").slice(1)) {
    const vendor = SEGMENTS.get(word);
    if (vendor) return { vendor, strong: false };
  }
  return null;
}

export function vendorByName(name) {
  return VENDORS.find((v) => v.name === name) ?? null;
}
