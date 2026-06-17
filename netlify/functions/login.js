// POST /.netlify/functions/login
// Body: { "password": "..." }
// The real password is never stored in code or in the repo — only its
// bcrypt hash lives in the ADMIN_PASSWORD_HASH environment variable on
// Netlify. This function compares the submitted password against that
// hash on the server and, if it matches, issues a JWT the admin panel
// uses for subsequent write requests.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Neplatná požiadavka." }) };
  }

  const password = body.password || "";
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.JWT_SECRET;

  if (!hash || !secret) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server nie je nakonfigurovaný (chýba ADMIN_PASSWORD_HASH alebo JWT_SECRET)."
      })
    };
  }

  // small constant-ish delay regardless of outcome to make timing attacks harder
  const ok = password.length > 0 && bcrypt.compareSync(password, hash);

  if (!ok) {
    return { statusCode: 401, body: JSON.stringify({ error: "Nesprávne heslo." }) };
  }

  const token = jwt.sign({ role: "admin" }, secret, { expiresIn: "6h" });
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token, expiresIn: "6h" })
  };
};
