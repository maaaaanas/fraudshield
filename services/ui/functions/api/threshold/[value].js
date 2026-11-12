export async function onRequest({ request, env, params }) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const value = Number(params.value);

    if (!Number.isFinite(value) || value < 0.05 || value > 0.99) {
      return Response.json(
        { error: "Threshold must be between 0.05 and 0.99" },
        { status: 400 }
      );
    }

    await env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).bind("threshold", value).run();

    return Response.json({ ok: true, threshold: value });
  } catch (error) {
    return Response.json({
      error: "Threshold operation failed",
      details: error.message
    }, { status: 500 });
  }
}