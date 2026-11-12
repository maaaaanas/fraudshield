function json(data, status = 200) {
  return Response.json(data, { status });
}

function text(value) {
  return value == null ? null : String(value);
}

function number(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function jsonText(value) {
  if (value == null) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

export async function onRequestPost({ request, env }) {
  try {
    // Authenticate the stream processor.
    const expectedToken = env.INGEST_TOKEN;
    const suppliedToken = request.headers.get("Authorization") || "";

    if (!expectedToken || suppliedToken !== `Bearer ${expectedToken}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await request.json();

    const transactions = body.transactions || [];
    const alerts = body.alerts || [];

    if (!Array.isArray(transactions) || !Array.isArray(alerts)) {
      return json({ error: "transactions and alerts must be arrays" }, 400);
    }

    if (transactions.length > 100 || alerts.length > 100) {
      return json({ error: "Maximum 100 records per array" }, 400);
    }

    const statements = [];

    for (const item of transactions) {
      if (!item || !item.transaction_id) {
        return json({ error: "Every transaction needs transaction_id" }, 400);
      }

      statements.push(
        env.DB.prepare(`
          INSERT INTO transactions (
            ts, prob, transaction_id, customer_id, merchant,
            location, device_id, scenario, amount, is_alert, raw_data
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(transaction_id) DO UPDATE SET
            ts = excluded.ts,
            prob = excluded.prob,
            customer_id = excluded.customer_id,
            merchant = excluded.merchant,
            location = excluded.location,
            device_id = excluded.device_id,
            scenario = excluded.scenario,
            amount = excluded.amount,
            is_alert = excluded.is_alert,
            raw_data = excluded.raw_data
        `).bind(
          text(item.ts),
          number(item.prob),
          text(item.transaction_id),
          text(item.customer_id),
          text(item.merchant),
          text(item.location),
          text(item.device_id),
          text(item.scenario),
          number(item.amount),
          item.is_alert ? 1 : 0,
          jsonText(item.raw_data)
        )
      );
    }

    for (const item of alerts) {
      if (!item || !item.transaction_id) {
        return json({ error: "Every alert needs transaction_id" }, 400);
      }

      statements.push(
        env.DB.prepare(`
          INSERT INTO alerts (
            ts, prob, amount, transaction_id, customer_id,
            merchant, location, device_id, severity, features, shap
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(transaction_id) DO UPDATE SET
            ts = excluded.ts,
            prob = excluded.prob,
            amount = excluded.amount,
            customer_id = excluded.customer_id,
            merchant = excluded.merchant,
            location = excluded.location,
            device_id = excluded.device_id,
            severity = excluded.severity,
            features = excluded.features,
            shap = excluded.shap
        `).bind(
          text(item.ts),
          number(item.prob),
          number(item.amount),
          text(item.transaction_id),
          text(item.customer_id),
          text(item.merchant),
          text(item.location),
          text(item.device_id),
          text(item.severity),
          jsonText(item.features),
          jsonText(item.shap)
        )
      );
    }

    if (statements.length > 0) {
      await env.DB.batch(statements);
    }

    return json({
      status: "success",
      transactions_received: transactions.length,
      alerts_received: alerts.length
    });
  } catch (error) {
    return json({
      error: "Ingestion failed",
      details: error.message
    }, 500);
  }
}
