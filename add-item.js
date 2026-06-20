// POST /.netlify/functions/add-item
// Protected — requires "Authorization: Bearer <token>" issued by login.js.
// Body: { name, price, description, meat_options, category }
// Generates a unique id from the name and appends the item at the end
// of the current sort order, with a generic "no photo yet" placeholder.
const { getServiceClient } = require("./_supabase");
const { requireAdmin } = require("./_auth");

function slugify(str) {
  return (
    String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "")
      .slice(0, 40) || "polozka"
  );
}

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

  const name = String(body.name || "").trim();
  const priceNum = Number(body.price);
  if (!name) return { statusCode: 400, body: JSON.stringify({ error: "Chýba názov." }) };
  if (Number.isNaN(priceNum) || priceNum < 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Cena musí byť kladné číslo." }) };
  }

  try {
    const supabase = getServiceClient();

    const { data: existing, error: maxError } = await supabase
      .from("menu_items")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    if (maxError) throw maxError;
    const nextSort = existing && existing[0] ? existing[0].sort_order + 1 : 1;

    const base = slugify(name);
    let id = base;
    let lastError = null;

    for (let attempt = 0; attempt < 6; attempt++) {
      const candidateId = attempt === 0 ? base : base + "-" + (attempt + 1);
      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          id: candidateId,
          category: String(body.category || "Kebab").slice(0, 60),
          name: name.slice(0, 120),
          description: String(body.description || "").slice(0, 500),
          price: priceNum,
          meat_options: body.meat_options ? String(body.meat_options).slice(0, 120) : null,
          image_url: "assets/img/placeholder-generic.svg",
          is_placeholder: true,
          sort_order: nextSort
        })
        .select()
        .single();

      if (!error) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ok: true, item: data })
        };
      }
      lastError = error;
      if (error.code !== "23505") break; // anything other than "id already exists" — stop retrying
      id = candidateId;
    }

    throw lastError || new Error("Nepodarilo sa vytvoriť jedinečné id.");
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Vytvorenie položky sa nepodarilo.", detail: String(err.message || err) })
    };
  }
};
