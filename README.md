# Substack stats skill

> Ask Claude how your Substack is doing, and get a real answer built from your
> own numbers — locally, with no extension and no third-party service.

## About

Substack shows writers plenty of numbers and very little analysis. The numbers
live behind seven dashboard tabs, reset every time you change the date range,
and can't be compared across publications or asked a question. This skill
closes that gap.

It is a Claude Code skill that reads the **private JSON API** Substack's own
writer dashboard calls — the one under `/api/v1/…`, authenticated by nothing
more than the session already sitting in your browser — and turns it into two
things:

- **A dashboard you own.** One self-contained `dashboard.html`: views, opens,
  open rate, clicks, reactions, comments, attributed signups, growth sources,
  subscribers by country, per-post detail with traffic sources and most-clicked
  links, and a side-by-side comparison across every publication you run.
- **Numbers Claude can reason over.** The collected datasets are plain JSON, so
  you can ask follow-up questions the dashboard doesn't have a chart for —
  which topics actually convert, whether readers *finish* your posts, which
  publications share your audience.

Substack has no public API and no documentation for this one, so the repo also
ships [`references/endpoints.md`](references/endpoints.md): a catalogue of over
120 routes with their parameters, response shapes and the question each one
answers — 65 of them verified call-by-call against a live session. A dozen of
the most useful analytics routes in it appear in no other public reference.

Nothing is sent anywhere. Claude never handles your password or your cookie —
you log in yourself, and the session does the rest.

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
stay well within limits. [`references/endpoints.md`](references/endpoints.md)
documents every route, records when each was last verified, and explains how to
re-capture the current ones from the dashboard when Substack changes something.

## License

MIT — see [LICENSE](LICENSE). Every dashboard the tool generates carries a
discreet credit line in its footer; please leave it in place.
