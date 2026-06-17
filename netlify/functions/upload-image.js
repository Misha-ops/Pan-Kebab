// POST /.netlify/functions/upload-image
// Protected — requires "Authorization: Bearer <token>" issued by login.js.
// Body: { id, content_base64, content_type }
// Uploads the photo to the Supabase Storage bucket "menu-images" (overwriting
// any previous photo for that item), then points menu_items.image_url at it.
const { getServiceClient } = require("./_supabase");
const { requireAdmin } = require("./_auth");

const BUCKET = "menu-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

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

  const { id, content_base64, content_type } = body;
  const ext = ALLOWED[content_type];

  if (!id || !content_base64 || !ext) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Chýba id alebo nepodporovaný formát obrázka (povolené: jpg, png, webp)." })
    };
  }

  const buffer = Buffer.from(content_base64, "base64");
  if (buffer.length > MAX_BYTES) {
    return { statusCode: 400, body: JSON.stringify({ error: "Obrázok je príliš veľký (max 5 MB)." }) };
  }

  try {
    const supabase = getServiceClient();
    const path = id + "." + ext;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: content_type, upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const imageUrl = publicUrlData.publicUrl + "?v=" + Date.now(); // cache-bust

    const { data, error: updateError } = await supabase
      .from("menu_items")
      .update({ image_url: imageUrl, is_placeholder: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (updateError) throw updateError;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, item: data })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Nahranie obrázka sa nepodarilo.", detail: String(err.message || err) })
    };
  }
};
