const express = require("express");
const router = express.Router();
const db = require("../db");

// OBTENER HABITACIONES
router.get("/", (req, res) => {

  db.query(
    "SELECT * FROM habitaciones",
    (err, data) => {

      if (err) {
        return res.status(500).json(err);
      }

      res.json(data);
    }
  );
});

// CREAR HABITACION
router.post("/", (req, res) => {

  const { numero, tipo, precio } = req.body;

  const sql = `
    INSERT INTO habitaciones
    (numero, tipo, precio)
    VALUES (?, ?, ?)
  `;

  db.query(
    sql,
    [numero, tipo, precio],

    (err, result) => {

      if (err) {

        console.log(err);

        return res.status(500).json(err);
      }

      res.json({
        mensaje: "Habitación creada"
      });
    }
  );
});

// ELIMINAR HABITACION
router.delete("/:id", (req, res) => {

  const { id } = req.params;

  const sql =
      "DELETE FROM habitaciones WHERE id = ?";

  db.query(
    sql,
    [id],

    (err, result) => {

      if (err) {

        console.log(err);

        return res.status(500).json(err);
      }

      res.json({
        mensaje: "Habitación eliminada"
      });
    }
  );
});

module.exports = router;