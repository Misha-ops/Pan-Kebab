// Usage: node scripts/hash-password.js "novéHeslo123"
// Prints a bcrypt hash to paste into the ADMIN_PASSWORD_HASH env variable
// on Netlify. The plaintext password is never stored anywhere — only this
// hash is, and only the hash ever touches the server.
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error('Použitie: node scripts/hash-password.js "noveHeslo"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log("\nADMIN_PASSWORD_HASH=" + hash + "\n");
console.log("Skopírujte tento riadok do Netlify -> Site settings -> Environment variables,");
console.log("nahraďte pôvodnú hodnotu ADMIN_PASSWORD_HASH a znova nasaďte (redeploy) site.\n");
