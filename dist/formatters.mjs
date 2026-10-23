// src/formatters.ts
/**
* Render debt items as a table, sorted by updatedAt ascending (oldest first).
*/
function renderTable(items) {
	const allRows = [[
		"TYPE",
		"REPO",
		"NUM",
		"AGE",
		"TITLE"
	], ...[...items].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).map((item) => [
		item.type.toUpperCase().padEnd(4),
		item.repo.padEnd(40),
		`#${item.number}`.padEnd(8),
		item.age.padEnd(5),
		truncate(item.title, 60)
	])];
	let output = "\n";
	for (const row of allRows) output += row.join("  ") + "\n";
	output += `\nTotal: ${items.length} items (oldest first)\n`;
	return output;
}
/**
* Renders debt items as markdown table.
*/
function renderMarkdown(items) {
	const sorted = [...items].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
	let output = "| Type | Repo | # | Age | Title |\n";
	output += "|------|------|---|-----|-------|\n";
	for (const item of sorted) output += `| ${item.type.toUpperCase()} | ${item.repo} | ${item.number} | ${item.age} | ${truncate(item.title, 60)} |\n`;
	output += `\nTotal: ${items.length} items\n`;
	return output;
}
/**
* Render debt items as JSON.
*/
function renderJSON(items) {
	return JSON.stringify(items, null, 2);
}
/**
* Render a summary of debt items.
*/
function renderSummary(items) {
	const prs = items.filter((i) => i.type === "pr");
	const issues = items.filter((i) => i.type === "issue");
	const byRepo = {};
	for (const item of items) byRepo[item.repo] = (byRepo[item.repo] || 0) + 1;
	const sortedByRepo = Object.entries(byRepo).sort(([, a], [, b]) => b - a);
	let output = `\n📊 GitHub Debt Summary\n`;
	output += `=========================\n\n`;
	output += `Total items:    ${items.length}\n`;
	output += `PRs to review:  ${prs.length}\n`;
	output += `Issues to fix:  ${issues.length}\n\n`;
	if (sortedByRepo.length > 0) {
		output += "By repository:\n";
		for (const [repo, count] of sortedByRepo) output += `  ${repo.padEnd(45)} ${count}\n`;
	}
	if (items.length > 0) {
		const oldest = [...items].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
		const newest = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
		output += `\nOldest item: ${oldest.repo}#${oldest.number} (updated ${oldest.updatedAt})\n`;
		output += `Newest item: ${newest.repo}#${newest.number} (updated ${newest.updatedAt})\n`;
	}
	output += "\n";
	return output;
}
function truncate(str, max) {
	if (str.length <= max) return str;
	return str.slice(0, max - 3) + "...";
}
export { renderJSON, renderMarkdown, renderSummary, renderTable };
