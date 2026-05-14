const mysql = require("mysql2");
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root", 
  database: "dbhotel"
});
db.connect((err) => {
  if (err) {
    console.error("Error MySQL:", err);
    return;
  }
  console.log("MySQL conectado");
});
module.exports = db;