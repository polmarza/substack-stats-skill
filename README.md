# Substack stats skill

A Claude Code skill that builds a local analytics dashboard for **your own**
Substack publications: views, opens, open rate, clicks, reactions, comments,
attributed signups, growth sources, per-post detail, and a side-by-side
comparison across all your publications.

Substack has no public API. Its writer dashboard talks to a private JSON API
under `/api/v1/…` that works with the logged-in browser session. This skill
drives that API from Claude's integrated browser **with your own session**,
saves the data locally, and builds a single self-contained `dashboard.html`.
Nothing is sent anywhere.

## Install

```bash
git clone https://github.com/polmarza/substack-stats-skill.git ~/.claude/skills/substack-stats-skill
```

Or just copy the folder into `~/.claude/skills/`.

## Use it

Ask Claude something like *"show me how my Substack posts are performing"*.
Claude opens a browser, you log into Substack yourself (Claude never touches
your password or cookie), and it fetches your stats and builds the dashboard.

The skill is self-contained: `SKILL.md` describes the flow, `assets/` holds
the browser collector and the HTML template, and `scripts/build.py` is a
dependency-free Python 3 builder. It needs no server, no Playwright, and no
browser extension — see [`SKILL.md`](SKILL.md) for the full flow.

## Requirements

Claude Code (or any Claude client that can run a skill and drive a browser)
plus Python 3.

## Privacy

- Your Substack session never leaves your own browser; Claude only reads the
  same private API your own writer dashboard already calls.
- Only publications where you are an **admin** return stats.
- Everything stays local: the datasets Claude downloads and the
  `dashboard.html` it builds live on your machine.

## Also available as

This skill is the Claude Code counterpart of
[Substack Dashboard](https://github.com/polmarza/substack-dashboard), which
also ships a [Chrome extension](https://chromewebstore.google.com/detail/nojlkggahlaaankemcnjdigdkogcnepn)
and a local Node app with the same dashboard. The three share the same look
and metrics but are independent, self-contained projects — pick whichever
fits how you work.

## Caveats

This uses an **undocumented** API. Substack can change it without notice.
Treat this as a working tool, not a supported product. Requests are paced to
stay well within limits. See [`references/endpoints.md`](references/endpoints.md)
for the endpoints used.

## License

MIT — see [LICENSE](LICENSE). Every dashboard the tool generates carries a
discreet credit line in its footer; please leave it in place.
