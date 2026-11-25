// Walks a project folder and collects evidence of paid services. Read-only.
//
// Privacy rules:
// - .env files with real values are never opened. Only templates (.env.example and the like) are read.
// - From any file, only package names, provider names and environment variable NAMES are kept.
//   Values are never read into the result, so nothing secret can reach the output.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { CONFIG_FILES, TERRAFORM_PROVIDERS, vendorByName, vendorForEnvName, vendorForPackage } from "./catalog.mjs";

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", ".next", ".nuxt", ".svelte-kit", ".turbo", ".output", "dist", "build",
  "out", "coverage", "vendor", "venv", ".venv", "__pycache__", ".pytest_cache", ".mypy_cache", ".expo", "Pods",
  ".gradle", ".idea", ".vscode", ".claude", "target", ".terraform", ".cache", "tmp", ".tmp",
]);
const CODE_FILE = /\.(?:[cm]?[jt]sx?|py|go|rb|php|ya?ml|toml)$/i;
const MAX_FILE_BYTES = 1_000_000;
const MAX_FILES_READ = 6000;
const MAX_DEPTH = 8;
const MAX_EVIDENCE = 4;

/** ".env.example" and friends hold names, not values. Every other ".env*" file is off limits. */
export function isEnvTemplate(name) {
  return /(^|\.)env(\.|$)/i.test(name) && /(^|\.)(example|sample|template|dist|tpl|defaults?\.example)(\.|$)/i.test(name);
}
export function isSecretFile(name) {
  return (/^\.env/i.test(name) || /\.env$/i.test(name)) && !isEnvTemplate(name);
}

// Environment variable names referenced in code and config, never their values.
const ENV_REFERENCES = [
  /(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]{2,})/g,
  /(?:process\.env|os\.environ|ENV|\$_ENV|\$_SERVER)\[\s*["']([A-Z][A-Z0-9_]{2,})["']\s*\]/g,
  /(?:Deno\.env\.get|os\.environ\.get|os\.getenv|os\.Getenv|ENV\.fetch|getenv|env)\(\s*["']([A-Z][A-Z0-9_]{2,})["']/g,
  /\bsecrets\.([A-Z][A-Z0-9_]{2,})/g, // GitHub Actions
  /^\s*-?\s*key:\s*["']?([A-Z][A-Z0-9_]{2,})["']?\s*$/gm, // render.yaml envVars
];

/** Package names from a package.json. */
function npmPackages(text) {
  try {
    const json = JSON.parse(text);
    return Object.keys({ ...json.dependencies, ...json.devDependencies, ...json.optionalDependencies });
  } catch {
    return [];
  }
}

/** Package names from requirements.txt, pyproject.toml or a Pipfile. Crude on purpose: names only. */
function pythonPackages(name, text) {
  const names = new Set();
  const lines = text.split(/\r?\n/);
  if (/^requirements.*\.txt$/i.test(name)) {
    for (const line of lines) {
      const match = /^\s*([A-Za-z0-9][A-Za-z0-9_.-]*)/.exec(line.replace(/#.*/, ""));
      if (match && !line.trim().startsWith("-")) names.add(match[1]);
    }
    return [...names];
  }
  let section = "";
  let inArray = false;
  for (const raw of lines) {
    const line = raw.replace(/#.*/, "");
    const header = /^\s*\[([^\]]+)\]\s*$/.exec(line);
    if (header) {
      section = header[1].trim().toLowerCase();
      inArray = false;
      continue;
    }
    // Arrays of requirement strings: "dependencies = [...]", optional-dependencies groups, dependency-groups.
    const arrayKey = !inArray && /^\s*([\w.-]+)\s*=\s*\[/.exec(line)?.[1].toLowerCase();
    if (arrayKey) {
      inArray =
        arrayKey === "dependencies" ||
        arrayKey === "dev-dependencies" ||
        section.endsWith("optional-dependencies") ||
        section === "dependency-groups";
    }
    if (inArray) {
      for (const match of line.matchAll(/["']([A-Za-z0-9][A-Za-z0-9_.-]*)/g)) names.add(match[1]);
      if (line.includes("]")) inArray = false;
      continue;
    }
    // Poetry and Pipfile: one package per key.
    if (/dependencies$|^packages$|^dev-packages$/.test(section)) {
      const key = /^\s*([A-Za-z0-9][A-Za-z0-9_.-]*)\s*=/.exec(line);
      if (key && key[1].toLowerCase() !== "python") names.add(key[1]);
    }
  }
  return [...names];
}

function envNamesInTemplate(text) {
  const names = new Set();
  for (const match of text.matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]{2,})\s*=/gm)) names.add(match[1]);
  return [...names];
}

function envNamesInCode(text) {
  const names = new Set();
  for (const pattern of ENV_REFERENCES) for (const match of text.matchAll(pattern)) names.add(match[1]);
  return [...names];
}

function terraformProviders(text) {
  const names = new Set();
  for (const match of text.matchAll(/\bprovider\s+"([\w-]+)"/g)) names.add(match[1]);
  for (const match of text.matchAll(/\bsource\s*=\s*"[\w.-]+\/([\w-]+)"/g)) names.add(match[1]);
  return [...names];
}

/**
 * Scans a folder and returns the services it seems to use.
 * @param {string} root
 */
export function scanFolder(root) {
  /** @type {Map<string, { vendor: string, usage: boolean, strong: boolean, evidence: Map<string, number> }>} */
  const found = new Map();
  let filesRead = 0;
  let skippedSecretFiles = 0;

  // rank: 0 config file, 1 dependency or Terraform provider, 2 env template, 3 code. Lower shows first.
  const add = (vendorName, usage, evidence, strong, rank) => {
    const vendor = vendorByName(vendorName);
    const entry = found.get(vendorName) ?? { vendor: vendorName, usage: false, strong: false, evidence: new Map() };
    entry.usage ||= Boolean(usage);
    entry.strong ||= strong && !vendor?.maybe;
    entry.evidence.set(evidence, Math.min(rank + (strong ? 0 : 10), entry.evidence.get(evidence) ?? Infinity));
    found.set(vendorName, entry);
  };
  const addEnv = (env, where, rank) => {
    const match = vendorForEnvName(env);
    if (match) add(match.vendor.name, match.vendor.usage, `${where}: ${env}`, match.strong, rank);
  };

  const read = (path) => {
    if (filesRead >= MAX_FILES_READ) return null;
    try {
      if (statSync(path).size > MAX_FILE_BYTES) return null;
      filesRead += 1;
      return readFileSync(path, "utf8");
    } catch {
      return null;
    }
  };

  const visit = (dir, depth) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    // Python virtual environments can have any name.
    if (entries.some((e) => e.isFile() && e.name === "pyvenv.cfg")) return;

    for (const entry of entries) {
      const path = join(dir, entry.name);
      const rel = relative(root, path).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        if (depth < MAX_DEPTH && !SKIP_DIRS.has(entry.name) && !(entry.name === "output" && basename(dir) === ".vercel")) {
          visit(path, depth + 1);
        }
        continue;
      }
      if (!entry.isFile()) continue;
      const name = entry.name;

      if (isSecretFile(name)) {
        skippedSecretFiles += 1;
        continue;
      }

      for (const rule of CONFIG_FILES) {
        if (rule.test.test(rel)) add(rule.vendor, rule.usage, rel, !rule.maybe, 0);
      }

      if (name === "package.json") {
        const text = read(path);
        for (const pkg of text ? npmPackages(text) : []) {
          const vendor = vendorForPackage("npm", pkg);
          if (vendor) add(vendor.name, vendor.usage, `${rel}: ${pkg}`, true, 1);
        }
      } else if (/^requirements.*\.txt$|^pyproject\.toml$|^Pipfile$/i.test(name)) {
        const text = read(path);
        for (const pkg of text ? pythonPackages(name, text) : []) {
          const vendor = vendorForPackage("py", pkg);
          if (vendor) add(vendor.name, vendor.usage, `${rel}: ${pkg}`, true, 1);
        }
      } else if (isEnvTemplate(name)) {
        const text = read(path);
        for (const env of text ? envNamesInTemplate(text) : []) addEnv(env, rel, 2);
      } else if (/\.tf$/i.test(name)) {
        const text = read(path);
        for (const provider of text ? terraformProviders(text) : []) {
          const vendor = TERRAFORM_PROVIDERS[provider];
          if (vendor) add(vendor, vendorByName(vendor)?.usage, `${rel}: provider ${provider}`, true, 1);
        }
      } else if (CODE_FILE.test(name) && name !== "pnpm-lock.yaml") {
        const text = read(path);
        for (const env of text ? envNamesInCode(text) : []) addEnv(env, rel, 3);
      }
    }
  };

  visit(root, 0);

  const services = [...found.values()]
    .map(({ vendor, usage, strong, evidence }) => {
      const ranked = [...evidence.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([text]) => text);
      const more = ranked.length - MAX_EVIDENCE;
      return {
        vendor,
        confidence: strong ? "likely" : "maybe",
        ...(usage ? { billing_cycle: "usage" } : {}),
        evidence: more > 0 ? [...ranked.slice(0, MAX_EVIDENCE), `and ${more} more`] : ranked,
      };
    })
    .sort((a, b) => (a.confidence === b.confidence ? a.vendor.localeCompare(b.vendor) : a.confidence === "likely" ? -1 : 1));

  return {
    services,
    files_read: filesRead,
    ...(filesRead >= MAX_FILES_READ ? { note: `Stopped after ${MAX_FILES_READ} files. Scan a subfolder for the rest.` } : {}),
    secret_files_skipped: skippedSecretFiles,
  };
}
