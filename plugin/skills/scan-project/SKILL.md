---
name: scan-project
description: Use when the user asks to scan a project, repo or codebase for the paid services, APIs and subscriptions it uses, or asks what a project pays for that Tabwren doesn't track yet. Finds them in the code and saves them to Tabwren as drafts for review.
argument-hint: "[folder]"
---

# Scan a project for paid services

Find the paid services a project uses and save them to Tabwren as drafts. A person confirms each draft and adds prices later.

Folder to scan: $ARGUMENTS (if empty, the root of the current project).

## Steps

1. Run the scanner:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/scan.mjs" "<folder>"
   ```

   It prints JSON: `project` (the name to use in Tabwren), and `services`, each with `vendor`, `confidence`, `evidence` and sometimes `billing_cycle: "usage"`.
   It reads dependency lists, config files and the names of environment variables. It never opens `.env` files, and never prints a value.

2. Check the list before saving anything:
   - Drop what the project doesn't pay for: a library with no hosted service, or a service it runs itself.
   - For each `"confidence": "maybe"` entry, look at the file in its evidence. Keep it only if the project really uses that service.
   - You may add services the code or docs make clear, such as a deploy guide that names a host.
   - Never open `.env` files or any other file that holds secrets. Never copy a key, token, password or connection string.

3. Call `list_subscriptions` with `project` set to the scanner's `project` value, to see what is already tracked.

4. Call `add_drafts` once, with:
   - `project`: the scanner's `project` value,
   - `drafts`: every service that isn't tracked yet, each with `vendor`, a short `evidence` (the file and the package or variable name, from the scanner), and `billing_cycle: "usage"` for pay-as-you-go APIs.

   Leave out price, plan and billing cycle unless the code states them. Don't guess.

5. Tell the user, in a few lines:
   - how many drafts you saved, and which services were already tracked,
   - that they can confirm or dismiss the drafts on Tabwren's Subscriptions page, then add prices on the Needs details page,
   - that a scan can't see domains, servers paid by hand, or tools used only in a browser, so they may want to add those themselves.
