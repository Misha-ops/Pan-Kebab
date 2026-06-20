// POST /.netlify/functions/reorder-items
// Protected — requires "Authorization: Bearer <token>" issued by login.js.
// Body: { order: ["id1", "id2", "id3", ...] }  — full list of existing ids
// in the new desired order. Rewrites sort_order = position for each.
const { getServiceClient } = require("./_supabase");
const { requireAdmin } = require("./_auth");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    requireAdmin(event);
  } catch (err) {
    return { statusCode: err.status || 401, body: JSON.stringify({ error: err.message }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Neplatná požiadavka." }) };
  }

  const order = body.order;
  if (!Array.isArray(order) || order.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Chýba poradie položiek." }) };
  }

  try {
    const supabase = getServiceClient();

    // Individual UPDATEs (not upsert!) — an upsert would try to construct
    // a full new row for columns we don't send (name, price, ...), which
    // violates their NOT NULL constraints. A plain UPDATE only touches the
    // columns we name and leaves everything else on the existing row alone.
    const results = await Promise.all(
      order.map(function (id, index) {
        return supabase
          .from("menu_items")
          .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
          .eq("id", id);
      })
    );
    const failed = results.find(function (r) { return r.error; });
    if (failed) throw failed.error;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Zmena poradia sa nepodarila.", detail: String(err.message || err) })
    };
  }
};
