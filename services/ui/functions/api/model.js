export async function onRequest({ env }) {
  try {
    const result = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = ?"
    ).bind("model_meta").first();

    if (result?.value) {
      return Response.json(JSON.parse(result.value));
    }

    return Response.json({
      model: "FraudShield ML Model",
      f1: 0,
      pr_auc: 0,
      threshold: 0.6661,
      n_train: 0,
      n_test: 0,
      fraud_rate_pct: 0,
      metadata_status: "unavailable"
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
