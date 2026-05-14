const express = require("express");
const router = express.Router();
const db = require("../db");

// CREAR CLIENTE
router.post("/", (req, res) => {
  const { idcliente, nombre, apellido, celular, habitacion, tipo } = req.body;

  if (!idcliente || !nombre || !apellido || !celular) {
    return res.json({ error: "Faltan datos" });
  }

  // VALIDAR CLIENTE REPETIDO
  db.query(
    "SELECT * FROM clientes WHERE idcliente=?",
    [idcliente],
    (err, result) => {
      if (err) return res.json(err);

      if (result.length > 0) {
        return res.json({ error: "Cliente ya existe" });
      }

      // VALIDAR HABITACIÓN OCUPADA
      db.query(
        "SELECT * FROM habitaciones WHERE numero=? AND estado='ocupado'",
        [habitacion],
        (err, hab) => {
          if (err) return res.json(err);

          if (hab.length > 0) {
            return res.json({ error: "Esta habitación ya está ocupada" });
          }

          // INSERTAR CLIENTE
          db.query(
            "INSERT INTO clientes (idcliente, nombre, apellido, celular, habitacion, tipo) VALUES (?, ?, ?, ?, ?, ?)",
            [idcliente, nombre, apellido, celular, habitacion, tipo],
            (err) => {
              if (err) return res.json(err);

              // ESTE OCUPA LA HABITACIÓN
              db.query(
                "UPDATE habitaciones SET estado = 'ocupado' WHERE numero = ?",
                [habitacion],
                (err2) => {
                  if (err2) return res.json({ error: "Cliente guardado pero error actualizando habitación" });

                  res.json({ mensaje: "Cliente guardado y habitación ocupada" });
                }
              );
            }
          );
        }
      );
    }
  );
});

// LISTAR
router.get("/", (req, res) => {
  db.query("SELECT * FROM clientes", (err, data) => {
    if (err) return res.json(err);
    res.json(data);
  });
});

// ELIMINAR
router.delete("/:id", (req, res) => {

  // BUSCAR HABITACIÓN
  db.query(
    "SELECT habitacion FROM clientes WHERE idcliente=?",
    [req.params.id],
    (err, result) => {

      if (err || result.length === 0) {
        return res.json({ error: "Cliente no encontrado" });
      }

      const habitacion = result[0].habitacion;

      // ELIMINAR CLIENTE
      db.query(
        "DELETE FROM clientes WHERE idcliente=?",
        [req.params.id],
        (err2) => {

          if (err2) return res.json(err2);

          // ESTE LIBER HABITACIÓN
          db.query(
            "UPDATE habitaciones SET estado = 'disponible' WHERE numero = ?",
            [habitacion],
            (err3) => {
              if (err3) return res.json({ error: "Cliente eliminado pero error actualizando habitación" });

              res.json({ mensaje: "Cliente eliminado y habitación disponible" });
            }
          );
        }
      );
    }
  );
});

module.exports = router;