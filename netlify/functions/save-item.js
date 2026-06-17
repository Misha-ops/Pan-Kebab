// POST /.netlify/functions/save-item
// Protected — requires "Authorization: Bearer <token>" issued by login.js.
// Updates the editable text fields of one menu item in Supabase.
const { getServiceClient } = require("./_supabase");
const { requireAdmin } = require("./_auth");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST" && event.httpMethod !== "PUT") {
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

  const { id, name, description, price, meat_options } = body;

  if (!id || !name || price === undefined || price === null) {
    return { statusCode: 400, body: JSON.stringify({ error: "Chýba id, name alebo price." }) };
  }
  const priceNum = Number(price);
  if (Number.isNaN(priceNum) || priceNum < 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Cena musí byť kladné číslo." }) };
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("menu_items")
      .update({
        name: String(name).slice(0, 120),
        description: String(description || "").slice(0, 500),
        price: priceNum,
        meat_options: meat_options ? String(meat_options).slice(0, 120) : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, item: data })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Uloženie sa nepodarilo.", detail: String(err.message || err) })
    };
  }
};
