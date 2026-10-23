#!/usr/bin/env node
import { fetchAllDebt, fetchAssignedIssues, fetchReviewerPRs, toDebtItem } from "./github.mjs";
import { renderJSON, renderMarkdown, renderSummary, renderTable } from "./formatters.mjs";
import { parseArgs } from "node:util";
// src/cli.ts
/**
* gh-debt — GitHub CLI extension for tracking technical debt.
*
* Shows PRs where you're requested as a reviewer, issues assigned to you,
* and stale items across all your repos, prioritized by last-updated date.
*
* Usage:
*   gh debt list [--limit N] [--stale DAYS] [--repo OWNER/REPO] [--format table|json|md]
*   gh debt prs  [--limit N] [--stale DAYS] [--repo OWNER/REPO] [--format table|json|md]
*   gh debt issues [--limit N] [--stale DAYS] [--repo OWNER/REPO] [--format table|json|md]
*   gh debt stats
*   gh debt stale [--days N] [--format table|json|md]
*/
const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	options: {
		limit: {
			type: "string",
			short: "l",
			default: "30"
		},
		stale: {
			type: "string",
			short: "s"
		},
		repo: {
			type: "string",
			short: "r"
		},
		format: {
			type: "string",
			short: "f",
			default: "table"
		},
		days: {
			type: "string",
			short: "d",
			default: "7"
		},
		help: {
			type: "boolean",
			short: "h"
		}
	},
	allowPositionals: true
});
const command = positionals[0] ?? "list";
if (values.help || command === "help" || command === "--help") {
	console.log(`
gh-debt — Track GitHub technical debt across all your repositories.

Prioritizes PRs awaiting your review and issues assigned to you by
last-updated date, so nothing slips through the cracks.

Commands:
  list      Show all debt (PRs + issues) — default
  prs       Show PRs where you're requested as a reviewer
  issues    Show issues assigned to you
  stats     Show a summary breakdown by repository
  stale     Show items not updated in N days (default: 7)

Flags:
  --limit N     Maximum items to fetch (default: 30)
  --stale DAYS  Only show items not updated in the last N days
  --repo OWNER/REPO  Scope to a specific repository
  --format FORMAT  Output format: table | json | md
  --days N      Days for stale filter (used with 'stale' command)
  -h, --help    Show this help

Examples:
  gh debt list
  gh debt prs --limit 20
  gh debt issues --stale 14
  gh debt stats
  gh debt stale --days 14
  gh debt list --format json
`);
	process.exit(0);
}
const limit = parseInt(values.limit ?? "30", 10);
const staleDays = values.stale ? parseInt(values.stale, 10) : void 0;
const repo = values.repo;
const format = values.format ?? "table";
function output(items, fmt) {
	switch (fmt) {
		case "json":
			console.log(renderJSON(items));
			break;
		case "md":
			console.log(renderMarkdown(items));
			break;
		default: console.log(renderTable(items));
	}
}
function handleFetch(fn) {
	try {
		output(fn().map(toDebtItem), format);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (msg.includes("gh api graphql failed") || msg.includes("GraphQL errors")) {
			console.error("❌ Failed to query GitHub. Ensure you are authenticated:");
			console.error("   gh auth login");
			console.error(`   ${msg}`);
			process.exit(1);
		}
		console.error(`❌ Error: ${msg}`);
		process.exit(1);
	}
}
switch (command) {
	case "list":
		handleFetch(() => fetchAllDebt({
			limit,
			staleDays,
			repo
		}));
		break;
	case "prs":
		handleFetch(() => fetchReviewerPRs({
			limit,
			staleDays,
			repo
		}));
		break;
	case "issues":
		handleFetch(() => fetchAssignedIssues({
			limit,
			staleDays,
			repo
		}));
		break;
	case "stats":
		try {
			const items = fetchAllDebt({ limit }).map(toDebtItem);
			console.log(renderSummary(items, format));
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (msg.includes("gh api graphql failed") || msg.includes("GraphQL errors")) {
				console.error("❌ Failed to query GitHub. Ensure you are authenticated:");
				console.error("   gh auth login");
				process.exit(1);
			}
			console.error(`❌ Error: ${msg}`);
			process.exit(1);
		}
		break;
	case "stale": {
		const days = parseInt(values.days ?? "7", 10);
		handleFetch(() => fetchAllDebt({
			limit,
			staleDays: days,
			repo
		}));
		break;
	}
	default:
		console.error(`Unknown command: ${command}`);
		console.error("Run `gh debt --help` for usage.");
		process.exit(1);
}
export {};
