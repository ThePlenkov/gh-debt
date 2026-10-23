import { spawnSync } from "node:child_process";
// src/github.ts
/**
* GitHub API client for gh-debt — shells out to `gh api graphql`
* following the pattern from @broject/core, avoiding any Octokit
* dependency so auth, proxies, and GHES setups just work.
*/
/**
* Spawn `gh api graphql` synchronously and parse JSON. Matches bro's
* `ghJson` pattern — blocking spawnSync is fine for a CLI tool.
* Variables are passed as `-F` fields (string/number/bool only).
*/
function ghGraphQL(query, vars) {
	const args = [
		"api",
		"graphql",
		"-f",
		`query=${query}`
	];
	for (const [k, v] of Object.entries(vars)) args.push("-F", `${k}=${v}`);
	const proc = spawnSync("gh", args, {
		stdio: [
			"ignore",
			"pipe",
			"pipe"
		],
		encoding: "utf8"
	});
	if (proc.status !== 0) throw new Error(`gh api graphql failed: ${proc.stderr?.trim() ?? "unknown error"}`);
	const parsed = JSON.parse(proc.stdout);
	if (parsed.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(parsed.errors)}`);
	if (!parsed.data) throw new Error("No data in GraphQL response");
	return parsed.data;
}
/**
* Format a date for the GraphQL `search:` qualifier — uses ISO date
* without time for the stale filter.
*/
function daysAgoISO(days) {
	return (/* @__PURE__ */ new Date(Date.now() - days * 24 * 60 * 60 * 1e3)).toISOString().split("T")[0];
}
/**
* Query for PRs where the user is requested as a reviewer.
* Uses type: ISSUE with is:pull-request filter — GitHub search
* treats PRs as a subtype of issues, so the search index covers both.
*/
function fetchReviewerPRs(opts) {
	const { limit = 30, staleDays, repo } = opts;
	let qualifier = "review-requested:@me is:pull-request state:open";
	if (repo) qualifier += ` repo:${repo}`;
	if (staleDays) qualifier += ` updated:<${daysAgoISO(staleDays)}`;
	return ghGraphQL(`query($q: String!, $last: Int!) {
  search(query: $q, type: ISSUE, last: $last) {
    nodes {
      ... on PullRequest {
        number
        title
        repository { nameWithOwner }
        url
        updatedAt
        createdAt
        author { login }
        state
        labels(first: 20) { nodes { name } }
      }
    }
  }
}`, {
		q: qualifier,
		last: limit
	}).search.nodes.filter((n) => n !== null && n.repository?.nameWithOwner !== void 0).map((n) => ({
		repo: n.repository.nameWithOwner,
		number: n.number,
		title: n.title,
		url: n.url,
		updatedAt: n.updatedAt,
		createdAt: n.createdAt,
		type: "pr",
		state: n.state === "MERGED" ? "merged" : n.state.toLowerCase(),
		author: n.author?.login,
		labels: n.labels.nodes.map((l) => l.name)
	}));
}
/**
* Query for issues assigned to the user.
* Uses is:issue to exclude PRs — GitHub search treats PRs as a subtype.
*/
function fetchAssignedIssues(opts) {
	const { limit = 30, staleDays, repo } = opts;
	let qualifier = "assignee:@me is:issue state:open";
	if (repo) qualifier += ` repo:${repo}`;
	if (staleDays) qualifier += ` updated:<${daysAgoISO(staleDays)}`;
	return ghGraphQL(`query($q: String!, $last: Int!) {
  search(query: $q, type: ISSUE, last: $last) {
    nodes {
      ... on Issue {
        number
        title
        repository { nameWithOwner }
        url
        updatedAt
        createdAt
        labels(first: 20) { nodes { name } }
      }
    }
  }
}`, {
		q: qualifier,
		last: limit
	}).search.nodes.filter((n) => n !== null && n.repository?.nameWithOwner !== void 0).map((n) => ({
		repo: n.repository.nameWithOwner,
		number: n.number,
		title: n.title,
		url: n.url,
		updatedAt: n.updatedAt,
		createdAt: n.createdAt,
		type: "issue",
		state: "open",
		labels: n.labels.nodes.map((l) => l.name)
	}));
}
/**
* Query for PRs authored by the user that are awaiting review.
*/
function fetchAuthoredPRs(opts) {
	const { limit = 30, staleDays, repo } = opts;
	let qualifier = "author:@me is:pull-request state:open";
	if (repo) qualifier += ` repo:${repo}`;
	if (staleDays) qualifier += ` updated:<${daysAgoISO(staleDays)}`;
	return ghGraphQL(`query($q: String!, $last: Int!) {
  search(query: $q, type: ISSUE, last: $last) {
    nodes {
      ... on PullRequest {
        number
        title
        repository { nameWithOwner }
        url
        updatedAt
        createdAt
        state
      }
    }
  }
}`, {
		q: qualifier,
		last: limit
	}).search.nodes.filter((n) => n !== null && n.repository?.nameWithOwner !== void 0).map((n) => ({
		repo: n.repository.nameWithOwner,
		number: n.number,
		title: n.title,
		url: n.url,
		updatedAt: n.updatedAt,
		createdAt: n.createdAt,
		type: "pr",
		state: n.state === "MERGED" ? "merged" : n.state.toLowerCase(),
		labels: []
	}));
}
/**
* Fetch all debt — PRs needing your review + issues assigned to you.
*
* `limit` caps the combined result, so it is split between the two queries
* rather than applied to each (which would return up to twice as many items).
*/
function fetchAllDebt(opts = {}) {
	const limit = opts.limit ?? 30;
	const prs = fetchReviewerPRs({
		...opts,
		limit: Math.ceil(limit / 2)
	});
	const issues = fetchAssignedIssues({
		...opts,
		limit: Math.floor(limit / 2)
	});
	return [...prs, ...issues];
}
/**
* Compute human-readable age from an ISO date string.
*/
function humanAge(isoDate) {
	const then = new Date(isoDate).getTime();
	const days = Math.floor((Date.now() - then) / 864e5);
	if (days < 1) return "today";
	if (days < 7) return `${days}d`;
	if (days < 30) return `${Math.floor(days / 7)}w`;
	return `${Math.floor(days / 30)}mo`;
}
/**
* Convert a raw GitHubItem to a DebtItem with computed age.
*/
function toDebtItem(item) {
	return {
		...item,
		age: humanAge(item.updatedAt)
	};
}
export { fetchAllDebt, fetchAssignedIssues, fetchAuthoredPRs, fetchReviewerPRs, humanAge, toDebtItem };
