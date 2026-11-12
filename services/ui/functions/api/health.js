export async function onRequest(context) {
  try {
    const result = await context.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    ).all();

    return Response.json({
      status: "success",
      message: "FraudShield D1 database connected",
      tables: result.results
    });
  } catch (error) {
    return Response.json({
      status: "error",
      message: error.message
    }, { status: 500 });
  }
}
