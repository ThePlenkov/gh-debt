# gh-debt

A [GitHub CLI](https://cli.github.com/) extension for tracking and managing technical debt on GitHub — PRs awaiting your review, issues assigned to you, and stale review items across all your repositories. Prioritized by last-updated date so nothing slips through the cracks.

## Installation

```bash
gh extension install ThePlenkov/gh-debt
```

Or build from source:

```bash
gh extension install ./gh-debt
```

## Commands

| Command | Description |
|---------|-------------|
| `gh debt list` | Show all open PRs and issues requiring your attention, sorted by last updated |
| `gh debt prs` | Show only PRs needing your review (oldest first) |
| `gh debt issues` | Show only issues assigned to you (oldest first) |
| `gh debt stats` | Summary of outstanding debt by repository and type |
| `gh debt stale` | Show items not updated in N days (default: 7) |

## Examples

```bash
# List all debt, oldest first
gh debt list

# Show PR debt only
gh debt prs --limit 20

# Show issues assigned to you, older than 2 weeks
gh debt issues --stale 14

# Summary stats by repo
gh debt stats

# Stale items (not updated in 7+ days)
gh debt stale
```

## License

MIT