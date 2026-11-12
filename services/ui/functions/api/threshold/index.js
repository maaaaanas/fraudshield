export async function onRequest({ env }) {
  try {
    const result = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = ?"
    ).bind("threshold").first();

    return Response.json({
      threshold: result ? Number(result.value) : 0.6661
    });
  } catch (error) {
    return Response.json({
      error: "Threshold operation failed",
      details: error.message
    }, { status: 500 });
  }
}