// Recolector de las Notas del autor. Se ejecuta UNA vez, en https://substack.com
// (las notas pertenecen a la cuenta, no a una publicación concreta).
// Descarga substack_notes.json a la carpeta de descargas del navegador.
//
// Substack no expone el número de vistas de una nota por esta vía; lo que sí da son
// reacciones, restacks y respuestas, que es con lo que se mide aquí.
(async () => {
  const get = async (u) => {
    const r = await fetch(u, { credentials: 'include', headers: { Accept: 'application/json' } });
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { __status: r.status }; }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const me = await get('/api/v1/user/profile/self');
  if (!me || me.__status) throw new Error('sin sesión en substack.com');
  let cursor = null, notes = [], pages = 0;
  do {
    const url = `/api/v1/reader/feed/profile/${me.id}` + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : '');
    const j = await get(url);
    if (j.__status) throw new Error(`feed devolvió ${j.__status}`);
    for (const it of j.items || []) {
      const c = it.comment;
      if (!c || c.user_id !== me.id) continue;   // deja fuera restacks de otros
      notes.push({
        id: c.id, date: c.date, body: c.body || '',
        reactions: c.reaction_count || 0, restacks: c.restacks || 0, replies: c.children_count || 0,
        attachments: (c.attachments || []).length,
        url: `https://substack.com/@${me.handle}/note/c-${c.id}`,
        publication_id: c.publication_id || null,
      });
    }
    cursor = j.nextCursor; pages++;
    await sleep(350);
  } while (cursor && pages < 40);
  const ds = {
    kind: 'notes', fetched_at: new Date().toISOString(), source: 'skill',
    user: { id: me.id, handle: me.handle, name: me.name },
    primary_publication_id: (me.primaryPublication && me.primaryPublication.id) || null,
    notes,
  };
  const body = JSON.stringify(ds);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  a.download = 'substack_notes.json';
  document.body.appendChild(a); a.click(); a.remove();
  return { notes: notes.length, pages, bytes: body.length };
})();
