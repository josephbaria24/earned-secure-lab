// Admin audio upload. Runs on Supabase — no server to host.
// Secrets (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
//   BUNNY_STORAGE_ZONE
//   BUNNY_STORAGE_ACCESS_KEY
//   BUNNY_STORAGE_HOST   (optional, default storage.bunnycdn.com)
//   BUNNY_CDN_URL        (https://yourzone.b-cdn.net)

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-file-name',
  'access-control-allow-methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}

function safeName(name: string | null) {
  const base = (name || 'session.mp3').split(/[/\\]/).pop()!.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${Date.now()}-${base || 'session.mp3'}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Sign in required' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return json({ error: 'Function is missing Supabase env' }, 500);

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: anonKey },
  });
  if (!userRes.ok) return json({ error: 'Sign in required' }, 401);
  const user = await userRes.json();

  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: { Authorization: authHeader, apikey: anonKey } },
  );
  const profiles = profileRes.ok ? await profileRes.json() : [];
  if (profiles?.[0]?.role !== 'admin') return json({ error: 'Admin only' }, 403);

  const zone = Deno.env.get('BUNNY_STORAGE_ZONE');
  const accessKey = Deno.env.get('BUNNY_STORAGE_ACCESS_KEY');
  const storageHost = Deno.env.get('BUNNY_STORAGE_HOST') || 'storage.bunnycdn.com';
  const cdnUrl = (Deno.env.get('BUNNY_CDN_URL') || '').replace(/\/+$/, '');
  if (!zone || !accessKey || !cdnUrl) {
    return json({ error: 'Set Bunny secrets on this Edge Function' }, 500);
  }

  const body = new Uint8Array(await req.arrayBuffer());
  if (!body.byteLength) return json({ error: 'Choose an audio file first.' }, 400);

  const remotePath = `audio/${safeName(req.headers.get('x-file-name'))}`;
  const upload = await fetch(`https://${storageHost}/${zone}/${remotePath}`, {
    method: 'PUT',
    headers: { AccessKey: accessKey, 'Content-Type': 'application/octet-stream' },
    body,
  });

  if (!upload.ok) {
    const detail = await upload.text();
    return json({ error: `Bunny upload failed (${upload.status}). ${detail.slice(0, 180)}` }, 502);
  }

  return json({ url: `${cdnUrl}/${remotePath}`, path: remotePath });
});
