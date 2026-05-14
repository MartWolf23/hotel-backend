const express = require("express");
const router = express.Router();
const db = require("../db");

// CREAR RESERVA
router.post("/", (req, res) => {
  const { idcliente, numero, tipo, precio, fecha_entrada, fecha_salida } = req.body;

  if (!idcliente || !numero || !tipo || !precio || !fecha_entrada || !fecha_salida) {
    return res.json({ mensaje: "Te falta información por llenar para hacer efectivo el registro" });
  }

  //ESTE VALIDAR CRUCE DE FECHAS
  const sql = `
    SELECT * FROM reservas
    WHERE numero = ?
    AND NOT (
      fecha_salida <= ? OR
      fecha_entrada >= ?
    )
  `;

  db.query(sql, [numero, fecha_entrada, fecha_salida], (err, result) => {

    if (err) return res.json({ mensaje: "Error en consulta" });

    if (result.length > 0) {
      return res.json({ mensaje: "Habitación ocupada en esas fechas" });
    }

    // INSERTAR RESERVA
    db.query(
      `INSERT INTO reservas 
      (idcliente, numero, tipo, precio, fecha_entrada, fecha_salida) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [idcliente, numero, tipo, precio, fecha_entrada, fecha_salida],
      (err2) => {

        if (err2) return res.json({ mensaje: "Error al guardar reserva" });

        //ACTUALIZAR SOLO SI ES HOY O EN CURSO
        const hoy = new Date().toISOString().split("T")[0];

        if (fecha_entrada <= hoy && fecha_salida >= hoy) {
          db.query(
            "UPDATE habitaciones SET estado = 'ocupado' WHERE numero = ?",
            [numero]
          );
        }

        res.json({ mensaje: "Reserva guardada correctamente" });
      }
    );
  });
});

// LISTAR RESERVAS
router.get("/", (req, res) => {
  db.query("SELECT * FROM reservas", (err, data) => {
    if (err) return res.json([]);
    res.json(data);
  });
});

// ELIMINAR RESERVA
router.delete("/:id", (req, res) => {

  db.query(
    "SELECT numero FROM reservas WHERE idreserva=?",
    [req.params.id],
    (err, result) => {

      if (err || result.length === 0) {
        return res.json({ mensaje: "Reserva no encontrada" });
      }

      const numero = result[0].numero;

      db.query(
        "DELETE FROM reservas WHERE idreserva=?",
        [req.params.id],
        (err2) => {

          if (err2) return res.json({ mensaje: "Error al eliminar" });

          //VERIFICAR SI AÚN QUEDAN RESERVAS ACTIVAS HOY
          const hoy = new Date().toISOString().split("T")[0];

          db.query(
            `SELECT * FROM reservas 
             WHERE numero = ? 
             AND fecha_entrada <= ? 
             AND fecha_salida >= ?`,
            [numero, hoy, hoy],
            (err3, reservasActivas) => {

              if (reservasActivas.length === 0) {
                db.query(
                  "UPDATE habitaciones SET estado = 'disponible' WHERE numero = ?",
                  [numero]
                );
              }

              res.json({ mensaje: "Reserva eliminada correctamente" });
            }
          );
        }
      );
    }
  );
});

module.exports = router;