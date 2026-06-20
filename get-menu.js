// GET /.netlify/functions/get-menu
// Public endpoint — no auth required. Returns the live menu from Supabase
// so the main site always shows whatever the admin last saved.
const { getServiceClient } = require("./_supabase");

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30"
      },
      body: JSON.stringify({ items: data })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Nepodarilo sa načítať menu.", detail: String(err.message || err) })
    };
  }
};
