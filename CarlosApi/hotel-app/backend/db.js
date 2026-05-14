const mysql = require("mysql2");

console.log('=== DEBUG ENV VARS ===');
console.log('HOST:', process.env.MYSQL_ADDON_HOST);
console.log('USER:', process.env.MYSQL_ADDON_USER);
console.log('DB:', process.env.MYSQL_ADDON_DB);
console.log('======================');

const db = mysql.createConnection({
  host: process.env.MYSQL_ADDON_HOST,
  user: process.env.MYSQL_ADDON_USER,
  password: process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.MYSQL_ADDON_DB,
  port: process.env.MYSQL_ADDON_PORT
});

db.connect((err) => {
  if (err) {
    console.error("Error DB:", err);
    return;
  }
  console.log("MySQL conectado a Clever Cloud");
});

module.exports = db;