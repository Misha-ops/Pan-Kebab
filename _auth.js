// Shared helper — verifies the admin JWT sent by the admin panel.
// The token is issued only by login.js after checking the password hash,
// and is required on every write operation (save-item, upload-image).
const jwt = require("jsonwebtoken");

function requireAdmin(event) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw { status: 500, message: "Chýba env premenná JWT_SECRET na serveri." };
  }
  const header = event.headers.authorization || event.headers.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    throw { status: 401, message: "Chýba prihlasovací token." };
  }
  try {
    const payload = jwt.verify(token, secret);
    if (payload.role !== "admin") throw new Error("wrong role");
    return payload;
  } catch (err) {
    throw { status: 401, message: "Token je neplatný alebo vypršal. Prihláste sa znova." };
  }
}

module.exports = { requireAdmin };
