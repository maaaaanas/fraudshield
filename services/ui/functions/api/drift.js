export async function onRequest({ env }) {
  try {
    const result = await env.DB.prepare(
      "SELECT prob, is_alert FROM transactions ORDER BY id DESC LIMIT 100"
    ).all();

    const rows = result.results || [];
    const count = rows.length;

    if (!count) {
      return Response.json({
        drift_status: "no_data",
        window_size: 0,
        drift_ratio: 0,
        rolling_alert_rate: 0,
        baseline_fraud_rate: 0.02,
        mean_score: 0,
        p95_score: 0
      });
    }

    const scores = rows.map(row => Number(row.prob) || 0).sort((a, b) => a - b);
    const alerts = rows.filter(row => Number(row.is_alert) === 1).length;
    const rate = alerts / count;
    const baseline = 0.02;
    const ratio = rate / baseline;

    return Response.json({
      drift_status: ratio >= 3 ? "high" : ratio >= 1.5 ? "elevated" : "stable",
      window_size: count,
      drift_ratio: ratio,
      rolling_alert_rate: rate,
      baseline_fraud_rate: baseline,
      mean_score: scores.reduce((sum, value) => sum + value, 0) / count,
      p95_score: scores[Math.min(count - 1, Math.floor(count * 0.95))]
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
