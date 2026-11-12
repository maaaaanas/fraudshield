export async function onRequest(context) {
  try {
    const limit = Math.min(
      Math.max(Number(context.request.url
        ? new URL(context.request.url).searchParams.get("limit") || 200
        : 200), 1),
      1000
    );

    const result = await context.env.DB.prepare(
      "SELECT * FROM transactions ORDER BY id DESC LIMIT ?"
    ).bind(limit).all();

    return Response.json(result.results);
  } catch (error) {
    return Response.json({
      error: "Failed to fetch transactions",
      details: error.message
    }, { status: 500 });
  }
}
