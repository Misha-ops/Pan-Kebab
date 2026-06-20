// POST /.netlify/functions/track-visit
// Public, fire-and-forget — called once per page load on the main site
// (never on /admin, so admin's own visits don't skew the count). Records
// one page view for "today" (UTC date) in Supabase. Failures here should
// never be visible to the visitor, so the frontend ignores errors.
const { getServiceClient } = require("./_supabase");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const supabase = getServiceClient();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const { error } = await supabase.rpc("increment_visit_count", { target_date: today });
    if (error) throw error;

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    // Visit tracking is non-critical — never let it surface as a real error to anyone.
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false }) };
  }
};
