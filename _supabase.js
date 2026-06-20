// Shared helper — creates a Supabase client using the SERVICE ROLE key.
// This key has full read/write access and must NEVER be sent to the browser.
// It only ever lives here, inside a Netlify Function running on the server.
const { createClient } = require("@supabase/supabase-js");

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Chýbajú env premenné SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (nastavte ich v Netlify -> Site settings -> Environment variables)."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false }
  });
}

module.exports = { getServiceClient };
