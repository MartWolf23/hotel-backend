const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Verificar conexión al arrancar
db.getConnection((err, connection) => {
  if (err) {
    console.log("Error DB:", err.code);
    console.log("Error DB:", err.message);
  } else {
    console.log("Conectado a MySQL - Pool listo");
    connection.release();
  }
});

module.exports = db;