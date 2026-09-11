#!/usr/bin/env python3
"""Construye dashboard.html a partir de los JSON descargados de Substack.

Uso:
    python3 scripts/build.py <carpeta_datos> [salida.html]

<carpeta_datos> contiene un archivo por publicación (p. ej. substack_my-newsletter.json),
tal como los descarga assets/collect.js desde el navegador. No requiere dependencias externas.
"""
import json, sys, os, glob, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "..", "assets", "template.html")


def num(x, d=0):
    return x if isinstance(x, (int, float)) else d


def build_post(post, det, host):
    s = post.get("stats") or {}
    d = det or {}
    refs = ((d.get("referrers") or {}).get("sources")) or []
    return {
        "id": post.get("id"), "title": post.get("title"), "slug": post.get("slug"),
        "type": post.get("type"), "audience": post.get("audience"), "date": post.get("post_date"),
        "url": f"https://{host}/p/{post.get('slug')}", "cover": post.get("cover_image"),
        "reactions": num(post.get("reaction_count")), "comments": num(post.get("comment_count")),
        "views": num(s.get("views")), "opens": num(s.get("opens")), "opened": num(s.get("opened")),
        "open_rate": num(s.get("open_rate")), "clicks": num(s.get("clicks")), "clicked": num(s.get("clicked")),
        "ctr": num(s.get("click_through_rate")), "sent": num(s.get("sent")), "delivered": num(s.get("delivered")),
        "shares": num(s.get("shares")), "signups": num(s.get("signups")), "subscribes": num(s.get("subscribes")),
        "unsubscribes": num(s.get("unsubscribes")), "signups_1d": num(s.get("signups_within_1_day")),
        "unsubs_1d": num(s.get("unsubscribes_within_1_day")),
        "referrers": refs, "links": d.get("links") or [],
        "daily": [{"dt": x.get("dt"), "views": x.get("views"), "cum": x.get("cumulative_views"),
                   "signups": x.get("signups")} for x in (d.get("firstWeekDailyStats") or [])],
        "comps": ({"views": (d.get("comps") or {}).get("avg_views"),
                   "open_rate": (d.get("comps") or {}).get("avg_open_rate"),
                   "ctr": (d.get("comps") or {}).get("avg_click_through_rate"),
                   "likes": (d.get("comps") or {}).get("avg_likes"),
                   "comments": (d.get("comps") or {}).get("avg_comments"),
                   "signups": (d.get("comps") or {}).get("avg_signups"),
                   "n": (d.get("comps") or {}).get("n_comp_posts")} if d.get("comps") else None),
    }


def growth_sources(gs):
    out = []
    for src in (gs.get("sourceMetrics") if isinstance(gs, dict) else None) or []:
        def total(name):
            for m in src.get("metrics", []):
                if m.get("name") == name:
                    return m.get("total") or 0
            return 0
        out.append({"label": src.get("sourceName") or src.get("source") or "?",
                    "subscribers": total("Subscribers"), "traffic": total("Traffic"),
                    "children": [{"label": (c.get("sourceName") or c.get("source") or "")[:80],
                                  "href": c.get("href"),
                                  "subscribers": next((m.get("total") or 0 for m in c.get("metrics", []) if m.get("name") == "Subscribers"), 0),
                                  "traffic": next((m.get("total") or 0 for m in c.get("metrics", []) if m.get("name") == "Traffic"), 0)}
                                 for c in src.get("children", [])]})
    return out


def load_datasets(data_dir):
    files = sorted(glob.glob(os.path.join(data_dir, "*.json")))
    datasets, notes = [], []
    for f in files:
        if os.path.basename(f) == "index.json":
            continue
        try:
            ds = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        if isinstance(ds, dict) and ds.get("kind") == "notes":
            notes.append(ds)
            continue
        if isinstance(ds, dict) and isinstance(ds.get("posts"), list) and (ds.get("subdomain") or ds.get("host")):
            if not ds.get("subdomain"):
                ds["subdomain"] = str(ds.get("host", "")).split(".")[0]
            datasets.append(ds)
    return datasets, notes


def build(data_dir, out_path):
    datasets, notes_files = load_datasets(data_dir)
    if not datasets:
        raise SystemExit(f"No encontré datasets de Substack en {data_dir}. "
                         "Descarga primero los JSON con assets/collect.js.")
    pubs = []
    for ds in datasets:
        meta = ds.get("publication_meta") or {}
        sub = ds.get("subdomain")
        host = meta.get("custom_domain") or (ds.get("publication") or {}).get("custom_domain") or f"{sub}.substack.com"
        name = meta.get("name") or (ds.get("publication") or {}).get("name") or sub
        details = ds.get("details") or {}
        posts = [build_post(p, details.get(str(p.get("id"))) or details.get(p.get("id")), host) for p in ds["posts"]]
        series = ds.get("subscribers_timeseries") or ds.get("emails_timeseries") or []
        pubs.append({
            "id": (ds.get("publication") or {}).get("id") or meta.get("id"), "name": name, "subdomain": sub,
            "host": host, "fetched_at": ds.get("fetched_at"), "counts": ds.get("counts"),
            "summary": ds.get("summary"), "summary_v2": ds.get("summary_v2"),
            "subscribers_ts": series, "growth_sources": growth_sources(ds.get("growth_sources") or {}),
            "growth_events": (ds.get("growth_events") or {}).get("pubEvents") or [],
            "attribution": (ds.get("network_attribution") or {}).get("rows") or [],
            "geo": [{"code": r.get("location"), "value": r.get("value")}
                    for r in (ds.get("geo") if isinstance(ds.get("geo"), list) else [])
                    if r.get("location") and (r.get("value") or 0) > 0],
            "geo_total": ((ds.get("geo_total") or {}).get("global") or {}).get("total"),
            "posts": posts,
        })
    # Publicación principal primero (más suscriptores)
    pubs.sort(key=lambda p: (p.get("summary") or {}).get("totalEmail") or 0, reverse=True)
    # Las notas pertenecen a la cuenta, no a una publicación concreta.
    all_notes = [n for f in notes_files for n in (f.get("notes") or [])]
    payload = {"generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
               "user": (notes_files[0].get("user") if notes_files else None),
               "publications": pubs, "notes": all_notes or None,
               "primary_publication_id": next((f.get("primary_publication_id") for f in notes_files
                                               if f.get("primary_publication_id")), None)}
    template = open(TEMPLATE, encoding="utf-8").read()
    blob = json.dumps(payload, ensure_ascii=False).replace("</script", "<\\/script")
    html = template.replace("/*__DATA__*/null", blob)
    open(out_path, "w", encoding="utf-8").write(html)
    total_posts = sum(len(p["posts"]) for p in pubs)
    print(f"{out_path} generado: {len(pubs)} publicaciones, {total_posts} posts")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    data_dir = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(data_dir, "dashboard.html")
    build(data_dir, out)
