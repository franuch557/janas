// Symulacja capability `db` i `user` artefaktu claude.ai (wg db.d.ts 0.2.96).
// Magazyn jest w pamięci procesu testu i wspólny dla wielu kontekstów przeglądarki:
// strona woła funkcje wystawione przez context.exposeFunction, a zmiany są
// wypychane do subskrypcji (onSnapshot) wszystkich podłączonych stron.

export const DOC_LIMIT = 256 * 1024;

export class FakeDb {
  constructor() {
    this.docs = new Map(); // ścieżka → JSON
    this.writes = []; // { t, op, path, size, ctx }
    this.maxSize = 0;
    this.maxSizePath = null;
    this.pages = new Set();
    this.rejected = [];
  }

  collectionDocs(col) {
    const out = [];
    for (const [p, json] of this.docs) {
      const i = p.lastIndexOf('/');
      if (p.slice(0, i) === col) out.push({ id: p.slice(i + 1), json });
    }
    return out.sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  async handle(ctxName, op, path, body) {
    const now = Date.now();
    if (op === 'get') return this.docs.get(path) ?? null;
    if (op === 'query') return this.collectionDocs(path);
    if (op === 'set' || op === 'update') {
      const json = JSON.stringify(body);
      const size = Buffer.byteLength(json, 'utf8');
      this.writes.push({ t: now, op, path, size, ctx: ctxName });
      if (size > this.maxSize) {
        this.maxSize = size;
        this.maxSizePath = path;
      }
      if (size > DOC_LIMIT) {
        this.rejected.push({ path, size });
        return { error: { code: 'invalid_argument', message: `document over 256 KiB (${size})` } };
      }
      if (op === 'update') {
        const cur = this.docs.get(path);
        if (!cur) return { error: { code: 'invalid_argument', message: 'update of missing document' } };
        this.docs.set(path, JSON.stringify(deepMerge(JSON.parse(cur), body)));
      } else this.docs.set(path, json);
      this.notify();
      return { ok: true };
    }
    if (op === 'delete') {
      this.writes.push({ t: now, op, path, size: 0, ctx: ctxName });
      this.docs.delete(path);
      this.notify();
      return { ok: true };
    }
    return { error: { code: 'invalid_argument', message: `unknown op ${op}` } };
  }

  notify() {
    for (const p of this.pages) {
      p.evaluate(() => window.__fakeDbChanged && window.__fakeDbChanged()).catch(() => {});
    }
  }

  writesSince(t, ops = ['set', 'update']) {
    return this.writes.filter((w) => w.t >= t && ops.includes(w.op));
  }

  /** Podłącza kontekst przeglądarki: funkcja wystawiona + skrypt startowy. */
  async attach(ctx, ctxName, uid = 'uczen-e2e') {
    await ctx.exposeFunction('__fakeDb', (op, path, body) => this.handle(ctxName, op, path, body));
    await ctx.addInitScript(pageScript, { uid });
    ctx.on('page', (p) => this.track(p));
    for (const p of ctx.pages()) this.track(p);
  }

  track(page) {
    this.pages.add(page);
    page.on('close', () => this.pages.delete(page));
  }
}

function deepMerge(a, b) {
  if (typeof a !== 'object' || a === null || Array.isArray(a) || typeof b !== 'object' || b === null || Array.isArray(b)) return b;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in a ? deepMerge(a[k], v) : v;
  return out;
}

/** Kod wstrzykiwany do strony (addInitScript). */
function pageScript({ uid }) {
  const SEG = /^[A-Za-z0-9_\-.~:@+]+$/;
  const checkPath = (path, wantEven) => {
    const segs = path.split('/');
    if (segs.some((s) => !s || !SEG.test(s) || s === '.' || s === '..')) throw new TypeError(`invalid path segment in ${path}`);
    if ((segs.length % 2 === 0) !== wantEven) throw new TypeError(`wrong segment count (${segs.length}) for ${wantEven ? 'document' : 'collection'}: ${path}`);
  };
  const call = async (op, path, body) => {
    const r = await window.__fakeDb(op, path, body);
    if (r && r.error) throw r.error;
    return r;
  };
  const deepFreeze = (o) => {
    if (o && typeof o === 'object') {
      Object.freeze(o);
      for (const v of Object.values(o)) deepFreeze(v);
    }
    return o;
  };
  const meta = { fromCache: false, hasPendingWrites: false };
  const snapDoc = (id, json) => {
    const body = json == null ? undefined : deepFreeze(JSON.parse(json));
    return { id, exists: json != null, data: () => body, metadata: meta };
  };
  const subs = new Set();
  window.__fakeDbChanged = () => {
    for (const s of subs) s();
  };
  const cmp = (op, a, v) => {
    switch (op) {
      case '==': return a === v;
      case '!=': return a !== undefined && a !== v; // jak Firestore: brak pola nie pasuje
      case '<': return a < v;
      case '<=': return a <= v;
      case '>': return a > v;
      case '>=': return a >= v;
      case 'in': return v.includes(a);
      case 'not-in': return a !== undefined && !v.includes(a);
      case 'array-contains': return Array.isArray(a) && a.includes(v);
      default: throw { code: 'invalid_argument', message: `bad op ${op}` };
    }
  };
  const makeQuery = (path, filters = [], order = null, lim = null) => {
    const run = async () => {
      let rows = (await call('query', path)).map((r) => ({ id: r.id, json: r.json, body: JSON.parse(r.json) }));
      rows = rows.filter((r) => filters.every(([f, op, v]) => cmp(op, r.body[f], v)));
      if (order) rows.sort((a, b) => ((a.body[order[0]] ?? Infinity) < (b.body[order[0]] ?? Infinity) ? -1 : 1) * (order[1] === 'desc' ? -1 : 1));
      if (lim) rows = rows.slice(0, lim);
      const docs = rows.map((r) => snapDoc(r.id, r.json));
      return { docs, size: docs.length, empty: docs.length === 0, docChanges: () => docs.map((d, i) => ({ type: 'added', doc: d, oldIndex: -1, newIndex: i })), metadata: meta };
    };
    const q = {
      where: (f, op, v) => {
        if (filters.length >= 10) throw { code: 'invalid_argument', message: 'too many filters' };
        return makeQuery(path, [...filters, [f, op, v]], order, lim);
      },
      orderBy: (f, dir = 'asc') => makeQuery(path, filters, [f, dir], lim),
      limit: (n) => makeQuery(path, filters, order, n),
      get: run,
      onSnapshot: (next, error) => {
        let alive = true;
        let last = null;
        const deliver = async () => {
          if (!alive) return;
          try {
            const s = await run();
            const key = JSON.stringify(s.docs.map((d) => [d.id, d.data()]));
            if (key === last) return;
            last = key;
            if (alive) next(s);
          } catch (e) {
            if (alive && error) error(e);
          }
        };
        subs.add(deliver);
        window.__fakeDbSubs = (window.__fakeDbSubs ?? 0) + 1;
        setTimeout(deliver, 50);
        return () => {
          alive = false;
          subs.delete(deliver);
          window.__fakeDbSubs -= 1;
        };
      },
    };
    return q;
  };
  const docRef = (path) => {
    checkPath(path, true);
    return {
      id: path.split('/').pop(),
      path,
      get: async () => snapDoc(path.split('/').pop(), await call('get', path)),
      set: async (d) => {
        if (typeof d !== 'object' || d === null || Array.isArray(d)) throw { code: 'invalid_argument', message: 'body must be object' };
        await call('set', path, JSON.parse(JSON.stringify(d)));
      },
      update: async (d) => {
        await call('update', path, JSON.parse(JSON.stringify(d)));
      },
      delete: async () => {
        await call('delete', path);
      },
      collection: (sub) => colRef(`${path}/${sub}`),
      onSnapshot: (next, error) => {
        let alive = true;
        const deliver = async () => {
          if (!alive) return;
          try {
            next(snapDoc(path.split('/').pop(), await call('get', path)));
          } catch (e) {
            if (error) error(e);
          }
        };
        subs.add(deliver);
        setTimeout(deliver, 50);
        return () => {
          alive = false;
          subs.delete(deliver);
        };
      },
    };
  };
  const colRef = (path) => {
    checkPath(path, false);
    const q = makeQuery(path);
    return { ...q, path, doc: (id) => docRef(`${path}/${id ?? Math.random().toString(36).slice(2)}`), add: async (d) => { const r = docRef(`${path}/${Math.random().toString(36).slice(2)}`); await r.set(d); return r; } };
  };
  const db = { doc: docRef, collection: colRef };
  const user = { id: async () => uid, can: async () => true, canEdit: async () => true, isOwner: async () => true };
  window.claude = { use: async (name) => (name === 'db' ? db : name === 'user' ? user : null) };
}
