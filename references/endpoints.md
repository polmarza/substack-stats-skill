# Substack private API — endpoints used

Substack publishes no official API. Its own writer dashboard calls a private JSON
API that works with the logged-in browser session (cookies). These endpoints are
undocumented and can change. Community reference:
https://github.com/AnthonyDavidAdams/substack-api-reference

## Hosts and auth

- Account-level calls: `https://substack.com/api/v1/…`
- Per-publication calls: `https://<subdomain>.substack.com/api/v1/…`

The stats endpoints are **per-publication** and must be called from that
publication's own origin (navigate the browser there first, then `fetch` with
`credentials: 'include'`). Auth is the session cookie the browser already holds
(`connect.sid`, HttpOnly). There is no token, no OAuth, no API key. Never read,
copy, or transmit the cookie.

## Discovery

| Method | Path | Host | Returns |
|---|---|---|---|
| GET | `/api/v1/user/profile/self` | substack.com | Profile incl. `publicationUsers[]` with `role` and `publication{id,name,subdomain,custom_domain}`. Use `role === 'admin'`. 200 = logged in. |

## Posts

| Method | Path | Returns |
|---|---|---|
| GET | `/api/v1/post_management/published?offset=N&limit=50&order_by=post_date&order_direction=desc` | `{posts, total, offset, limit}`. Each post already carries a nested `stats` object, plus `reaction_count`, `comment_count`, `reactions`. Paginate with `offset`. |
| GET | `/api/v1/post_management/counts` | `{published, drafts, scheduled}`. |
| GET | `/api/v1/post_management/detail/{post_id}?offset=0&limit=1` | `{posts:[post], total}` — the post with the full `stats` including `firstWeekDailyStats`, `referrers`, `links`, and `comps` (the average of comparable posts). This is the canonical per-post analytics call. |

## Publication summary and growth

| Method | Path | Returns |
|---|---|---|
| GET | `/api/v1/publish-dashboard/summary` | All-time: `subscribers`/`totalEmail`, `views`, `viewsDelta`, `openRate`, paid/pledge fields. |
| GET | `/api/v1/publish-dashboard/summary-v2?range=7\|30\|365` | Start/end snapshots for the window: `totalSubscribersStart/End`, `paidSubscribersStart/End`, `arrStart/End`, `totalViewsStart/End`. Use to compute deltas. |
| GET | `/api/v1/publication/stats/emails/timeseries` | Array of `[YYYY/MM/DD, count]` daily points (~1 year). Used as the subscriber/send series. |
| GET | `/api/v1/publication/stats/growth/sources?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&order_by=users&order_direction=desc` | `{sourceMetrics[], totals[]}`. Each source has nested `metrics[]` (`Traffic`, `Subscribers`, `Revenue`) and a `children[]` tree (e.g. individual Notes). |
| GET | `/api/v1/publication/stats/growth/events?from_date=…&to_date=…` | `{pubEvents[]}` — timeline of posts/events that drove growth. |
| GET | `/api/v1/publication/stats/network_attribution` | `{rows[]}` — subscribers attributed by channel. May be empty. |

## The per-post `stats` object (selected fields)

Delivery: `sent`, `delivered`, `queued`, `dropped`.
Opens: `opens` (total), `opened` (unique), `open_rate` (0–1), `open_rate_free`, `open_rate_paid`.
Clicks: `clicks`, `clicked` (unique), `click_through_rate`, `engagement_rate`.
Reach: `views` (+ `views_free`, `views_paid`).
Social: `shares`.
Funnel: `signups`, `subscribes`, `unsubscribes`, and their `*_within_1_day` variants.
Podcast/video: `downloads*`, `video_views`, `video_minutes_watched`.
Breakdowns (only in `post_management/detail`): `firstWeekDailyStats[]` (7 daily
snapshots with `views`, `cumulative_views`, `signups`), `referrers.sources[]`
(`{source, views, percent_of_total_views}`), `links[]` (`[url, clicks]`), and
`comps` (averages over comparable posts: `avg_views`, `avg_open_rate`,
`avg_click_through_rate`, `avg_likes`, `avg_comments`, `avg_signups`, `n_comp_posts`).

## Pacing

No published rate limit; sustained **< 1 request/second** per publication is safe.
`collect.js` sleeps 300–350 ms between calls for this reason. Above ~1/s you may
see HTTP 429.
