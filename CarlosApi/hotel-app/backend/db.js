const mysql = require("mysql2");
const db = mysql.createPool(process.env.DATABASE_URL);

db.getConnection((err, connection) => {
  if (err) {
    console.log("Error DB:", err.message);
  } else {
    console.log("Conectado a MySQL - Pool listo");
    connection.release();
  }
});

module.exports = db;