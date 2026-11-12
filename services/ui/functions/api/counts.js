export async function onRequest(context) {
  try {
    const result = await context.env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM transactions) AS total_transactions,
        (SELECT COUNT(*) FROM alerts) AS total_alerts
    `).first();

    return Response.json({
      total_transactions: result.total_transactions,
      total_alerts: result.total_alerts
    });
  } catch (error) {
    return Response.json({
      error: "Failed to fetch counts",
      details: error.message
    }, { status: 500 });
  }
}
