---
name: log-subscriptions
description: Use right after you sign up for, start a trial of, upgrade or buy any paid service, API, plan, domain or SaaS tool, or when asked what the team pays for or what renews soon. Logs it to the team's Subscription Tracker.
---

# Log subscriptions

The team tracks every paid tool in Tabwren. You log what you sign up for with the `subtrack` MCP tools.

## When

- Right after any sign-up, free trial, upgrade, plan change or purchase that costs money now or later.
- This includes API keys for paid APIs, hosting, databases, domains and usage-based services.
- When a hook says "this looks like a paid sign-up", check what happened and log it if it was real.

## How

1. Call `add_subscription` with `vendor`, `plan`, `amount` (per billing cycle, in major units: 20 for $20), `currency`, `billing_cycle` and `project` (the repo or project name).
   - Use `billing_cycle: "usage"` for pay-as-you-go APIs.
   - Use `status: "trial"` for a free trial and set `next_renewal_on` to the date the trial ends.
   - Leave out what you don't know: price, currency or billing cycle. Don't guess. An unknown cycle is stored as `unknown`.
2. It is safe to call twice. For the same vendor, plan and project it returns `already_tracked` instead of making a duplicate, and `confirmed_draft` when it fills in a draft a hook saved. The same vendor for another project gets its own entry.
3. If a plan changes, call `update_subscription`. If you cancel a service with the vendor, call `cancel_subscription`.

## Never

Never put card numbers, passwords, API keys, tokens or other secrets in any field, including `notes`.

## Questions about spend

- `get_spend_summary`: monthly and yearly totals by project and vendor. Entries without a price or a known billing cycle are left out and listed in `not_counted`. When `totals_complete` is false, say the totals are partial. `budgets` lists each project's monthly limit against its spend: mention any with `over: true`, and say the figure may be low when `partial` is true.
- `get_api_spend`: what connected pay-as-you-go APIs (Anthropic, OpenAI, OpenRouter) really cost, this month so far and last month. Use it for questions about usage-billed APIs.
- `upcoming_renewals`: what renews or ends in the next N days.
- `list_subscriptions`: everything tracked, filtered by status, vendor or project.
