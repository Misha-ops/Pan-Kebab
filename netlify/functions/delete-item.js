// POST /.netlify/functions/delete-item
// Protected — requires "Authorization: Bearer <token>" issued by login.js.
// Body: { id }
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

  const id = body.id;
  if (!id) return { statusCode: 400, body: JSON.stringify({ error: "Chýba id." }) };

  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) throw error;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Vymazanie sa nepodarilo.", detail: String(err.message || err) })
    };
  }
};
