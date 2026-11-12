export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);

    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") || 200), 1),
      1000
    );

    const result = await context.env.DB.prepare(
      "SELECT * FROM alerts ORDER BY id DESC LIMIT ?"
    ).bind(limit).all();

    return Response.json(result.results);
  } catch (error) {
    return Response.json({
      error: "Failed to fetch alerts",
      details: error.message
    }, { status: 500 });
  }
}
