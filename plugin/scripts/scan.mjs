#!/usr/bin/env node
// Lists the paid services a project seems to use, as JSON, for the scan-project skill.
// Usage: node scan.mjs [folder]   (default: the current folder)
//
// It reads dependency lists, config files and environment variable NAMES. It never opens
// .env files that hold real values, and never prints a value.
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { projectName } from "../hooks/lib/project.mjs";
import { scanFolder } from "./lib/scan-folder.mjs";

const folder = resolve(process.argv[2] || process.cwd());
if (!existsSync(folder) || !statSync(folder).isDirectory()) {
  process.stdout.write(JSON.stringify({ error: `Not a folder: ${folder}` }) + "\n");
  process.exit(1);
}

const result = scanFolder(folder);
process.stdout.write(JSON.stringify({ project: projectName(folder), folder, ...result }, null, 2) + "\n");
