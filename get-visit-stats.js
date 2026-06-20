// GET /.netlify/functions/get-visit-stats?days=30
// Protected — requires "Authorization: Bearer <token>" issued by login.js.
// Returns the last N days of page-view counts, oldest first, including
// zero-filled days that had no visits at all (so the chart has no gaps).
const { getServiceClient } = require("./_supabase");
const { requireAdmin } = require("./_auth");

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    requireAdmin(event);
  } catch (err) {
    return { statusCode: err.status || 401, body: JSON.stringify({ error: err.message }) };
  }

  const params = event.queryStringParameters || {};
  let days = parseInt(params.days, 10);
  if (!Number.isFinite(days) || days < 1) days = 30;
  if (days > 90) days = 90;

  try {
    const supabase = getServiceClient();

    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const startStr = start.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("visit_stats")
      .select("visit_date, count")
      .gte("visit_date", startStr)
      .order("visit_date", { ascending: true });
    if (error) throw error;

    const byDate = {};
    (data || []).forEach(function (row) { byDate[row.visit_date] = row.count; });

    const series = [];
    let total = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const count = byDate[key] || 0;
      total += count;
      series.push({ date: key, count: count });
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: series, total: total })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Nepodarilo sa načítať návštevnosť.", detail: String(err.message || err) })
    };
  }
};
