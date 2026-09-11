// Recolector de estadísticas de UNA publicación de Substack.
// Cómo se usa (lo hace Claude): navegar a https://<subdominio>.substack.com/publish/home
// con la sesión iniciada y ejecutar este script en la consola/página. Descarga
// substack_<subdominio>.json a la carpeta de descargas del navegador.
(async () => {
  const get = async (u) => {
    const r = await fetch(u, { credentials: 'include', headers: { Accept: 'application/json' } });
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { __status: r.status, __text: t.slice(0, 300) }; }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const today = new Date().toISOString().slice(0, 10);
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const subdomain = location.host.split('.')[0];
  const ds = { fetched_at: new Date().toISOString(), host: location.host, subdomain, source: 'skill' };
  ds.publication = await get('/api/v1/publication');
  let posts = [], offset = 0, total = 0;
  do {
    const p = await get(`/api/v1/post_management/published?offset=${offset}&limit=50&order_by=post_date&order_direction=desc`);
    if (p.__status) throw new Error(`published devolvió ${p.__status} — ¿sesión iniciada en esta publicación?`);
    total = p.total || 0; posts = posts.concat(p.posts || []); offset += 50; await sleep(300);
  } while (posts.length < total && offset < 5000);
  ds.posts = posts.map((p) => { const { draftBylines, publishedBylines, ...rest } = p; return rest; });
  ds.counts = await get('/api/v1/post_management/counts');
  ds.summary = await get('/api/v1/publish-dashboard/summary');
  ds.summary_v2 = {};
  for (const r of [7, 30, 365]) { ds.summary_v2[r] = await get(`/api/v1/publish-dashboard/summary-v2?range=${r}`); await sleep(200); }
  ds.subscribers_timeseries = await get('/api/v1/publication/stats/emails/timeseries');
  ds.growth_sources = await get(`/api/v1/publication/stats/growth/sources?from_date=${yearAgo}&to_date=${today}&order_by=users&order_direction=desc`);
  ds.growth_events = await get(`/api/v1/publication/stats/growth/events?from_date=${yearAgo}&to_date=${today}`);
  // time_window e is_subscribed son obligatorios: sin ellos la ruta responde 400.
  ds.network_attribution = await get('/api/v1/publication/stats/network_attribution?time_window=90%20days&is_subscribed=false');
  // Suscriptores por país (códigos ISO 3166-1 alfa-2) y su total.
  ds.geo = await get('/api/v1/publication/stats/audience_insights/location?metric=free%20signups&granularity=global');
  ds.geo_total = await get('/api/v1/publication/stats/audience_insights/location/total');

  // Tabla por post mucho más rica que post_management/published (~50 campos frente
  // a 27): incluye subscribers_finished_post (lectura completa), unique_opens_day7
  // y day28, restacks, el embudo de pago desglosado y section_name/tags ya cruzados.
  // Ojo: limit tiene tope 20 — valores mayores responden 400.
  {
    const rows = []; let off = 0, tot = 0;
    do {
      const r = await get(`/api/v1/publication/stats/email_stats?offset=${off}&limit=20&order_by=post_date&order_direction=desc`);
      if (r.__status) { ds.email_stats = { rows, total: tot, __status: r.__status }; break; }
      const page = r.rows || [];
      tot = r.total || 0; rows.push(...page); off += 20;
      ds.email_stats = { rows, total: tot };
      if (!page.length) break; // página vacía: no seguir paginando contra un total inflado
      await sleep(300);
    } while (rows.length < tot && off < 2000);
  }
  // Publicaciones que comparten lectores con esta (% de solape). El tope es 25, y
  // cada fila trae el objeto publicación completo (144 campos), así que se recorta
  // a lo identificativo para no inflar el dataset medio mega por publicación.
  const overlap = await get('/api/v1/publication/stats/audience_insights/overlap?limit=25');
  ds.audience_overlap = Array.isArray(overlap)
    ? overlap.map(({ percentOverlap, pub }) => ({
        percentOverlap,
        id: pub && pub.id,
        name: pub && pub.name,
        subdomain: pub && pub.subdomain,
        custom_domain: pub && pub.custom_domain,
        logo_url: pub && pub.logo_url,
        author_name: pub && pub.author_name,
        language: pub && pub.language,
      }))
    : overlap;
  ds.details = {};
  for (const p of ds.posts) {
    const d = await get(`/api/v1/post_management/detail/${p.id}?offset=0&limit=1`);
    const s = (d && d.posts && d.posts[0] && d.posts[0].stats) || {};
    const daily = (s.firstWeekDailyStats || []).map(({ comps, ...day }) => day);
    ds.details[p.id] = { firstWeekDailyStats: daily, referrers: s.referrers, links: s.links, has_more_links: s.has_more_links, comps: s.comps };
    await sleep(350);
  }
  const body = JSON.stringify(ds);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  a.download = `substack_${subdomain}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  return { subdomain, posts: ds.posts.length, email_stats: (ds.email_stats && ds.email_stats.rows || []).length,
           overlap: (ds.audience_overlap || []).length,
           subscribers: ds.summary && ds.summary.totalEmail, bytes: body.length };
})();
