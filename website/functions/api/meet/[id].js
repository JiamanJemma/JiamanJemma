/**
 * Cloudflare Pages Function — 约时间小工具房间存储
 * GET  /api/meet/:id          → 读取房间
 * POST /api/meet/:id          → 更新某人时段 / 设置 config / 删除某人
 *   body: { name, slots, config?, deleteName? }
 * KV binding: MEET
 */

const CORS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'cache-control': 'no-store',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const id = String(params.id || '');

  if (!/^[a-z0-9]{4,16}$/i.test(id)) return json({ error: 'bad room id' }, 400);
  if (!env.MEET) return json({ error: 'KV binding MEET not configured' }, 500);

  const key = 'room:' + id;

  if (request.method === 'GET') {
    const data = await env.MEET.get(key, 'json');
    return json(data || null);
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'bad json' }, 400); }

    const existing = (await env.MEET.get(key, 'json')) || {
      config: null,
      people: {},
      createdAt: Date.now(),
    };

    // 首次创建时设置 config（不可后改，避免数据错位）
    if (body.config && !existing.config) {
      const c = body.config;
      if (typeof c.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.startDate)) {
        return json({ error: 'bad startDate' }, 400);
      }
      const days = Number(c.days);
      if (!Number.isFinite(days) || days < 1 || days > 14) return json({ error: 'bad days' }, 400);
      existing.config = { startDate: c.startDate, days: Math.floor(days) };
    }

    if (body.deleteName && typeof body.deleteName === 'string') {
      delete existing.people[body.deleteName];
    }

    if (body.name && typeof body.name === 'string' && typeof body.slots === 'string') {
      const name = body.name.trim().slice(0, 16);
      if (!name) return json({ error: 'bad name' }, 400);
      if (body.slots.length > 4000) return json({ error: 'slots too long' }, 400);
      existing.people[name] = body.slots; // base64 of Uint8Array
    }

    // 限制总大小（粗略）
    if (Object.keys(existing.people).length > 50) return json({ error: 'too many people' }, 400);

    existing.updatedAt = Date.now();
    await env.MEET.put(key, JSON.stringify(existing), {
      expirationTtl: 60 * 60 * 24 * 60, // 60 天后自动清理
    });
    return json(existing);
  }

  return json({ error: 'method not allowed' }, 405);
}
