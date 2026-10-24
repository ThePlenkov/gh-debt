# gh-debt

A [GitHub CLI](https://cli.github.com/) extension for tracking and managing technical debt on GitHub — PRs awaiting your review, issues assigned to you, and stale review items across all your repositories. Prioritized by last-updated date so nothing slips through the cracks.

## Installation

```bash
gh extension install ThePlenkov/gh-debt
```

The bundle in `dist/` is committed, so the extension runs as soon as it is
installed — no build step and no dependencies at runtime.

To work on the extension from a clone:

```bash
git clone https://github.com/ThePlenkov/gh-debt
cd gh-debt
npm ci
npm run build
```

## Interactive UI

```bash
gh debt          # on a terminal
gh debt -i       # explicitly, even if you normally script it
```

Three panes: sources on the left, the list in the middle, details on the right.

| Key | Action |
|-----|--------|
| `1` `2` `3` | All / PRs / Issues |
| `←` `→` | Cycle sources |
| `↑` `↓` or `k` `j` | Move the selection |
| `tab` | Move focus to the next pane |
| `/` | Filter by repo and title (`esc` clears) |
| `↵` | Expand the detail pane |
| `b` | Open the item with `gh browse` |
| `r` | Re-fetch |
| `q` | Quit |

The UI is a full-screen alt-buffer render, so it restores the terminal on
exit. When stdin or stdout is not a TTY — a pipe, a redirect, CI — `gh debt`
prints the plain table instead, and `-i` fails with an explanation rather
than taking over the screen.

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

# Machine-readable output
gh debt list --format json
gh debt stats --format md
```

## How it works

Data comes from `gh api graphql` (a `search` query), so authentication,
proxies and GitHub Enterprise behave exactly as they do for `gh` itself. The
package has no runtime dependencies — React and ink are bundled into the
interactive chunk at build time, and the plain CLI stays ~12 kB.

## License

MIT
