# subtrack plugin for Claude Code

Logs every paid tool, API and subscription your agents sign up for to Tabwren.

## What it adds

- **MCP server `subtrack`**: tools to add, list, update and cancel subscriptions, save drafts for review, and get spend and renewal summaries.
- **PostToolUse hook**: spots likely purchases (checkout and billing pages, purchase confirmations, cloud CLI purchase commands), saves a draft for review and reminds the agent to log it. Docs, help and blog pages about billing don't count.
- **Stop hook**: if the session showed a likely purchase that was never logged, it asks the agent once to log it before finishing.
- **Skill `log-subscriptions`**: when and how to log.
- **Skill `scan-project`**: finds the paid services a project already uses, from its dependency lists, config files and environment variable names, and saves them as drafts. Run it with `/subtrack:scan-project`, or ask "scan this project for paid services". It never opens `.env` files or reads values.

The hooks keep only a vendor guess, the host and plain-word path of a page, or the first words of a command. They never keep query strings, page contents or the chat.

## Set up

1. In Tabwren, open **Agent keys** and create a key. It is shown once.

2. Add the plugin. In a terminal, in the project you want to track:

   ```bash
   claude plugin marketplace add sabithmohamad/tabwren-plugin
   claude plugin install subtrack@tabwren --scope local
   ```

   `--scope local` keeps the plugin to this project and writes only `.claude/settings.local.json`,
   which git ignores. Use `--scope user` to track every project on this computer. Inside Claude Code,
   `/plugin marketplace add sabithmohamad/tabwren-plugin` and `/plugin install subtrack@tabwren` do the same.

3. Give it your key. The simplest way, on any system, is the `env` block of the same
   `.claude/settings.local.json` (create the file if it's missing):

   ```json
   {
     "env": {
       "SUBTRACK_API_KEY": "sta_..."
     }
   }
   ```

   Keep any keys already in that file; add `env` next to them. Check that git ignores the file
   before you paste the key. You can use a shell variable instead
   (`export SUBTRACK_API_KEY=sta_...` on macOS and Linux, or `setx SUBTRACK_API_KEY sta_...` on Windows,
   then restart Claude Code).

   The plugin talks to `https://tabwren.onrender.com`. To use another Tabwren server, such as one you
   run yourself, also set `SUBTRACK_URL` (for example `http://localhost:3000`).

4. Start a new Claude Code session in the project. `claude mcp list` should show
   `plugin:subtrack:subtrack` as connected.

5. Optional: run `/subtrack:scan-project` once, to add what the project already pays for.

Without `SUBTRACK_API_KEY` the hooks do nothing.

To remove it: `claude plugin uninstall subtrack@tabwren --scope local`, then
`claude plugin marketplace remove tabwren`, then delete the `SUBTRACK_*` lines.

## Develop it

The plugin's source lives in the Tabwren repository, in `plugin/`. To try a change, add your copy of
that repository as a local marketplace:

```bash
claude plugin marketplace add /path/to/tabwren-source --scope local
claude plugin install subtrack@sub-tracker --scope local
```

`node scripts/publish-plugin.mjs <folder>` copies the plugin into a clone of the public
`tabwren-plugin` repository, ready to commit.
