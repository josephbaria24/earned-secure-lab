const headers = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Supabase environment is missing' }),
      { status: 500, headers },
    );
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/articles?select=id&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Database returned ${response.status}`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        database: 'reachable',
        checked_at: new Date().toISOString(),
      }),
      { status: 200, headers },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Ping failed',
      }),
      { status: 503, headers },
    );
  }
});
