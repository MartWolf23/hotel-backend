const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false  // Esto es clave para Clever Cloud
  }
});

db.getConnection((err, connection) => {
  if (err) {
    console.log("Error DB:", err.message);
  } else {
    console.log("Conectado a MySQL - Pool listo");
    connection.release();
  }
});

module.exports = db;